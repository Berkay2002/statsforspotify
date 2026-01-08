"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface Friend {
  userId: string;
  spotifyUserId: string;
  displayName: string;
  discriminator: string;
  username: string;
  avatarUrl: string | null;
  statsVisibility?: string;
  isMutualFollow?: boolean;
  canViewStats?: boolean;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  
  // Sync friends on page load
  const { data: syncData, isLoading: isSyncing, refetch: refetchSync } = useQuery({
    queryKey: ["friends", "sync"],
    queryFn: async () => {
      const response = await fetch("/api/friends/sync", { method: "POST" });
      if (!response.ok) throw new Error("Failed to sync friends");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Search users
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["friends", "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { results: [] };
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });
  
  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (spotifyUserId: string) => {
      const response = await fetch("/api/friends/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyUserId }),
      });
      if (!response.ok) throw new Error("Failed to follow user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
  
  const mutualFriends = syncData?.mutualFriends || [];
  const suggestions = syncData?.followBackSuggestions || [];
  const searchResults = searchData?.results || [];
  
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
        <p className="text-muted-foreground">
          View stats from friends you mutually follow on Spotify
        </p>
      </div>
      
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetchSync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Search Results */}
      {searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {isSearching ? "Searching..." : `Found ${searchResults.length} users`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No users found matching &quot;{searchQuery}&quot;
              </p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user: Friend) => (
                  <FriendCard
                    key={user.userId}
                    friend={user}
                    onFollow={() => followMutation.mutate(user.spotifyUserId)}
                    isFollowing={followMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Mutual Friends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mutual Friends
          </CardTitle>
          <CardDescription>
            {isSyncing ? "Loading..." : `${mutualFriends.length} friends`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSyncing ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : mutualFriends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No mutual friends yet. Follow friends on Spotify to see their stats here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mutualFriends.map((friend: Friend) => (
                <FriendCard key={friend.userId} friend={friend} isMutual />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Follow Back Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Suggested
            </CardTitle>
            <CardDescription>
              These users follow you on Spotify. Follow them back to become mutual friends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((user: Friend) => (
                <FriendCard
                  key={user.userId}
                  friend={user}
                  onFollow={() => followMutation.mutate(user.spotifyUserId)}
                  isFollowing={followMutation.isPending}
                  showFollowButton
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FriendCardProps {
  friend: Friend;
  isMutual?: boolean;
  onFollow?: () => void;
  isFollowing?: boolean;
  showFollowButton?: boolean;
}

function FriendCard({ friend, isMutual, onFollow, isFollowing, showFollowButton }: FriendCardProps) {
  const canView = friend.canViewStats !== false;
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName} />
          <AvatarFallback>{friend.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {friend.displayName}
            <span className="text-muted-foreground">#{friend.discriminator}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isMutual && (
              <Badge variant="secondary" className="text-xs">
                Mutual
              </Badge>
            )}
            {friend.statsVisibility === "private" && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
            {friend.statsVisibility === "public" && (
              <Badge variant="default" className="text-xs">
                Public
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {showFollowButton && onFollow && (
            <Button
              size="sm"
              onClick={onFollow}
              disabled={isFollowing}
            >
              {isFollowing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow Back
                </>
              )}
            </Button>
          )}
          
          {canView ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/friends/${friend.displayName}/${friend.discriminator}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Stats
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Private
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

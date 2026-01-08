"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus, UserCheck, Clock, Loader2, ExternalLink } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { toast } from "sonner";

interface Friend {
  userId: string;
  friendshipId?: string;
  displayName: string;
  discriminator: string;
  username: string;
  avatarUrl: string | null;
  statsVisibility?: string;
  friendshipStatus?: string;
  isFriend?: boolean;
  isPendingIncoming?: boolean;
  canViewStats?: boolean;
  friendsSince?: string;
  createdAt?: string;
}

interface PendingRequest {
  friendshipId: string;
  userId: string;
  displayName: string;
  discriminator: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  
  // Fetch friends list
  const { data: friendsData, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () => {
      const response = await fetch("/api/friends/list");
      if (!response.ok) throw new Error("Failed to fetch friends");
      return response.json();
    },
  });
  
  // Fetch pending requests
  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ["friends", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/friends/pending");
      if (!response.ok) throw new Error("Failed to fetch pending requests");
      return response.json();
    },
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
  
  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (friendUserId: string) => {
      const response = await fetch("/api/friends/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      });
      if (!response.ok) throw new Error("Failed to send friend request");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      if (data.status === "accepted") {
        toast.success("You are now friends!");
      } else {
        toast.success("Friend request sent");
      }
    },
    onError: () => {
      toast.error("Failed to send friend request");
    },
  });
  
  // Accept friend request mutation
  const acceptMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (!response.ok) throw new Error("Failed to accept friend request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Friend request accepted!");
    },
    onError: () => {
      toast.error("Failed to accept friend request");
    },
  });
  
  // Reject friend request mutation
  const rejectMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const response = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (!response.ok) throw new Error("Failed to reject friend request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Friend request declined");
    },
    onError: () => {
      toast.error("Failed to decline friend request");
    },
  });
  
  const friends: Friend[] = friendsData?.friends || [];
  const pendingRequests: PendingRequest[] = pendingData?.requests || [];
  const searchResults: Friend[] = searchData?.results || [];
  
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
        <p className="text-muted-foreground">
          Connect with friends to view their Spotify stats
        </p>
      </div>
      
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
                {searchResults.map((user) => (
                  <SearchResultCard
                    key={user.userId}
                    user={user}
                    onSendRequest={() => sendRequestMutation.mutate(user.userId)}
                    isLoading={sendRequestMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Requests
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>
              Friend requests waiting for your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPending ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <PendingRequestCard
                    key={request.friendshipId}
                    request={request}
                    onAccept={() => acceptMutation.mutate(request.friendshipId)}
                    onReject={() => rejectMutation.mutate(request.friendshipId)}
                    isAccepting={acceptMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
          <CardDescription>
            {isLoadingFriends ? "Loading..." : `${friends.length} friends`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFriends ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No friends yet. Search for users to add them as friends.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {friends.map((friend) => (
                <FriendCard key={friend.userId} friend={friend} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SearchResultCardProps {
  user: Friend;
  onSendRequest: () => void;
  isLoading: boolean;
}

function SearchResultCard({ user, onSendRequest, isLoading }: SearchResultCardProps) {
  const isFriend = user.isFriend || user.friendshipStatus === "accepted";
  const isPending = user.friendshipStatus === "pending";
  const canView = user.canViewStats !== false;
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
          <AvatarFallback>{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {user.displayName}
            <span className="text-muted-foreground">#{user.discriminator}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isFriend && (
              <Badge variant="secondary" className="text-xs">
                <UserCheck className="h-3 w-3 mr-1" />
                Friends
              </Badge>
            )}
            {isPending && !user.isPendingIncoming && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
            {user.isPendingIncoming && (
              <Badge variant="default" className="text-xs">
                Wants to be friends
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isFriend && !isPending && (
            <Button
              size="sm"
              onClick={onSendRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Friend
                </>
              )}
            </Button>
          )}
          
          {canView ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/friends/${encodeURIComponent(user.displayName)}/${user.discriminator}`}>
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

interface PendingRequestCardProps {
  request: PendingRequest;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}

function PendingRequestCard({ request, onAccept, onReject, isAccepting, isRejecting }: PendingRequestCardProps) {
  return (
    <Card className="transition-all hover:shadow-md border-primary/20">
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={request.avatarUrl || undefined} alt={request.displayName} />
          <AvatarFallback>{request.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {request.displayName}
            <span className="text-muted-foreground">#{request.discriminator}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Sent {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isAccepting || isRejecting}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isAccepting || isRejecting}
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Decline"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FriendCardProps {
  friend: Friend;
}

function FriendCard({ friend }: FriendCardProps) {
  const canView = friend.statsVisibility !== "private";
  
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
            <Badge variant="secondary" className="text-xs">
              <UserCheck className="h-3 w-3 mr-1" />
              Friends
            </Badge>
            {friend.statsVisibility === "public" && (
              <Badge variant="outline" className="text-xs">
                Public
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {canView ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/friends/${encodeURIComponent(friend.displayName)}/${friend.discriminator}`}>
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

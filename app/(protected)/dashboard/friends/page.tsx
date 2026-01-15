"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, UserPlus, UserCheck, Clock, Loader2, ExternalLink, UserX, Bell } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">
            Connect with friends to view their Spotify stats
          </p>
        </div>
        {friends.length > 0 && (
          <Badge variant="secondary" className="h-8 text-sm">
            <Users className="h-4 w-4 mr-1.5" />
            {friends.length} {friends.length === 1 ? "Friend" : "Friends"}
          </Badge>
        )}
      </div>
      
      {/* Search Bar with Icon */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          {searchQuery && (
            <p className="mt-3 text-xs text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Search Results */}
      {searchQuery && (
        <Card className="shadow-sm border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results
            </CardTitle>
            <CardDescription>
              {isSearching ? "Searching..." : `Found ${searchResults.length} ${searchResults.length === 1 ? "user" : "users"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((skeletonRowKey) => (
                  <Skeleton key={skeletonRowKey} className="h-20 w-full" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <UserX className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No users found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
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
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="friends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-100">
          <TabsTrigger value="friends" className="relative">
            <Users className="h-4 w-4 mr-2" />
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="friends" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Friends
              </CardTitle>
              <CardDescription>
                {isLoadingFriends ? "Loading..." : `${friends.length} ${friends.length === 1 ? "friend" : "friends"} total`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFriends ? (
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {[1, 2, 3, 4].map((skeletonCardKey) => (
                    <Skeleton key={skeletonCardKey} className="h-24 w-full" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="mx-auto h-16 w-16 text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Search for users above to add them as friends and start viewing each other&apos;s Spotify stats.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {friends.map((friend) => (
                    <FriendCard key={friend.userId} friend={friend} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Pending Friend Requests
              </CardTitle>
              <CardDescription>
                {isLoadingPending ? "Loading..." : `${pendingRequests.length} ${pendingRequests.length === 1 ? "request" : "requests"} waiting for your response`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="space-y-3">
                  {[1, 2].map((skeletonRowKey) => (
                    <Skeleton key={skeletonRowKey} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="mx-auto h-16 w-16 text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    When someone sends you a friend request, it will appear here.
                  </p>
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
        </TabsContent>
      </Tabs>
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
    <div className="flex items-center gap-4 p-4 border rounded-lg transition-all hover:shadow-md hover:border-primary/30 bg-card">
      <Avatar className="h-14 w-14 border-2 border-muted">
        <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
        <AvatarFallback className="text-lg font-medium">
          {user.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-base">
          {user.displayName}
          <span className="text-muted-foreground text-sm ml-1">#{user.discriminator}</span>
        </p>
        <div className="flex items-center gap-2 mt-1.5">
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
            <Badge className="text-xs">
              Wants to be friends
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        {!isFriend && !isPending && (
          <Button
            size="sm"
            onClick={onSendRequest}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Add
              </>
            )}
          </Button>
        )}
        
        {canView && (
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link href={`/dashboard/friends/${encodeURIComponent(user.displayName)}/${user.discriminator}`}>
              <ExternalLink className="h-4 w-4" />
              View
            </Link>
          </Button>
        )}
      </div>
    </div>
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
  const timeAgo = getTimeAgo(request.createdAt);
  
  return (
    <div className="flex items-center gap-4 p-4 border-2 border-primary/20 rounded-lg transition-all hover:shadow-lg hover:border-primary/40 bg-primary/5">
      <Avatar className="h-14 w-14 border-2 border-primary/30">
        <AvatarImage src={request.avatarUrl || undefined} alt={request.displayName} />
        <AvatarFallback className="text-lg font-medium bg-primary/10">
          {request.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-base">
          {request.displayName}
          <span className="text-muted-foreground text-sm ml-1">#{request.discriminator}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3 inline mr-1" />
          Sent {timeAgo}
        </p>
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isAccepting || isRejecting}
          className="gap-1.5"
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
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
    </div>
  );
}

// Helper function to format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface FriendCardProps {
  friend: Friend;
}

function FriendCard({ friend }: FriendCardProps) {
  const canView = friend.statsVisibility !== "private";
  const friendsSince = friend.friendsSince ? new Date(friend.friendsSince).toLocaleDateString() : null;
  
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg transition-all hover:shadow-md hover:border-primary/30 bg-card group">
      <Avatar className="h-14 w-14 border-2 border-muted group-hover:border-primary/30 transition-colors">
        <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName} />
        <AvatarFallback className="text-lg font-medium">
          {friend.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-base">
          {friend.displayName}
          <span className="text-muted-foreground text-sm ml-1">#{friend.discriminator}</span>
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            Friends
          </Badge>
          {friend.statsVisibility === "public" && (
            <Badge variant="outline" className="text-xs">
              Public Profile
            </Badge>
          )}
          {friendsSince && (
            <span className="text-xs text-muted-foreground">
              Since {friendsSince}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        {canView ? (
          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link href={`/dashboard/friends/${encodeURIComponent(friend.displayName)}/${friend.discriminator}`}>
              <ExternalLink className="h-4 w-4" />
              View Stats
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Private
          </Button>
        )}
      </div>
    </div>
  );
}

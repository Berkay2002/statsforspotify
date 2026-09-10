"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, UserPlus, UserCheck, Clock, Loader2, ArrowUpRight, UserX, Bell } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { toast } from "sonner";
import { SpotifyLogo } from "@/components/spotify-stats-logo";

interface Friend {
  userId: string;
  friendshipId?: string;
  displayName: string;
  discriminator: string;
  username: string;
  avatarUrl: string | null;
  spotifyProfileUrl?: string | null;
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
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  
  // Fetch friends list
  const { data: friendsData, isLoading: isLoadingFriends, isError: friendsError } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () => {
      const response = await fetch("/api/friends/list");
      if (!response.ok) throw new Error("Failed to fetch friends");
      return response.json();
    },
  });
  
  // Fetch pending requests
  const { data: pendingData, isLoading: isLoadingPending, isError: pendingError } = useQuery({
    queryKey: ["friends", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/friends/pending");
      if (!response.ok) throw new Error("Failed to fetch pending requests");
      return response.json();
    },
  });
  
  // Search users
  const { data: searchData, isLoading: isSearching, isError: searchError } = useQuery({
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
  
  const searchReady = searchQuery.trim().length >= 2;
  const searchUpdating = searchReady && (isSearching || searchQuery !== debouncedSearch);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Your listening circle</p>
          <h1 className="text-4xl font-semibold tracking-tight">Friends</h1>
          <p className="mt-3 max-w-lg text-muted-foreground">Good music travels. See what your friends have on repeat.</p>
        </div>
        {friends.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3" aria-hidden="true">
              {friends.slice(0, 4).map((friend) => (
                <Avatar key={friend.userId} className="size-11 border-4 border-background">
                  <AvatarImage src={friend.avatarUrl || undefined} alt="" />
                  <AvatarFallback>{friend.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{friends.length} {friends.length === 1 ? "friend" : "friends"}</span>
          </div>
        )}
      </header>

      <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="find-friends-title">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <h2 id="find-friends-title" className="text-lg font-semibold tracking-tight">Find your people</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search by display name to add a friend.</p>
          </div>
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search people by display name" placeholder="Search for someone..."
              value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 rounded-full border-border bg-background pl-12 pr-5 shadow-none" />
          </div>
        </div>
        {searchQuery && !searchReady && (
          <p className="mt-4 text-sm text-muted-foreground" role="status">Type at least 2 characters to search.</p>
        )}
        {searchReady && (
          <div className="mt-6 border-t pt-6" aria-live="polite">
            <h3 className="mb-4 text-sm font-medium">Search results</h3>
            {searchUpdating ? (
              <Skeleton className="h-24 w-full rounded-2xl" />
            ) : searchError ? (
              <p role="alert" className="text-sm text-muted-foreground">Search is unavailable right now. Please try again.</p>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <UserX className="size-5" /> No people found for &quot;{debouncedSearch}&quot;.
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {searchResults.map((user) => (
                  <SearchResultCard key={user.userId} user={user}
                    onSendRequest={() => sendRequestMutation.mutate(user.userId)}
                    isLoading={sendRequestMutation.isPending} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <TabsList aria-label="Friends and requests">
          <TabsTrigger value="friends"><Users />Friends <span className="ml-1 text-xs opacity-60">{friends.length}</span></TabsTrigger>
          <TabsTrigger value="pending"><Bell />Requests <span className="ml-1 text-xs opacity-60">{pendingRequests.length}</span></TabsTrigger>
        </TabsList>
        {activeTab === "friends" ? (
          <TabsContent value="friends">
            {isLoadingFriends ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((key) => <Skeleton key={key} className="h-80 rounded-3xl" />)}
              </div>
            ) : friendsError ? (
              <div role="alert" className="rounded-3xl border p-8 text-center">
                <p>We couldn&apos;t load your friends.</p>
                <Button variant="outline" className="mt-4 rounded-full" onClick={() => queryClient.invalidateQueries({ queryKey: ["friends", "list"] })}>Try again</Button>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                <Users className="mx-auto mb-5 size-9 text-muted-foreground" />
                <h2 className="text-xl font-semibold tracking-tight">Start your listening circle</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Find a friend above to explore the artists, tracks and albums they love.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {friends.map((friend) => <FriendCard key={friend.userId} friend={friend} />)}
              </div>
            )}
          </TabsContent>
        ) : (
          <TabsContent value="pending">
            {isLoadingPending ? <Skeleton className="h-28 rounded-3xl" /> : pendingError ? (
              <div role="alert" className="rounded-3xl border p-8 text-center">
                <p>We couldn&apos;t load your requests.</p>
                <Button variant="outline" className="mt-4 rounded-full" onClick={() => queryClient.invalidateQueries({ queryKey: ["friends", "pending"] })}>Try again</Button>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="rounded-3xl border border-dashed px-6 py-16 text-center">
                <UserCheck className="mx-auto mb-5 size-9 text-muted-foreground" />
                <h2 className="text-xl font-semibold tracking-tight">You&apos;re all caught up</h2>
                <p className="mt-3 text-sm text-muted-foreground">New friend requests will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <PendingRequestCard key={request.friendshipId} request={request}
                    onAccept={() => acceptMutation.mutate(request.friendshipId)}
                    onReject={() => rejectMutation.mutate(request.friendshipId)}
                    isAccepting={acceptMutation.isPending} isRejecting={rejectMutation.isPending} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
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
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-colors hover:bg-muted/30 bg-background">
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
            <Badge variant="secondary" className="text-xs rounded-full">
              <UserCheck className="h-3 w-3 mr-1" />
              Friends
            </Badge>
          )}
          {isPending && !user.isPendingIncoming && (
            <Badge variant="outline" className="text-xs rounded-full">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
          {user.isPendingIncoming && (
            <Badge className="text-xs rounded-full">
              Wants to be friends
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 max-sm:w-full">
        {!isFriend && !isPending && (
          <Button
            size="sm"
            onClick={onSendRequest}
            disabled={isLoading}
            className="gap-1.5 rounded-full"
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
          <Button size="sm" variant="outline" asChild className="gap-1.5 rounded-full">
            <Link href={`/dashboard/friends/${encodeURIComponent(user.displayName)}/${user.discriminator}`}>
              <ArrowUpRight className="h-4 w-4" />
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
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-5 sm:p-6">
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
      
      <div className="flex flex-wrap gap-2 max-sm:w-full">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isAccepting || isRejecting}
          className="gap-1.5 rounded-full"
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
          className="rounded-full"
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
  
  const actionClassName = "h-11 min-w-0 rounded-full border-white/25 bg-black/35 px-2 text-xs text-white shadow-none hover:bg-white/15 hover:text-white dark:bg-black/35 dark:hover:bg-white/15 focus-visible:ring-white/60";

  return (
    <article className="group relative isolate flex min-h-96 min-w-0 flex-col justify-end overflow-hidden rounded-3xl bg-neutral-900 text-white ring-1 ring-inset ring-white/10">
      <Avatar className="pointer-events-none absolute inset-0 size-full overflow-hidden rounded-none after:rounded-none">
        <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName}
          className="rounded-none object-cover object-[center_30%] transition-transform duration-700 motion-safe:group-hover:scale-105" />
        <AvatarFallback className="items-start rounded-none bg-neutral-900 pt-16 text-7xl font-medium text-white/15">
          {friend.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/5" />
      <div className="z-10 p-6 pt-48">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-semibold tracking-tight">{friend.displayName}</h2>
            <p className="mt-1 text-xs text-white/80">#{friend.discriminator}</p>
          </div>
          <UserCheck className="mt-1 size-4 shrink-0 text-white/80" aria-label="Friends" />
        </div>
        <p className="mt-5 text-xs text-white/80">{friendsSince ? `Friends since ${friendsSince}` : "In your listening circle"}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {canView ? (
            <Button variant="outline" asChild className={actionClassName}>
              <Link href={`/dashboard/friends/${encodeURIComponent(friend.displayName)}/${friend.discriminator}`}
                className="after:absolute after:inset-0 after:z-10 after:rounded-3xl after:content-['']">
                View stats
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled className={actionClassName}>Private profile</Button>
          )}
          {friend.spotifyProfileUrl ? (
            <Button variant="outline" asChild className={`${actionClassName} relative z-20 gap-1.5`}>
              <a href={friend.spotifyProfileUrl} target="_blank" rel="noopener noreferrer"
                aria-label={`Open ${friend.displayName}'s Spotify profile`} title="Open Spotify profile">
                <SpotifyLogo showWordmark={false} className="size-3.5 shrink-0" />
                Spotify profile
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled aria-label="Spotify profile unavailable" title="Spotify profile unavailable" className={`${actionClassName} relative z-20 gap-1.5`}>
              <SpotifyLogo showWordmark={false} className="size-3.5 shrink-0" />
              Spotify profile
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

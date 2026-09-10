"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, UserCheck, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FriendshipStatus = "none" | "pending" | "accepted" | "blocked";

interface FriendshipState {
  isFriend: boolean;
  isPending: boolean;
  isIncoming: boolean;
}

interface FriendFollowButtonProps {
  friendUserId: string;
  initialStatus: {
    status: FriendshipStatus;
    isFriend: boolean;
    isPending: boolean;
    isIncoming: boolean;
  };
  showStatusLabel?: boolean;
  onStatusChange?: (status: FriendshipStatus, isFriend: boolean) => void;
}

export function FriendFollowButton({ 
  friendUserId, 
  initialStatus,
  onStatusChange,
  showStatusLabel = true,
}: FriendFollowButtonProps) {
  const [state, setState] = useState<FriendshipState>({
    isFriend: initialStatus.isFriend,
    isPending: initialStatus.isPending,
    isIncoming: initialStatus.isIncoming,
  });
  const [optimisticState, setOptimisticState] = useOptimistic(state);
  const [isPending, startTransition] = useTransition();

  const handleSendRequest = async () => {
    // Optimistically update UI
    setOptimisticState({ isFriend: false, isPending: true, isIncoming: false });
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/friends/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friendUserId }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to send friend request");
        }

        if (data.status === "accepted") {
          setState({ isFriend: true, isPending: false, isIncoming: false });
          onStatusChange?.("accepted", true);
          toast.success("You are now friends!");
        } else {
          setState({ isFriend: false, isPending: true, isIncoming: false });
          onStatusChange?.("pending", false);
          toast.success("Friend request sent");
        }
      } catch (error) {
        console.error("Error sending friend request:", error);
        // Revert optimistic update on error
        setState(state);
        toast.error("Failed to send friend request. Please try again.");
      }
    });
  };

  const handleAcceptRequest = async () => {
    // Optimistically update UI
    setOptimisticState({ isFriend: true, isPending: false, isIncoming: false });
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/friends/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friendUserId }),
        });

        if (!response.ok) {
          throw new Error("Failed to accept friend request");
        }

        setState({ isFriend: true, isPending: false, isIncoming: false });
        onStatusChange?.("accepted", true);
        toast.success("Friend request accepted!");
      } catch (error) {
        console.error("Error accepting friend request:", error);
        // Revert optimistic update on error
        setState(state);
        toast.error("Failed to accept friend request. Please try again.");
      }
    });
  };

  const handleRemoveFriend = async () => {
    // Optimistically update UI
    setOptimisticState({ isFriend: false, isPending: false, isIncoming: false });
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/friends/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friendUserId }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove friend");
        }

        setState({ isFriend: false, isPending: false, isIncoming: false });
        onStatusChange?.("none", false);
        toast.success("Friendship removed");
      } catch (error) {
        console.error("Error removing friend:", error);
        // Revert optimistic update on error
        setState(state);
        toast.error("Failed to remove friend. Please try again.");
      }
    });
  };

  const handleCancelRequest = async () => {
    // Optimistically update UI
    setOptimisticState({ isFriend: false, isPending: false, isIncoming: false });
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/friends/unfollow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friendUserId }),
        });

        if (!response.ok) {
          throw new Error("Failed to cancel friend request");
        }

        setState({ isFriend: false, isPending: false, isIncoming: false });
        onStatusChange?.("none", false);
        toast.success("Friend request cancelled");
      } catch (error) {
        console.error("Error cancelling friend request:", error);
        // Revert optimistic update on error
        setState(state);
        toast.error("Failed to cancel friend request. Please try again.");
      }
    });
  };

  // Already friends - show remove button
  if (optimisticState.isFriend) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleRemoveFriend}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserMinus className="h-4 w-4 mr-2" />
          )}
          Remove Friend
        </Button>
        {showStatusLabel && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            Friends
          </span>
        )}
      </div>
    );
  }

  // Incoming pending request - show accept button
  if (optimisticState.isPending && optimisticState.isIncoming) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleAcceptRequest}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserCheck className="h-4 w-4 mr-2" />
          )}
          Accept Request
        </Button>
        <Button 
          variant="outline"
          onClick={handleCancelRequest}
          disabled={isPending}
        >
          Decline
        </Button>
      </div>
    );
  }

  // Outgoing pending request - show pending state with cancel option
  if (optimisticState.isPending) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleCancelRequest}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          Cancel Request
        </Button>
        {showStatusLabel && (
          <span className="text-sm text-muted-foreground">Pending</span>
        )}
      </div>
    );
  }

  // No relationship - show add friend button
  return (
    <Button 
      onClick={handleSendRequest}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      Add Friend
    </Button>
  );
}

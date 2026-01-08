"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, UserCheck, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FriendshipStatus = "none" | "pending" | "accepted" | "blocked";

interface FriendFollowButtonProps {
  friendUserId: string;
  initialStatus: {
    status: FriendshipStatus;
    isFriend: boolean;
    isPending: boolean;
    isIncoming: boolean;
  };
  onStatusChange?: (status: FriendshipStatus, isFriend: boolean) => void;
}

export function FriendFollowButton({ 
  friendUserId, 
  initialStatus,
  onStatusChange 
}: FriendFollowButtonProps) {
  const [isFriend, setIsFriend] = useState(initialStatus.isFriend);
  const [isPending, setIsPending] = useState(initialStatus.isPending);
  const [isIncoming, setIsIncoming] = useState(initialStatus.isIncoming);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendRequest = async () => {
    setIsLoading(true);
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
        setIsFriend(true);
        setIsPending(false);
        onStatusChange?.("accepted", true);
        toast.success("You are now friends!");
      } else {
        setIsPending(true);
        setIsIncoming(false);
        onStatusChange?.("pending", false);
        toast.success("Friend request sent");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept friend request");
      }

      setIsFriend(true);
      setIsPending(false);
      setIsIncoming(false);
      onStatusChange?.("accepted", true);
      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove friend");
      }

      setIsFriend(false);
      setIsPending(false);
      setIsIncoming(false);
      onStatusChange?.("none", false);
      toast.success("Friendship removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel friend request");
      }

      setIsPending(false);
      setIsIncoming(false);
      onStatusChange?.("none", false);
      toast.success("Friend request cancelled");
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Failed to cancel friend request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Already friends - show remove button
  if (isFriend) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleRemoveFriend}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserMinus className="h-4 w-4 mr-2" />
          )}
          Remove Friend
        </Button>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <UserCheck className="h-4 w-4" />
          Friends
        </span>
      </div>
    );
  }

  // Incoming pending request - show accept button
  if (isPending && isIncoming) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleAcceptRequest}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserCheck className="h-4 w-4 mr-2" />
          )}
          Accept Request
        </Button>
        <Button 
          variant="outline"
          onClick={handleCancelRequest}
          disabled={isLoading}
        >
          Decline
        </Button>
      </div>
    );
  }

  // Outgoing pending request - show pending state with cancel option
  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleCancelRequest}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          Cancel Request
        </Button>
        <span className="text-sm text-muted-foreground">
          Pending
        </span>
      </div>
    );
  }

  // No relationship - show add friend button
  return (
    <Button 
      onClick={handleSendRequest}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      Add Friend
    </Button>
  );
}

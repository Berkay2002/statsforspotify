"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FriendFollowButtonProps {
  spotifyUserId: string;
  initialFollowStatus: {
    isFollowing: boolean;
    isMutual: boolean;
  };
  onFollowChange?: (isFollowing: boolean, isMutual: boolean) => void;
}

export function FriendFollowButton({ 
  spotifyUserId, 
  initialFollowStatus,
  onFollowChange 
}: FriendFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowStatus.isFollowing);
  const [isMutual, setIsMutual] = useState(initialFollowStatus.isMutual);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to follow user");
      }

      setIsFollowing(true);
      
      // Check if it's now mutual
      const statusResponse = await fetch(`/api/friends/check-follow?spotifyUserId=${spotifyUserId}`);
      if (statusResponse.ok) {
        const { isFollowing: newFollowing, isMutual: newMutual } = await statusResponse.json();
        setIsFollowing(newFollowing);
        setIsMutual(newMutual);
        onFollowChange?.(newFollowing, newMutual);
      }

      toast.success("You are now following this user on Spotify");
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/friends/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unfollow user");
      }

      setIsFollowing(false);
      setIsMutual(false);
      onFollowChange?.(false, false);

      toast.success("You have unfollowed this user on Spotify");
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isFollowing ? (
        <>
          <Button 
            variant="outline" 
            onClick={handleUnfollow}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            Unfollow
          </Button>
          {isMutual && (
            <span className="text-sm text-muted-foreground">
              Mutual follows ✓
            </span>
          )}
        </>
      ) : (
        <Button 
          onClick={handleFollow}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Follow on Spotify
        </Button>
      )}
    </div>
  );
}

"use client";

import { toast } from "sonner";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PrivacySettingsProps {
  currentVisibility: string;
}

export function PrivacySettings({ currentVisibility }: PrivacySettingsProps) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats_visibility: visibility }),
      });

      if (!response.ok) throw new Error("Failed to update privacy settings");
      
      router.refresh();
    } catch (error) {
      console.error("Error updating privacy:", error);
      toast.error("Failed to update privacy settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanged = visibility !== currentVisibility;

  return (
    <div className="space-y-4">
      <RadioGroup value={visibility} onValueChange={setVisibility}>
        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <RadioGroupItem value="public" id="public" />
          <Label htmlFor="public" className="flex-1 cursor-pointer font-normal">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Public</p>
                <p className="text-sm text-muted-foreground">
                  Anyone can view your stats
                </p>
              </div>
            </div>
          </Label>
        </div>
        
        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <RadioGroupItem value="followers" id="followers" />
          <Label htmlFor="followers" className="flex-1 cursor-pointer font-normal">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Friends Only</p>
                <p className="text-sm text-muted-foreground">
                  Only accepted friends can view
                </p>
              </div>
            </div>
          </Label>
        </div>
        
        <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 transition-colors hover:bg-accent/50">
          <RadioGroupItem value="private" id="private" />
          <Label htmlFor="private" className="flex-1 cursor-pointer font-normal">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Private</p>
                <p className="text-sm text-muted-foreground">
                  Only you can view your stats
                </p>
              </div>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {hasChanged && (
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      )}
    </div>
  );
}

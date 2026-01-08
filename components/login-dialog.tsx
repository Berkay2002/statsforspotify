"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpotifyLogo } from "@/components/spotify-stats-logo";

interface LoginDialogProps {
  children: React.ReactNode;
}

export function LoginDialog({ children }: LoginDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Sign in to continue</DialogTitle>
          <DialogDescription>
            Connect your Spotify account to view your listening stats
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <form action="/auth/callback" method="GET">
            <input type="hidden" name="action" value="login" />
            <Button type="submit" className="w-full gap-2 bg-[#1DB954] text-black hover:bg-[#1ed760]" size="lg">
              <SpotifyLogo className="h-5 w-auto text-black" showWordmark={false} />
              Continue with Spotify
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to allow access to your Spotify listening
            data. You can revoke access at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserX, Loader2 } from "lucide-react";

export function DeleteAccountDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete-account", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Redirect to home page after successful deletion
      router.push("/");
    } catch (error) {
      console.error("Delete account error:", error);
      alert("Failed to delete account. Please try again.");
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <UserX className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove all your data including:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>All snapshots and ranking history</li>
            <li>Your user profile and username</li>
            <li>Privacy settings and preferences</li>
            <li>All cached data and statistics</li>
          </ul>
        </div>
        <div className="py-2">
          <p className="mb-2 text-sm">
            Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="font-mono"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "DELETE MY ACCOUNT" || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Delete My Account
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

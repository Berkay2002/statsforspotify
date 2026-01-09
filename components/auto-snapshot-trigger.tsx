"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Auto-triggers snapshot collection when dashboard loads
 * Runs only once per page load and respects 24-hour interval on server
 * Shows success toast and invalidates caches after successful collection
 */
export function AutoSnapshotTrigger() {
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Only trigger once per page load
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    // Trigger snapshot collection in the background
    fetch("/api/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && !data.skipped) {
          // Invalidate sparkline cache
          window.dispatchEvent(new CustomEvent('invalidate-sparklines'));
          
          // Show success notification
          toast.success("Stats updated!", {
            duration: 3000,
            description: `Updated ${data.succeeded || 'all'} time ranges`,
          });
        }
      })
      .catch((error) => {
        // Silent fail - don't interrupt user experience
        console.error("Auto-snapshot failed:", error);
      });
  }, []);

  // No UI - this is invisible to the user
  return null;
}

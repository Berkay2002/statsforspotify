"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { SPARKLINE_CACHE_INVALIDATION_EVENT_NAME } from "@/components/charts/sparkline-cache";

/**
 * Auto-triggers snapshot collection when dashboard loads
 * Runs once per page load; the server collects each UTC calendar day once.
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
      .then((response) => response.json())
      .then((snapshotResult) => {
        const failed = snapshotResult.results?.some((result: { success: boolean }) => !result.success);
        if (snapshotResult.success && !snapshotResult.skipped) {
          // Invalidate sparkline cache
          window.dispatchEvent(new CustomEvent(SPARKLINE_CACHE_INVALIDATION_EVENT_NAME));
          
          // Show success notification
          const notify = failed ? toast.warning : toast.success;
          notify(failed ? "Stats partially updated" : "Stats updated!", {
            duration: 3000,
            description: failed
              ? "Some time ranges could not be collected. Reload later to retry."
              : `Updated ${snapshotResult.succeeded || "all"} time ranges`,
          });
        }
      })
      .catch((caughtError) => {
        // Silent fail - don't interrupt user experience
        console.error("Auto-snapshot failed:", caughtError);
      });
  }, []);

  // No UI - this is invisible to the user
  return null;
}

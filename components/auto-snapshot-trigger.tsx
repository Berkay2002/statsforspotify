"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-triggers snapshot collection when dashboard loads
 * Runs only once per page load and respects 24-hour interval on server
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
      body: JSON.stringify({ timeRange: "medium_term" }),
    }).catch((error) => {
      // Silent fail - don't interrupt user experience
      console.error("Auto-snapshot failed:", error);
    });
  }, []);

  // No UI - this is invisible to the user
  return null;
}

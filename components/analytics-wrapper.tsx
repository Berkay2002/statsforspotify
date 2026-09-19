"use client";

import { useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const subscribe = (onChange: () => void) => {
    window.addEventListener("storage", onChange);
    // Custom event for same-tab updates
    window.addEventListener("cookie-consent-change", onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("cookie-consent-change", onChange);
    };
};
const getSnapshot = () => localStorage.getItem("cookie-consent") === "accepted";
// Server always renders "no consent" so the HTML matches the first client render.
const getServerSnapshot = () => false;

export function AnalyticsWrapper() {
    const hasConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    // Only render analytics if user has accepted cookies
    if (!hasConsent) return null;

    return (
        <>
            <Analytics />
            <SpeedInsights />
        </>
    );
}

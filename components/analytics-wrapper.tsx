"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export function AnalyticsWrapper() {
    const [hasConsent, setHasConsent] = useState(false);

    useEffect(() => {
        // Check if user has accepted cookies
        const consent = localStorage.getItem("cookie-consent");
        setHasConsent(consent === "accepted");

        // Listen for consent changes (in case user changes mind)
        const handleStorageChange = () => {
            const newConsent = localStorage.getItem("cookie-consent");
            setHasConsent(newConsent === "accepted");
        };

        window.addEventListener("storage", handleStorageChange);
        
        // Custom event for same-tab updates
        window.addEventListener("cookie-consent-change", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("cookie-consent-change", handleStorageChange);
        };
    }, []);

    // Only render analytics if user has accepted cookies
    if (!hasConsent) return null;

    return (
        <>
            <Analytics />
            <SpeedInsights />
        </>
    );
}

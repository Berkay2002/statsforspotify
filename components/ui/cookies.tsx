"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { X, ChevronDown, ChevronUp, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Preferences = {
    necessary: boolean;
    analytics: boolean;
};

const subscribeToConsent = (onStoreChange: () => void) => {
    window.addEventListener("cookie-consent-change", onStoreChange);
    window.addEventListener("storage", onStoreChange);

    return () => {
        window.removeEventListener("cookie-consent-change", onStoreChange);
        window.removeEventListener("storage", onStoreChange);
    };
};

const getConsentSnapshot = () => !localStorage.getItem("cookie-consent");
const getServerConsentSnapshot = () => false;

const PrefRow = ({
    title,
    desc,
    field,
    locked,
    prefs,
    setPrefs,
}: {
    title: string;
    desc: string;
    field: keyof Preferences;
    locked?: boolean;
    prefs: Preferences;
    setPrefs: React.Dispatch<React.SetStateAction<Preferences>>;
}) => (
    <div className="flex items-start gap-2 p-2 rounded-lg border border-border">
        <button
            type="button"
            disabled={locked}
            onClick={() => !locked && setPrefs((p) => ({ ...p, [field]: !p[field] }))}
            className={cn(
                "mt-0.5 inline-flex size-5 items-center justify-center rounded border",
                locked
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                    : "bg-background border-border hover:bg-accent cursor-pointer"
            )}
            aria-pressed={prefs[field]}
            aria-label={`${title} cookie preference`}
        >
            {prefs[field] && <Check className="size-4" />}
        </button>

        <div className="flex-1">
            <div className="text-xs font-medium">
                {title} {locked && <span className="text-[10px] text-muted-foreground">(required)</span>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
        </div>
    </div>
);

export function CookieConsent() {
    const isVisible = useSyncExternalStore(
        subscribeToConsent,
        getConsentSnapshot,
        getServerConsentSnapshot,
    );
    const [showPrefs, setShowPrefs] = useState(false);
    const [prefs, setPrefs] = useState<Preferences>({
        necessary: true,
        analytics: false,
    });

    const prefsRef = useRef<HTMLDivElement | null>(null);
    const [prefsHeight, setPrefsHeight] = useState<number>(0);

    useEffect(() => {
        if (showPrefs && prefsRef.current) {
            const h = prefsRef.current.scrollHeight;
            setPrefsHeight(h);
        } else {
            setPrefsHeight(0);
        }
    }, [showPrefs, prefs]);

    const handleAccept = () => {
        const acceptedPrefs: Preferences = {
            necessary: true,
            analytics: true,
        };
        localStorage.setItem("cookie-consent", "accepted");
        localStorage.setItem("cookie-preferences", JSON.stringify(acceptedPrefs));
        window.dispatchEvent(new Event("cookie-consent-change"));
    };

    const handleDecline = () => {
        const declinedPrefs: Preferences = {
            necessary: true,
            analytics: false,
        };
        localStorage.setItem("cookie-consent", "declined");
        localStorage.setItem("cookie-preferences", JSON.stringify(declinedPrefs));
        window.dispatchEvent(new Event("cookie-consent-change"));
    };

    const savePreferences = () => {
        localStorage.setItem("cookie-preferences", JSON.stringify(prefs));
        localStorage.setItem("cookie-consent", prefs.analytics ? "accepted" : "declined");
        window.dispatchEvent(new Event("cookie-consent-change"));
        setShowPrefs(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80">
            <div className="flex flex-col items-center bg-card text-card-foreground p-4 md:p-6 rounded-lg border shadow-lg text-sm">
                <div className="flex items-center justify-center relative w-full gap-2 pb-3">
                    <Image
                        className="absolute -top-12"
                        src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/cookies/cookieImage2.svg"
                        alt="Cookie"
                        width={48}
                        height={48}
                        unoptimized
                    />
                    <h2 className="text-foreground text-xl font-medium text-left w-full pt-3">Your privacy is important to us</h2>
                    <button
                        onClick={handleDecline}
                        className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Decline cookies"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-muted-foreground">
                    We process your personal information to measure and improve our sites and services, to assist our campaigns and to provide personalised content. For more information see our{" "}
                    <Link href="/privacy" className="font-medium underline hover:text-foreground">
                        Privacy Policy.
                    </Link>
                </p>
                <div className="flex items-center justify-between mt-6 gap-3 w-full">
                    <button
                        type="button"
                        onClick={() => setShowPrefs((p) => !p)}
                        className={cn(
                            "text-sm underline text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        )}
                        aria-expanded={showPrefs}
                        aria-controls="cookie-preferences-inline"
                    >
                        Customize
                        {showPrefs ? (
                            <ChevronUp className="size-3" />
                        ) : (
                            <ChevronDown className="size-3" />
                        )}
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDecline}
                            type="button"
                            className="px-4 py-2 rounded text-muted-foreground border border-border hover:bg-accent transition"
                        >
                            Decline
                        </button>
                        <button
                            onClick={handleAccept}
                            type="button"
                            className="bg-primary px-6 py-2 rounded text-primary-foreground font-medium hover:bg-primary/90 active:scale-95 transition"
                        >
                            Accept
                        </button>
                    </div>
                </div>

                {/* Expandable Preferences */}
                <div
                    id="cookie-preferences-inline"
                    ref={prefsRef}
                    style={{ height: prefsHeight ? `${prefsHeight}px` : 0 }}
                    className={cn(
                        "overflow-hidden transition-[height] duration-300 ease-out will-change-[height] w-full"
                    )}
                >
                    {showPrefs && (
                        <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <PrefRow
                                title="Essential Cookies"
                                desc="Required for authentication and core functionality."
                                field="necessary"
                                locked
                                prefs={prefs}
                                setPrefs={setPrefs}
                            />

                            <PrefRow
                                title="Analytics Cookies"
                                desc="Vercel Analytics and Speed Insights to improve our service."
                                field="analytics"
                                prefs={prefs}
                                setPrefs={setPrefs}
                            />

                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPrefs(false)}
                                    className="px-3 py-1.5 rounded border border-border bg-muted text-muted-foreground text-xs hover:bg-muted/80 cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={savePreferences}
                                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Share, X } from "lucide-react"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

const DISMISSED_KEY = "pwa-install-dismissed"
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches

/** Install banner. Shows only when installing is actually possible: Chromium's install prompt, or iOS share-sheet instructions. */
export function InstallPrompt() {
  const [mode, setMode] = useState<"ios" | "install" | null>(null)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return
    const onInstallable = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onInstallable)
    const timer = setTimeout(() => setMode(isIOS() ? "ios" : "install"), 3000)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("beforeinstallprompt", onInstallable)
    }
  }, [])

  const dismiss = () => {
    setMode(null)
    localStorage.setItem(DISMISSED_KEY, "true")
  }

  const install = async () => {
    await installEvent?.prompt()
    dismiss()
  }

  if (!mode || (mode === "install" && !installEvent)) return null

  return (
    <div
      role="dialog"
      aria-label="Install Stats for Spotify"
      className={cn(
        "animate-pop-up fixed inset-x-4 z-50 origin-bottom md:inset-x-auto md:right-4 md:bottom-4 md:w-96",
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
        "rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow-island)]",
      )}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/icon-192x192.png"
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-xl shadow-md ring-1 ring-primary/30"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Stats for Spotify</p>
          <p className="text-xs text-muted-foreground">
            {mode === "ios" ? "Add to your Home Screen" : "Install for quick, full-screen access"}
          </p>
        </div>
        {mode === "install" && (
          <button
            type="button"
            onClick={install}
            className="press shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="press -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      {mode === "ios" && (
        <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Tap <Share className="size-4 text-primary" aria-label="Share" /> then{" "}
          <span className="font-semibold text-foreground">Add to Home Screen</span>
        </p>
      )}
    </div>
  )
}

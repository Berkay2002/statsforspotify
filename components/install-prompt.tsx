"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Download, Smartphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function InstallPrompt() {
  const [isIOS] = useState(() => {
    // Check if running on iOS (client-side only)
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  })
  const [isStandalone] = useState(() => {
    // Check if already installed (client-side only)
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches
  })
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    
    // Show prompt after a short delay if not installed and not dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    
    if (!standalone && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install Stats for Spotify</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {isIOS
                ? "Add to your home screen for quick access and a better experience"
                : "Install our app for quick access and offline support"}
            </p>
            {isIOS ? (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Tap the share button{" "}
                  <span className="inline-block">
                    <svg className="inline h-4 w-4" viewBox="0 0 50 50" fill="currentColor">
                      <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" />
                      <path d="M24 7h2v21h-2z" />
                      <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" />
                    </svg>
                  </span>{" "}
                  and select &ldquo;Add to Home Screen&rdquo;
                </p>
              </div>
            ) : (
              <Button size="sm" className="w-full" onClick={handleDismiss}>
                Got it
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

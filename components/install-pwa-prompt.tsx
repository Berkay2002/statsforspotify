'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, X, Smartphone } from 'lucide-react'

// Type definition for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAPrompt() {
  const [isIOS] = useState(() => {
    // Check if iOS
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  })
  const [isStandalone] = useState(() => {
    // Check if already installed (standalone mode)
    return window.matchMedia('(display-mode: standalone)').matches
  })
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    
    if (!standalone && !dismissed) {
      // For iOS, show prompt after a delay
      if (isIOS) {
        const timer = setTimeout(() => setShowPrompt(true), 3000)
        return () => clearTimeout(timer)
      }
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIOS])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA installed')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or prompt dismissed
  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Install App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CardDescription className="text-sm">
            Install Stats for Spotify for quick access and a better experience
          </CardDescription>
          
          {isIOS ? (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                disabled
              >
                <Smartphone className="h-4 w-4" />
                Add to Home Screen
              </Button>
              <p className="text-xs text-muted-foreground">
                Tap the share button{' '}
                <span role="img" aria-label="share icon" className="inline-block mx-1">
                  ⎋
                </span>{' '}
                then &ldquo;Add to Home Screen&rdquo;{' '}
                <span role="img" aria-label="plus icon" className="inline-block mx-1">
                  ➕
                </span>
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleInstallClick} 
              className="w-full gap-2"
              disabled={!deferredPrompt}
            >
              <Download className="h-4 w-4" />
              Install Now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

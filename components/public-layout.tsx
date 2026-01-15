import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/footer";
import { SpotifyLogo, SpotifyAttribution } from "@/components/spotify-stats-logo";

interface PublicLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}

export function PublicLayout({ children, showBackButton = false, backHref = "/" }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <SpotifyLogo className="h-6 w-6 text-primary" showWordmark={false} />
            <span className="text-xl font-bold">Stats for Spotify</span>
          </Link>

          {showBackButton ? (
            <Button variant="ghost" asChild>
              <Link href={backHref} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          ) : (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/footer";
import { SpotifyLogo } from "@/components/spotify-stats-logo";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  showLandingNav?: boolean;
}

const landingLinks = [
  { href: "#about", label: "About" },
  { href: "#signals", label: "Signals" },
  { href: "#labs", label: "Labs" },
  { href: "#method", label: "Method" },
];

export function PublicLayout({
  children,
  showBackButton = false,
  backHref = "/",
  showLandingNav = false,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Header */}
      <header className="pointer-events-none sticky top-0 z-50">
        <div aria-hidden className="fade-down" />
        <div className="pointer-events-auto container mx-auto flex items-center justify-between gap-4 px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <Link href="/" className="glass press flex h-11 items-center gap-2 rounded-full pl-2.5 pr-4">
            <SpotifyLogo
              className="h-6 w-6 text-primary"
              showWordmark={false}
            />
            <span className="text-base font-bold">Stats for Spotify</span>
          </Link>

          {showLandingNav && (
            <nav
              aria-label="Landing page"
              className="glass hidden h-11 items-center gap-1 rounded-full px-2 text-sm text-muted-foreground md:flex"
            >
              {landingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="press rounded-full px-3 py-1.5 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {showBackButton ? (
            <Button variant="ghost" asChild className="glass press h-11 rounded-full px-4">
              <Link href={backHref}>
                <ArrowLeft data-icon="inline-start" />
                Back to Home
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className={cn(
                "press h-11 rounded-full bg-primary px-5 text-black hover:bg-primary/90",
                showLandingNav && "hidden sm:inline-flex",
              )}
            >
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

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
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <SpotifyLogo
              className="h-6 w-6 text-primary"
              showWordmark={false}
            />
            <span className="text-xl font-bold">Stats for Spotify</span>
          </Link>

          {showLandingNav && (
            <nav
              aria-label="Landing page"
              className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"
            >
              {landingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {showBackButton ? (
            <Button variant="ghost" asChild>
              <Link href={backHref}>
                <ArrowLeft data-icon="inline-start" />
                Back to Home
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className={cn(
                "bg-primary text-black hover:bg-primary/90",
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

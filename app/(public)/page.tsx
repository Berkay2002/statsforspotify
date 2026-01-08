import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyLogo, SpotifyAttribution } from "@/components/spotify-stats-logo";
import { BarChart3, Clock, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function HomePage({
  searchParams,
}: {
  searchParams: { reauth?: string };
}) {
  const needsReauth = searchParams.reauth === "spotify";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SpotifyLogo className="h-8 w-auto text-[#1DB954]" showWordmark={false} />
            <span className="text-xl font-bold">Stats for Spotify</span>
          </div>
          <LoginDialog>
            <Button className="bg-[#1DB954] text-black hover:bg-[#1ed760]">Sign In</Button>
          </LoginDialog>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          {needsReauth && (
            <Alert variant="destructive" className="mx-auto mb-8 max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Spotify Connection Required</AlertTitle>
              <AlertDescription>
                Your Spotify session has expired. Please reconnect your account to continue.
              </AlertDescription>
            </Alert>
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Track Your Music Journey
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Discover insights about your listening habits. See your top artists,
            tracks, and albums over time with beautiful visualizations.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <LoginDialog>
              <Button size="lg" className="gap-2 bg-[#1DB954] text-black hover:bg-[#1ed760]">
                <SpotifyLogo className="h-5 w-auto text-black" showWordmark={false} />
                Connect with Spotify
              </Button>
            </LoginDialog>
            <SpotifyAttribution />
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">Features</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<BarChart3 className="h-10 w-10" />}
                title="Detailed Analytics"
                description="View your top 50 artists, tracks, and albums with detailed stats and insights."
              />
              <FeatureCard
                icon={<Clock className="h-10 w-10" />}
                title="Historical Tracking"
                description="Track how your music taste evolves over time with regular snapshots."
              />
              <FeatureCard
                icon={<TrendingUp className="h-10 w-10" />}
                title="Trend Visualization"
                description="Beautiful charts showing your ranking changes and listening patterns."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Stats for Spotify. Not affiliated with Spotify AB.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}

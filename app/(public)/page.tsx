import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyLogo } from "@/components/spotify-stats-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { AuthRedirect } from "@/components/auth-redirect";
import { AnimatedSection } from "@/components/animated-section";
import { MockDashboardCard } from "@/components/mock-dashboard-card";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string }>;
}) {
  const params = await searchParams;
  const needsReauth = params.reauth === "spotify";

  return (
    <PublicLayout>
      <AuthRedirect />

      {/* Hero Section — Split Layout */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        {needsReauth && (
          <Alert variant="destructive" className="mx-auto mb-8 max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Spotify Connection Required</AlertTitle>
            <AlertDescription>
              Your Spotify session has expired. Please reconnect your account to
              continue.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
          {/* Left — Text + CTA */}
          <AnimatedSection className="max-w-lg flex-1 text-center lg:text-left">
            <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary">
              Your Music. Your Data.
            </span>

            <h1 className="mt-6 text-4xl font-black tracking-tighter sm:text-5xl lg:text-6xl">
              Track Your
              <br />
              <span className="text-primary">Music Journey</span>
            </h1>

            <p className="mt-4 max-w-md text-base text-muted-foreground lg:text-lg">
              Discover insights about your listening habits. See your top
              artists, tracks, and albums over time with beautiful
              visualizations.
            </p>

            <div className="mt-8">
              <LoginDialog>
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-[#1DB954] px-8 text-black hover:bg-[#1ed760]"
                >
                  <SpotifyLogo
                    className="h-5 w-auto text-black"
                    showWordmark={false}
                  />
                  Connect with Spotify
                </Button>
              </LoginDialog>
              <p className="mt-3 text-xs text-muted-foreground">
                Free forever &middot; No credit card required
              </p>
            </div>
          </AnimatedSection>

          {/* Right — Mock Dashboard */}
          <AnimatedSection delay={0.2} className="w-full max-w-md flex-shrink-0">
            <MockDashboardCard />
          </AnimatedSection>
        </div>
      </section>

      {/* Bento Feature Grid */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Features
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to know
              <br className="hidden sm:block" />
              about your music taste
            </h2>
          </AnimatedSection>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Wide card: Detailed Analytics (cols 1-2, row 1) */}
            <AnimatedSection
              delay={0.1}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.03] p-7 transition-colors hover:border-primary/30 md:col-span-2"
            >
              <BentoCard
                label="Rankings"
                title="Detailed Analytics"
                description="View your top 50 artists, tracks, and albums with detailed stats and insights across three time periods."
              >
                <MiniRankingVisual />
              </BentoCard>
            </AnimatedSection>

            {/* Tall card: Historical Tracking (col 3, rows 1-2) */}
            <AnimatedSection
              delay={0.2}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.03] p-7 transition-colors hover:border-primary/30 md:row-span-2"
            >
              <BentoCard
                label="Snapshots"
                title="Historical Tracking"
                description="Regular snapshots capture your evolving taste over weeks and months."
              >
                <SnapshotTimeline />
              </BentoCard>
            </AnimatedSection>

            {/* Wide card: Trend Visualization (cols 1-2, row 2) */}
            <AnimatedSection
              delay={0.3}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.03] p-7 transition-colors hover:border-primary/30 md:col-span-2"
            >
              <BentoCard
                label="Visualization"
                title="Trend Visualization"
                description="Beautiful charts showing your ranking changes and listening patterns over time."
              >
                <MiniBarChart />
              </BentoCard>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              How It Works
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              Three simple steps
            </h2>
          </AnimatedSection>

          <div className="mt-12 flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-12">
            <AnimatedSection delay={0.1}>
              <StepCard
                number={1}
                title="Connect Spotify"
                description="Sign in with your Spotify account. We only request read access to your listening data."
              />
            </AnimatedSection>
            {/* Connector */}
            <div className="hidden h-px w-16 bg-gradient-to-r from-primary/30 to-primary/5 md:block" />
            <AnimatedSection delay={0.2}>
              <StepCard
                number={2}
                title="We Snapshot"
                description="We automatically capture your top artists, tracks, and albums at regular intervals."
              />
            </AnimatedSection>
            <div className="hidden h-px w-16 bg-gradient-to-r from-primary/30 to-primary/5 md:block" />
            <AnimatedSection delay={0.3}>
              <StepCard
                number={3}
                title="See Your Trends"
                description="Watch how your music taste evolves with beautiful charts and rankings over time."
              />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Social Proof / Bottom CTA */}
      <section className="py-16">
        <AnimatedSection className="mx-auto max-w-3xl px-4 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <SpotifyLogo
              className="h-5 w-auto text-primary"
              showWordmark={false}
            />
            <span>Powered by Spotify</span>
            <span className="h-4 w-px bg-white/10" />
            <span>Free forever</span>
            <span className="h-4 w-px bg-white/10" />
            <span>Privacy-first</span>
          </div>
          <div className="mt-8">
            <LoginDialog>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
              >
                Start tracking your music journey →
              </Button>
            </LoginDialog>
          </div>
        </AnimatedSection>
      </section>
    </PublicLayout>
  );
}

/* ─── Inline Sub-Components ─── */

function BentoCard({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        {label}
      </span>
      <h3 className="mt-2 text-lg font-bold text-foreground/90">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </>
  );
}

function MiniRankingVisual() {
  const artists = [
    { name: "Arctic Monkeys", plays: "482 plays", width: "95%", image: "https://i.scdn.co/image/ab6761610000e5eb7da39dea0a72f581535fb11f", gradient: "from-[#1DB954] to-[#191414]" },
    { name: "Tame Impala", plays: "371 plays", width: "78%", image: "https://i.scdn.co/image/ab6761610000e5ebe412a782245eb20d9626c601", gradient: "from-[#764ba2] to-[#191414]" },
    { name: "Radiohead", plays: "298 plays", width: "63%", image: "https://i.scdn.co/image/ab6761610000e5eba03696716c9ee605006047fd", gradient: "from-[#667eea] to-[#191414]" },
    { name: "Mac DeMarco", plays: "245 plays", width: "51%", image: "https://i.scdn.co/image/ab6761610000e5ebc9aca5b6d4c528caf75e8a1d", gradient: "from-[#f093fb] to-[#191414]" },
    { name: "The Strokes", plays: "213 plays", width: "44%", image: "https://i.scdn.co/image/ab6761610000e5eb0e7deab8c0245e6e23e4cef1", gradient: "from-[#43e97b] to-[#191414]" },
  ];
  return (
    <div className="space-y-2.5">
      {artists.map((artist, i) => (
        <div key={artist.name} className="flex items-center gap-2.5">
          <span className="w-4 text-right text-xs font-extrabold text-muted-foreground/50">
            {i + 1}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artist.image}
            alt=""
            className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${artist.gradient} object-cover`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-semibold text-foreground/80">{artist.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/50">{artist.plays}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/40"
                style={{ width: artist.width }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SnapshotTimeline() {
  const snapshots = [
    { date: "Mar 27", detail: "Arctic Monkeys → #1", change: "+2", active: true },
    { date: "Mar 20", detail: "Tame Impala → #2", change: "—", active: false },
    { date: "Mar 13", detail: "Radiohead → #1", change: "+5", active: false },
    { date: "Mar 6", detail: "New entry: Mac DeMarco", change: "new", active: false },
    { date: "Feb 27", detail: "The Strokes → #3", change: "-1", active: false },
  ];
  return (
    <div className="mt-2 space-y-2">
      {snapshots.map((snap) => (
        <div
          key={snap.date}
          className={`rounded-lg px-3 py-2.5 ${
            snap.active
              ? "border-l-[3px] border-l-primary bg-primary/[0.08]"
              : "border-l-[3px] border-l-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`text-[10px] font-semibold ${
                snap.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {snap.date}
            </div>
            <span
              className={`text-[9px] font-bold ${
                snap.change.startsWith("+")
                  ? "text-primary"
                  : snap.change === "new"
                    ? "text-blue-400"
                    : "text-muted-foreground/40"
              }`}
            >
              {snap.change}
            </span>
          </div>
          <div
            className={`mt-0.5 text-[11px] ${
              snap.active
                ? "text-muted-foreground"
                : "text-muted-foreground/60"
            }`}
          >
            {snap.detail}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBarChart() {
  const weeks = [
    { label: "W1", values: [30, 45, 25] },
    { label: "W2", values: [35, 40, 30] },
    { label: "W3", values: [42, 35, 28] },
    { label: "W4", values: [50, 32, 35] },
    { label: "W5", values: [48, 38, 40] },
    { label: "W6", values: [55, 30, 42] },
    { label: "W7", values: [52, 35, 45] },
    { label: "W8", values: [60, 33, 48] },
  ];
  const colors = ["bg-primary", "bg-[#764ba2]", "bg-[#667eea]"];
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[9px] text-muted-foreground/60">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-primary" /> Artists</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#764ba2]" /> Tracks</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#667eea]" /> Albums</span>
      </div>
      <div className="flex items-end gap-2 h-[60px]">
        {weeks.map((week) => (
          <div key={week.label} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="flex items-end gap-px h-[48px]">
              {week.values.map((v, j) => (
                <div
                  key={j}
                  className={`w-1.5 rounded-t-sm ${colors[j]}`}
                  style={{ height: `${v * 0.8}px`, opacity: 0.5 + (v / 60) * 0.5 }}
                />
              ))}
            </div>
            <span className="text-[8px] text-muted-foreground/40">{week.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-[240px] text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xl font-extrabold text-primary">
        {number}
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground/90">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

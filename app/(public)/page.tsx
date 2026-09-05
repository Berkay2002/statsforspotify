import Image from "next/image";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { AnimatedSection } from "@/components/animated-section";
import { AuthRedirect } from "@/components/auth-redirect";
import {
  CopyInviteButton,
  LandingLabs,
} from "@/components/landing-interactions";
import { LoginDialog } from "@/components/login-dialog";
import { PublicLayout } from "@/components/public-layout";
import { SpotifyLogo } from "@/components/spotify-stats-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const signals = [
  {
    label: "Rankings",
    title: "Top artists, tracks, albums",
    body: "Read your strongest Spotify items across short, medium, and long-term ranges.",
  },
  {
    label: "Snapshots",
    title: "A memory for taste",
    body: "Save ranking positions so older listening phases stay visible.",
  },
  {
    label: "Recaps",
    title: "Stories from your data",
    body: "Surface album takeovers, hall of fame returns, and plot twists.",
  },
  {
    label: "Social",
    title: "Controlled comparison",
    body: "Share a profile and compare friend overlap with privacy controls.",
  },
];

const method = [
  {
    step: "01",
    title: "Connect",
    body: "Spotify OAuth through Supabase starts the session.",
  },
  {
    step: "02",
    title: "Read",
    body: "Top items, albums, genres, and profile data load from Spotify.",
  },
  {
    step: "03",
    title: "Snapshot",
    body: "Ranking positions are stored for future comparison.",
  },
  {
    step: "04",
    title: "Compare",
    body: "Charts, recaps, and friend views turn movement into signal.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; error?: string }>;
}) {
  const params = await searchParams;
  const needsReauth = params.reauth === "spotify";

  return (
    <PublicLayout showLandingNav>
      <AuthRedirect />

      <div className="overflow-hidden bg-background">
        <section className="relative border-b border-white/[0.08]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch lg:px-8">
            <div className="flex flex-col justify-center">
              {(needsReauth || params.error) && (
                <Alert variant="destructive" className="mb-8 max-w-xl">
                  <AlertCircle />
                  <AlertTitle>{needsReauth ? "Spotify connection required" : "Sign-in could not be completed"}</AlertTitle>
                  <AlertDescription>
                    {needsReauth
                      ? "Your Spotify session has expired. Please reconnect your account to continue."
                      : "Please try connecting to Spotify again."}
                  </AlertDescription>
                </Alert>
              )}

              <AnimatedSection>
                <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.98] sm:text-6xl lg:text-7xl">
                  Your listening history, made visible.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Track top artists, songs, albums, genres, snapshots, and
                  friend taste shifts from one private Spotify-connected
                  dashboard.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <LoginDialog>
                    <Button
                      size="lg"
                      className="bg-primary px-6 text-black hover:bg-primary/90"
                    >
                      <SpotifyLogo
                        className="h-5 w-auto text-black"
                        showWordmark={false}
                      />
                      Connect with Spotify
                    </Button>
                  </LoginDialog>
                  <Button variant="outline" size="lg" asChild>
                    <a href="#signals">See signals</a>
                  </Button>
                </div>

                <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                  <ProofStat value="50" label="ranked items" />
                  <ProofStat value="3" label="time ranges" />
                  <ProofStat value="1" label="private profile" />
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection delay={0.15} className="min-w-0 lg:flex">
              <HeroPlate />
            </AnimatedSection>
          </div>
        </section>

        <Section id="about">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <AnimatedSection>
              <SectionHeader
                label="About"
                title="A cleaner record of what you actually listen to."
                body="Spotify shows what is playing now. Stats for Spotify keeps the longer record: who keeps climbing, which albums return, and how your taste changes across time."
              />
            </AnimatedSection>
            <AnimatedSection delay={0.1}>
              <AboutPlate />
            </AnimatedSection>
          </div>
        </Section>

        <Section id="signals">
          <AnimatedSection>
            <SectionHeader
              label="Signals"
              title="Four views turn listening data into signal."
              body="Rankings, snapshots, recaps, and friend views give the dashboard a compact system for reading your music taste."
            />
          </AnimatedSection>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {signals.map((signal, index) => (
              <AnimatedSection key={signal.title} delay={index * 0.06}>
                <article className="flex min-h-[270px] flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 transition-colors hover:border-primary/45">
                  <SignalGlyph index={index} />
                  <div className="flex flex-col gap-3">
                    <Badge
                      variant="outline"
                      className="w-fit border-primary/30 bg-primary/10 text-primary"
                    >
                      {signal.label}
                    </Badge>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-bold">{signal.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {signal.body}
                      </p>
                    </div>
                  </div>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </Section>

        <Section id="labs">
          <AnimatedSection>
            <SectionHeader
              label="Labs"
              title="Small experiments for music patterns."
              body="Filterable experiments frame what the product can reveal without pretending the app has metrics it does not collect."
            />
          </AnimatedSection>
          <div className="mt-10">
            <LandingLabs />
          </div>
        </Section>

        <Section id="method">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <AnimatedSection>
              <SectionHeader
                label="Method"
                title="Connect once, then let the archive build."
                body="The flow is intentionally small: authenticate with Spotify, read your top items, save snapshots, then turn changes into clean dashboard views."
              />
            </AnimatedSection>

            <div className="grid gap-4 md:grid-cols-2 md:auto-rows-fr">
              {method.map((item, index) => (
                <AnimatedSection
                  key={item.step}
                  delay={index * 0.06}
                  className="h-full"
                >
                  <MethodCard {...item} />
                </AnimatedSection>
              ))}
            </div>
          </div>
        </Section>

        <Section id="work">
          <AnimatedSection>
            <SectionHeader
              label="Selected work"
              title="Two surfaces anchor the product."
              body="The landing page previews real app surfaces instead of generic feature claims."
            />
          </AnimatedSection>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <AnimatedSection>
              <CaseStudyCard
                label="Dashboard"
                title="Weekly movement"
                body="A focused view of top-item changes, snapshot history, and ranking movement."
              >
                <MovementPlate />
              </CaseStudyCard>
            </AnimatedSection>
            <AnimatedSection delay={0.08}>
              <CaseStudyCard
                label="Social"
                title="Friend profile"
                body="A shared taste page with overlap views and privacy-controlled profile sections."
              >
                <FriendPlate />
              </CaseStudyCard>
            </AnimatedSection>
          </div>
        </Section>

        <Section id="proof">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <AnimatedSection>
              <SectionHeader
                label="Proof"
                title="Private by default, readable by design."
                body="The app includes privacy settings, data export, delete-data controls, and Spotify attribution where Spotify content appears."
              />
            </AnimatedSection>
            <AnimatedSection delay={0.08}>
              <ProofPanel />
            </AnimatedSection>
          </div>
        </Section>

        <section className="border-t border-white/[0.08] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-lg border border-white/[0.08] bg-white/[0.035] p-6 md:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <AnimatedSection>
              <Badge
                variant="outline"
                className="mb-5 border-primary/30 bg-primary/10 text-primary"
              >
                Start
              </Badge>
              <h2 className="max-w-3xl text-4xl font-extrabold leading-none sm:text-5xl">
                Start a music archive you can actually read.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Connect Spotify and turn your top items into a private,
                evolving dashboard.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LoginDialog>
                  <Button
                    size="lg"
                    className="bg-primary px-6 text-black hover:bg-primary/90"
                  >
                    <SpotifyLogo
                      className="h-5 w-auto text-black"
                      showWordmark={false}
                    />
                    Connect with Spotify
                  </Button>
                </LoginDialog>
                <CopyInviteButton />
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.12}>
              <CtaPlate />
            </AnimatedSection>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

function Section({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-white/[0.08] px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function SectionHeader({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <Badge
        variant="outline"
        className="mb-5 border-primary/30 bg-primary/10 text-primary"
      >
        {label}
      </Badge>
      <h2 className="text-4xl font-extrabold leading-none sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
        {body}
      </p>
    </div>
  );
}

function ProofStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="text-3xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function HeroPlate() {
  return (
    <figure className="relative aspect-[7/6] min-h-[360px] w-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#121212] shadow-2xl shadow-black/30 lg:min-h-[620px]">
      <Image
        src="/landing/app-hero-panel-tight.png"
        alt="Sanitized Stats for Spotify editorial dashboard panel inspired by the app"
        fill
        className="object-cover"
        priority
        sizes="(min-width: 1024px) 720px, 100vw"
      />
    </figure>
  );
}

function AboutPlate() {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.035]">
      <Image
        src="/landing/app-artist-grid.png"
        alt="Sanitized artist grid inspired by the Stats for Spotify app"
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 680px, 100vw"
      />
    </figure>
  );
}

function SignalGlyph({ index }: { index: number }) {
  return (
    <div className="mb-8 h-24 rounded-lg bg-black/30 p-3">
      {index === 0 && (
        <div className="flex h-full items-end gap-2">
          {[80, 64, 48, 36].map((height) => (
            <span
              key={height}
              className="flex-1 rounded-sm bg-primary/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}
      {index === 1 && (
        <div className="flex h-full items-center justify-between">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="flex flex-col items-center gap-2">
              <span className="size-3 rounded-full bg-primary" />
              <span className="h-12 w-px bg-white/15" />
            </span>
          ))}
        </div>
      )}
      {index === 2 && (
        <div className="grid h-full grid-cols-3 gap-2">
          <span className="rounded-md bg-primary" />
          <span className="rounded-md bg-white/15" />
          <span className="rounded-md bg-primary/40" />
        </div>
      )}
      {index === 3 && (
        <div className="relative h-full">
          <span className="absolute left-7 top-4 size-14 rounded-full border border-primary bg-primary/20" />
          <span className="absolute left-16 top-4 size-14 rounded-full border border-white/35 bg-white/10" />
        </div>
      )}
    </div>
  );
}

function MethodCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <article className="flex h-full min-h-[220px] flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.035] p-5">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-3xl font-extrabold text-primary">{step}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </article>
  );
}

function CaseStudyCard({
  label,
  title,
  body,
  children,
}: {
  label: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <article className="grid gap-5 rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 md:grid-cols-[0.95fr_1.05fr]">
      {children}
      <div className="flex flex-col justify-between gap-8">
        <Badge
          variant="outline"
          className="w-fit border-primary/30 bg-primary/10 text-primary"
        >
          {label}
        </Badge>
        <div>
          <h3 className="text-2xl font-extrabold">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

function MovementPlate() {
  return (
    <figure className="relative aspect-[16/10] overflow-hidden rounded-lg bg-black/30">
      <Image
        src="/landing/app-ranking-chart.png"
        alt="Sanitized ranking history chart inspired by the Stats for Spotify app"
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 480px, 100vw"
      />
    </figure>
  );
}

function FriendPlate() {
  return (
    <figure className="relative aspect-[16/10] overflow-hidden rounded-lg bg-black/30">
      <Image
        src="/landing/app-artist-grid.png"
        alt="Sanitized artist card grid inspired by the Stats for Spotify app"
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 480px, 100vw"
      />
    </figure>
  );
}

function ProofPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        ["Spotify OAuth", "Access starts with Spotify authorization."],
        ["Privacy settings", "Public profile sections stay user controlled."],
        ["Export data", "Profile data can be exported from settings."],
        ["Delete controls", "Account and stored data can be removed."],
      ].map(([title, body]) => (
        <article
          key={title}
          className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5"
        >
          <div className="mb-5 size-8 rounded-full bg-primary" />
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </article>
      ))}
      <div className="rounded-lg border border-white/[0.08] bg-black/30 p-5 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <SpotifyLogo
            className="h-6 w-auto text-primary"
            showWordmark={false}
          />
          <span>Powered by Spotify</span>
          <span className="h-4 w-px bg-white/15" />
          <span>Not affiliated with Spotify AB</span>
        </div>
      </div>
    </div>
  );
}

function CtaPlate() {
  return (
    <figure className="relative aspect-[16/9] overflow-hidden rounded-lg bg-black/30">
      <Image
        src="/landing/app-overview-hero.png"
        alt="Sanitized overview dashboard inspired by the Stats for Spotify app"
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 540px, 100vw"
      />
    </figure>
  );
}

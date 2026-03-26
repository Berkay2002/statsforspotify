# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public landing page from a basic hero + 3 feature cards into a dark, Spotify-native page with split hero, bento feature grid, "how it works" section, social proof, and scroll-triggered animations.

**Architecture:** Server component `page.tsx` owns all layout and static content. Two small client components handle interactive concerns: `AnimatedSection` for framer-motion scroll entrance animations, and `MockDashboardCard` for artist images with `onError` fallback. All sections live in `page.tsx` as inline sub-components.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind CSS 4, framer-motion 12, shadcn/ui, next/image

**Spec:** `docs/superpowers/specs/2026-03-27-landing-page-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/animated-section.tsx` | Create | `"use client"` — framer-motion scroll-triggered fade-in/slide-up wrapper |
| `components/mock-dashboard-card.tsx` | Create | `"use client"` — hero's mock "Top Artists" card with `next/image` + `onError` fallback |
| `app/(public)/page.tsx` | Rewrite | Server component — all page sections, inline sub-components, imports client components |

---

## Task 1: Create AnimatedSection client component

**Files:**
- Create: `components/animated-section.tsx`

This is a reusable `"use client"` wrapper that applies a framer-motion entrance animation (fade-in + slide-up) when the element scrolls into view.

- [ ] **Step 1: Create `components/animated-section.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
}: AnimatedSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds with no errors related to `animated-section.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/animated-section.tsx
git commit -m "feat: add AnimatedSection client component for scroll animations"
```

---

## Task 2: Create MockDashboardCard client component

**Files:**
- Create: `components/mock-dashboard-card.tsx`

This is the hero's right-side mock "Your Top Artists" card. It's a client component because `next/image` needs an `onError` handler to swap broken Spotify CDN URLs to gradient fallbacks.

- [ ] **Step 1: Create `components/mock-dashboard-card.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";

const SAMPLE_ARTISTS = [
  {
    name: "Arctic Monkeys",
    genre: "Alternative Rock",
    image: "https://i.scdn.co/image/ab6761610000e5eb7da39dea0a72f581535fb11f",
    gradient: "from-[#1DB954] to-[#191414]",
    barWidth: "95%",
  },
  {
    name: "Tame Impala",
    genre: "Psychedelic Pop",
    image: "https://i.scdn.co/image/ab6761610000e5eb52e1aa23eb6940f646498814",
    gradient: "from-[#764ba2] to-[#191414]",
    barWidth: "78%",
  },
  {
    name: "Radiohead",
    genre: "Art Rock",
    image: "https://i.scdn.co/image/ab6761610000e5eba03696716c9ee605006047fd",
    gradient: "from-[#667eea] to-[#191414]",
    barWidth: "64%",
  },
  {
    name: "Mac DeMarco",
    genre: "Indie Rock",
    image: "https://i.scdn.co/image/ab6761610000e5eb03e30f70e24e313c31e0e75b",
    gradient: "from-[#f093fb] to-[#191414]",
    barWidth: "51%",
  },
];

function ArtistAvatar({
  src,
  alt,
  gradient,
}: {
  src: string;
  alt: string;
  gradient: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${gradient}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

export function MockDashboardCard() {
  return (
    <div className="relative">
      {/* Green glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.08)_0%,transparent_70%)]" />

      {/* Card */}
      <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            Your Top Artists
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            Last 4 Weeks
          </span>
        </div>

        <div className="space-y-0">
          {SAMPLE_ARTISTS.map((artist, i) => (
            <div
              key={artist.name}
              className="flex items-center gap-3 border-b border-white/[0.04] py-2.5 last:border-b-0"
            >
              <span className="w-5 text-sm font-extrabold text-muted-foreground/50">
                {i + 1}
              </span>
              <ArtistAvatar
                src={artist.image}
                alt={artist.name}
                gradient={artist.gradient}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground/90">
                  {artist.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {artist.genre}
                </div>
              </div>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#1ed760]"
                  style={{ width: artist.barWidth }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { value: "50+", label: "Artists" },
          { value: "50+", label: "Tracks" },
          { value: "3", label: "Time Ranges" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] py-3 text-center"
          >
            <div className="text-2xl font-extrabold text-primary">
              {stat.value}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds. No errors related to `mock-dashboard-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/mock-dashboard-card.tsx
git commit -m "feat: add MockDashboardCard client component with artist image fallbacks"
```

---

## Task 3: Rewrite the landing page

**Files:**
- Rewrite: `app/(public)/page.tsx`

Replace the entire file with the new landing page. This is a server component that imports the two client components and renders all sections: hero (split layout), bento features, how it works, and social proof/CTA.

- [ ] **Step 1: Rewrite `app/(public)/page.tsx`**

```tsx
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
  const ranks = [
    { width: "92%", color: "bg-primary" },
    { width: "78%", color: "bg-primary/80" },
    { width: "65%", color: "bg-primary/60" },
    { width: "51%", color: "bg-primary/40" },
  ];
  return (
    <div className="flex gap-4">
      {[0, 1].map((col) => (
        <div key={col} className="flex-1 space-y-2">
          {ranks.slice(col * 2, col * 2 + 2).map((rank, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 text-xs font-extrabold text-muted-foreground/50">
                {col * 2 + i + 1}
              </span>
              <div className="h-6 w-6 rounded-full bg-primary/30" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${rank.color}`}
                  style={{ width: rank.width }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SnapshotTimeline() {
  const snapshots = [
    { date: "Mar 27", active: true },
    { date: "Mar 20", active: false },
    { date: "Mar 13", active: false },
    { date: "Mar 6", active: false },
    { date: "Feb 27", active: false },
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
          <div
            className={`text-[10px] font-semibold ${
              snap.active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {snap.date}
          </div>
          <div
            className={`mt-0.5 text-[11px] ${
              snap.active
                ? "text-muted-foreground"
                : "text-muted-foreground/60"
            }`}
          >
            Snapshot captured
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBarChart() {
  const heights = [25, 35, 20, 45, 30, 55, 40, 60, 50, 45, 58, 52];
  return (
    <div className="flex items-end gap-1 h-[60px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-gradient-to-t from-primary to-primary/30"
          style={{ height: `${h}px`, opacity: 0.3 + (h / 60) * 0.7 }}
        />
      ))}
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
```

- [ ] **Step 2: Verify it builds**

Run: `bun run build`
Expected: Build succeeds with no errors. The page should compile as a server component with the two client component islands.

- [ ] **Step 3: Verify lint passes**

Run: `bun run lint`
Expected: No lint errors on the modified/new files.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/page.tsx
git commit -m "feat: redesign landing page with split hero, bento grid, how-it-works, and social proof"
```

---

## Task 4: Visual verification and polish

**Files:**
- Possibly modify: `app/(public)/page.tsx`, `components/mock-dashboard-card.tsx`, `components/animated-section.tsx`

This task is about running the dev server, visually checking the page in a browser, and fixing any issues.

- [ ] **Step 1: Start dev server and verify in browser**

Run: `bun run dev`

Open `http://localhost:3000` in a browser. Check:
1. Hero section renders with split layout (text left, mock card right)
2. Artist images load from Spotify CDN (or gracefully fall back to gradients)
3. Bento grid has correct asymmetric layout (2 wide cards + 1 tall card)
4. How It Works shows 3 steps with connectors on desktop
5. Social proof row and bottom CTA render correctly
6. Reauth alert appears when visiting `http://localhost:3000?reauth=spotify`
7. Scroll animations trigger on each section
8. Responsive: resize to mobile width — hero stacks, bento collapses to single column, steps stack vertically

- [ ] **Step 2: Fix any visual issues found**

Apply fixes as needed. Common things to watch for:
- Artist image URLs may need updating if they return 404 — test each URL individually
- Bento grid column/row placement may need explicit `style` props if Tailwind classes don't produce the right layout
- Animation timing may feel too fast/slow — adjust `duration` and `delay` in `AnimatedSection`

- [ ] **Step 3: Run final build check**

Run: `bun run build && bun run lint`
Expected: Both pass cleanly.

- [ ] **Step 4: Commit any polish fixes**

```bash
git add -A
git commit -m "fix: visual polish for landing page redesign"
```

(Skip this commit if no changes were needed.)

"use client";

import styles from "./friend-dashboard.module.css";
import { useId, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ArtistsList } from "@/components/artists-list";
import { TracksList } from "@/components/tracks-list";
import { AlbumsList } from "@/components/albums-list";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { FriendFollowButton } from "@/components/friend-follow-button";
import { SpotifyAttribution, SpotifyLogo } from "@/components/spotify-stats-logo";
import { ArtworkBackground } from "@/components/ui/artwork-background";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import { StickyBar } from "@/components/ui/sticky-bar";
import { statsDetailHref } from "@/lib/stats/navigation";
import type { TimeRange } from "@/lib/spotify/types";

const sections = ["Overview", "Artists", "Tracks", "Albums"] as const;
type Section = typeof sections[number];

export interface FriendDashboardProps {
  profile: { userId: string; displayName: string; discriminator: string; avatarUrl: string | null; spotifyUserId: string | null };
  friendshipStatus: ComponentProps<typeof FriendFollowButton>["initialStatus"];
  artists: ComponentProps<typeof ArtistsList>["artistsByTimeRange"];
  tracks: ComponentProps<typeof TracksList>["tracksByTimeRange"];
  albums: ComponentProps<typeof AlbumsList>["albumsByTimeRange"];
}

export function FriendDashboard({ profile, friendshipStatus, artists, tracks, albums }: FriendDashboardProps) {
  const [section, setSection] = useState<Section>("Overview");
  const [timeRange, setTimeRange] = useState<TimeRange>(() =>
    (["medium_term", "short_term", "long_term"] as const).find(range =>
      artists[range].length || tracks[range].length || albums[range].length
    ) ?? "medium_term"
  );
  const navigationRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const artist = artists[timeRange][0];
  const track = tracks[timeRange][0];
  const album = albums[timeRange][0];
  const counts = { Artists: artists[timeRange].length, Tracks: tracks[timeRange].length, Albums: albums[timeRange].length };

  function returnToNavigation() {
    if (navigationRef.current && navigationRef.current.getBoundingClientRect().top <= 0) {
      navigationRef.current.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }

  function selectSection(value: Section) {
    returnToNavigation();
    setSection(value);
  }

  return (
    <div className={`flex flex-col gap-5 ${section === "Overview" ? styles.overview : ""}`}>
      <header className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/friends" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All friends
          </Link>
          <SpotifyAttribution className="hidden md:flex" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="group/portrait relative isolate shrink-0">
              {profile.avatarUrl && (
                <Avatar aria-hidden="true" className="pointer-events-none absolute -inset-2 -z-10 size-20 rounded-3xl opacity-40 blur-xl">
                  <AvatarImage src={profile.avatarUrl} alt="" />
                </Avatar>
              )}
              <Avatar className="size-16 overflow-hidden rounded-2xl ring-1 ring-foreground/15 ring-offset-4 ring-offset-background after:rounded-2xl">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName}
                  className="rounded-2xl object-cover transition-transform duration-500 motion-safe:group-hover/portrait:scale-110" />
                <AvatarFallback className="rounded-2xl text-2xl">{profile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{profile.displayName}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 [&_button]:rounded-full">
            {profile.spotifyUserId && (
              <Button variant="outline" asChild className="rounded-full">
                <a href={`https://open.spotify.com/user/${encodeURIComponent(profile.spotifyUserId)}`} target="_blank" rel="noopener noreferrer">
                  <SpotifyLogo showWordmark={false} className="size-4" /> Spotify profile
                </a>
              </Button>
            )}
            <FriendFollowButton friendUserId={profile.userId} initialStatus={friendshipStatus} showStatusLabel={false} />
          </div>
        </div>
      </header>

      <Tabs ref={navigationRef} value={section} onValueChange={value => selectSection(value as Section)} className="min-h-0 flex-1 gap-4">
        <StickyBar className="-mx-1 shrink-0 px-1">
          <TabsList aria-label="Friend stats sections" className="glass w-full sm:w-fit">
            {sections.map((value, index) => (
              <TabsTrigger key={value} value={value} id={`${id}-${value}`} aria-controls={`${id}-panel`} tabIndex={section === value ? 0 : -1}
                className="px-2 sm:px-4"
                onKeyDown={event => {
                  const next = event.key === "ArrowRight" ? (index + 1) % sections.length
                    : event.key === "ArrowLeft" ? (index + sections.length - 1) % sections.length
                      : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : null;
                  if (next === null) return;
                  event.preventDefault();
                  selectSection(sections[next]);
                  document.getElementById(`${id}-${sections[next]}`)?.focus();
                }}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
          <TimeRangeTabs sticky={false} value={timeRange} onValueChange={value => { returnToNavigation(); setTimeRange(value); }}>
            <></>
          </TimeRangeTabs>
        </StickyBar>

        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${section}`} tabIndex={0} className="min-h-0 min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {section === "Overview" ? (
            <div className={`grid gap-4 ${styles.overviewGrid}`}>
              {artist ? (
                <HeroBanner artist={{ ...artist, popularity: 0, previous_rank: artist.previous_rank ?? null }}
                  timeRange={timeRange} userId={profile.userId} label="Their #1 Artist" compact
                  onViewAll={() => { selectSection("Artists"); document.getElementById(`${id}-Artists`)?.focus(); }} />
              ) : <EmptyRanking label="artists" />}
              <div className="grid min-h-0 gap-4 md:grid-cols-2">
                {([
                  { label: "Top Track", type: "track", item: track, destination: "Tracks" },
                  { label: "Top Album", type: "album", item: album, destination: "Albums" },
                ] as const).map(({ label, type, item, destination }) => (
                  <article key={type} className={`group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-3xl p-5 text-white ${styles.highlightCard}`}>
                    <ArtworkBackground src={item?.imageUrl} />
                    <p className="relative text-xs font-medium uppercase tracking-widest text-white/90">{label}</p>
                    <div className="pt-5">
                      {item ? <>
                        <Link href={statsDetailHref(type, item.id, timeRange, profile.userId)}
                          className="after:absolute after:inset-0 after:z-10 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white">
                          <h2 className="relative break-words text-2xl font-semibold tracking-tight">{item.name}</h2>
                        </Link>
                        <p className="relative mt-2 text-sm text-white/90">by {item.artistName}</p>
                      </> : <p className="relative text-sm text-white/80">No {destination.toLowerCase()} saved for this period.</p>}
                      <button onClick={() => { selectSection(destination); document.getElementById(`${id}-${destination}`)?.focus(); }}
                        className="relative z-20 mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white">
                        View all {destination.toLowerCase()} <ArrowUpRight className="size-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Top {section}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{counts[section]} {section.toLowerCase()} in this period</p>
              </div>
              {counts[section] === 0 ? <EmptyRanking label={section.toLowerCase()} /> : <>
                {section === "Artists" && <ArtistsList artistsByTimeRange={artists} userId={profile.userId} timeRange={timeRange} />}
                {section === "Tracks" && <TracksList tracksByTimeRange={tracks} userId={profile.userId} timeRange={timeRange} />}
                {section === "Albums" && <AlbumsList albumsByTimeRange={albums} userId={profile.userId} timeRange={timeRange} />}
              </>}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}

function EmptyRanking({ label }: { label: string }) {
  return <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
    No {label} saved for this period. Try another time range.
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { TimeRange } from "@/lib/spotify/types";
import { ArtworkBackground } from "@/components/ui/artwork-background";
import { Button } from "@/components/ui/button";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import { TabsContent } from "@/components/ui/tabs";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { Pause, Play } from "lucide-react";

interface Genre {
  rank: number;
  name: string;
  artistCount: number;
  topArtists: string[];
  artistImages: { id: string; name: string; imageUrl: string }[];
}

interface GenresPageProps {
  genresByTimeRange: Record<TimeRange, Genre[]>;
}

export function GenresPageClient({ genresByTimeRange }: GenresPageProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [paused, setPaused] = useState(false);
  const [frame, setFrame] = useState(0);
  const reducedMotion = useReducedMotion();
  const genres = genresByTimeRange[timeRange];
  const hasSlides = genres.some((genre) => genre.artistImages.length > 1);
  const playing = !paused && reducedMotion === false && hasSlides;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setFrame((previous) => previous + 1);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Genres</h1>
          <p className="mt-1 text-muted-foreground">The sounds you keep coming back to</p>
        </div>
        <SpotifyAttribution className="hidden md:flex" />
      </div>

      <TimeRangeTabs value={timeRange} onValueChange={setTimeRange} className="w-full"
        rightContent={hasSlides && !reducedMotion ? (
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setPaused(!paused)}
            aria-label={paused ? "Play artist slideshow" : "Pause artist slideshow"}>
            {paused ? <Play /> : <Pause />}
            {paused ? "Play artwork" : "Pause artwork"}
          </Button>
        ) : null}>
        <TabsContent value={timeRange} className="mt-6">
          {genres.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
              No genres available for this time range yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {genres.map((genre) => (
                <article key={`${timeRange}-${genre.name}`}
                  className="group relative isolate flex min-h-80 flex-col justify-between overflow-hidden rounded-3xl bg-neutral-900 p-6 text-white">
                  {genre.artistImages.map((artist, index) => (
                    <ArtworkBackground key={artist.id} src={artist.imageUrl}
                      className={`transition-opacity duration-1000 motion-reduce:transition-none ${index === frame % genre.artistImages.length ? "opacity-100" : "opacity-0"}`} />
                  ))}
                  <div className="relative flex items-center justify-between gap-3 text-xs font-medium text-white/90">
                    <span className="flex size-9 items-center justify-center rounded-full border border-white/30">{genre.rank}</span>
                    <span>{genre.artistCount} {genre.artistCount === 1 ? "artist" : "artists"}</span>
                  </div>
                  <div className="relative min-w-0 pt-16">
                    <h2 className="text-3xl font-semibold capitalize tracking-tight break-words">{genre.name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-white/90">{genre.topArtists.join(" · ")}</p>
                    {genre.artistImages.length > 1 && (
                      <div aria-hidden="true" className="mt-5 flex gap-1.5">
                        {genre.artistImages.map((artist, index) => (
                          <span key={artist.id} className={`h-1 w-5 rounded-full ${index === frame % genre.artistImages.length ? "bg-white" : "bg-white/30"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>
      </TimeRangeTabs>
    </div>
  );
}

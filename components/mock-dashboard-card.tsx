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
    image: "https://i.scdn.co/image/ab6761610000e5ebe412a782245eb20d9626c601",
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
    image: "https://i.scdn.co/image/ab6761610000e5ebc9aca5b6d4c528caf75e8a1d",
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

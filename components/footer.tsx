import Link from "next/link";

import { SpotifyLogo } from "@/components/spotify-stats-logo";
import { Button } from "@/components/ui/button";

const productLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/artists", label: "Artists" },
  { href: "/dashboard/tracks", label: "Tracks" },
  { href: "/dashboard/albums", label: "Albums" },
  { href: "/dashboard/friends", label: "Friends" },
];

const proof = [
  ["Rankings", "Top artists, tracks, and albums"],
  ["Snapshots", "History your profile can remember"],
  ["Privacy", "Export and delete controls in profile"],
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#121212]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10">
          <div className="border-b border-white/[0.08] pb-8 lg:border-b-0 lg:border-r lg:pr-10">
            <Link href="/" className="inline-flex items-center gap-2">
              <SpotifyLogo
                className="h-8 w-8 text-primary"
                showWordmark={false}
              />
              <span className="text-lg font-bold">Stats for Spotify</span>
            </Link>

            <nav aria-label="Product" className="mt-6 flex flex-col gap-2">
              {productLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  <span>{link.label}</span>
                  <span className="h-1.5 w-10 rounded-full bg-white/15" />
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                  A quieter way to read your Spotify history.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Dark app surfaces, Spotify-powered data, user-controlled
                  sharing, and no public profile unless you choose it.
                </p>
              </div>
              <Button asChild className="w-fit bg-primary text-black">
                <Link href="/auth/callback?action=login">Connect Spotify</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {proof.map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4"
                >
                  <div className="mb-4 h-2 w-10 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/[0.08] pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Powered by Spotify. Not affiliated with Spotify AB.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { SpotifyAttribution } from "@/components/spotify-stats-logo";

/** Page heading for the sticky top bar. Description and attribution only get room on desktop. */
export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {description && <p className="hidden text-muted-foreground md:block">{description}</p>}
      </div>
      <SpotifyAttribution className="hidden md:flex" />
    </div>
  );
}

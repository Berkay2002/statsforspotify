import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recapTimeRangeLabels, recapTimeRanges, RecapItemImage, type RecapTimeRange } from "@/components/recaps/shared";
import { Badge } from "@/components/ui/badge";

type AlbumTakeoverEntry = {
  date: string;
  album_id: string;
  album_name: string;
  album_image_url: string | null;
  track_count: number;
  takeover_percent: number;
};

type AlbumTakeoverMostFrequent = {
  album_id: string;
  album_name: string;
  album_image_url: string | null;
  days_at_1: number;
};

type AlbumTakeoverRange = {
  latest: AlbumTakeoverEntry | null;
  record: AlbumTakeoverEntry | null;
  most_frequent: AlbumTakeoverMostFrequent | null;
  timeline: AlbumTakeoverEntry[];
};

export type AlbumTakeoverRecap = Record<RecapTimeRange, AlbumTakeoverRange>;

function formatTakeoverPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function AlbumSummary(props: {
  label: string;
  entry: AlbumTakeoverEntry | null;
}) {
  const { label, entry } = props;

  if (!entry) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <RecapItemImage
          imageUrl={entry.album_image_url}
          alt={entry.album_name}
          size={32}
          className="rounded-md shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entry.album_name}</p>
          <p className="text-xs text-muted-foreground">
            {entry.date} · {entry.track_count}/50 tracks
          </p>
        </div>
      </div>
      <Badge variant="secondary">{formatTakeoverPercent(entry.takeover_percent)}</Badge>
    </div>
  );
}

export function AlbumTakeover(props: {
  recap: AlbumTakeoverRecap | null;
  hasSnapshots: boolean;
}) {
  const { recap, hasSnapshots } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Album Takeover</CardTitle>
        <CardDescription>
          When one album dominates your daily Top 50 snapshot (based on tracks per album).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSnapshots ? (
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recapTimeRanges.map((timeRange) => {
              const rangeRecap = recap?.[timeRange];
              const mostFrequent = rangeRecap?.most_frequent ?? null;

              return (
                <div key={timeRange} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{recapTimeRangeLabels[timeRange]}</p>
                    {mostFrequent ? (
                      <Badge variant="outline">{mostFrequent.days_at_1} days at #1</Badge>
                    ) : (
                      <Badge variant="outline">No data</Badge>
                    )}
                  </div>

                  <AlbumSummary label="Latest" entry={rangeRecap?.latest ?? null} />
                  <AlbumSummary label="Record" entry={rangeRecap?.record ?? null} />

                  {mostFrequent ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <RecapItemImage
                          imageUrl={mostFrequent.album_image_url}
                          alt={mostFrequent.album_name}
                          size={32}
                          className="rounded-md shrink-0"
                        />
                        <p className="truncate text-sm font-medium min-w-0">{mostFrequent.album_name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Most frequent</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


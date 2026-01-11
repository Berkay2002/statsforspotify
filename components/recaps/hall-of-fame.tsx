import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recapTimeRangeLabels, recapTimeRanges, RecapItemImage, type RecapTimeRange } from "@/components/recaps/shared";

type MostDaysCharted = {
  id: string;
  name: string;
  image_url: string | null;
  days_charted: number;
};

type MostNumberOneDays = {
  id: string;
  name: string;
  image_url: string | null;
  number_one_days: number;
};

type BestPeakRank = {
  id: string;
  name: string;
  image_url: string | null;
  peak_rank: number;
};

type LongestStreak = {
  id: string;
  name: string;
  image_url: string | null;
  longest_streak_days: number;
};

type HallOfFameEntity = {
  most_days_charted: MostDaysCharted[];
  most_number_one_days: MostNumberOneDays | null;
  best_peak_rank: BestPeakRank | null;
  longest_streak: LongestStreak | null;
};

type HallOfFameRange = {
  artists: HallOfFameEntity;
  albums: HallOfFameEntity;
};

export type HallOfFameRecap = Record<RecapTimeRange, HallOfFameRange>;

function MostDaysList(props: { items: MostDaysCharted[] }) {
  const { items } = props;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <RecapItemImage imageUrl={item.image_url} alt={item.name} size={28} className="rounded-md" />
            <p className="truncate text-sm font-medium">{item.name}</p>
          </div>
          <Badge variant="secondary">{item.days_charted} days</Badge>
        </div>
      ))}
    </div>
  );
}

function SingleHighlight(props: {
  label: string;
  value: string;
  item: { id: string; name: string; image_url: string | null } | null;
}) {
  const { label, value, item } = props;

  if (!item) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <RecapItemImage imageUrl={item.image_url} alt={item.name} size={28} className="rounded-md" />
        <p className="truncate text-sm font-medium">{item.name}</p>
      </div>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}

export function HallOfFame(props: {
  recap: HallOfFameRecap | null;
  hasSnapshots: boolean;
}) {
  const { recap, hasSnapshots } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hall of Fame</CardTitle>
        <CardDescription>
          Your most consistent chart appearances across snapshots (not play counts).
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
              const artists = rangeRecap?.artists;
              const albums = rangeRecap?.albums;

              return (
                <div key={timeRange} className="space-y-4">
                  <p className="text-sm font-semibold">{recapTimeRangeLabels[timeRange]}</p>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Artists · Most days in your Top 50</p>
                    <MostDaysList items={artists?.most_days_charted ?? []} />
                    <SingleHighlight
                      label="Most #1 days"
                      value={`${artists?.most_number_one_days?.number_one_days ?? 0}`}
                      item={artists?.most_number_one_days ?? null}
                    />
                    <SingleHighlight
                      label="Best peak rank"
                      value={`#${artists?.best_peak_rank?.peak_rank ?? 0}`}
                      item={artists?.best_peak_rank ?? null}
                    />
                    <SingleHighlight
                      label="Longest streak"
                      value={`${artists?.longest_streak?.longest_streak_days ?? 0} days`}
                      item={artists?.longest_streak ?? null}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Albums · Most days in your Top 50</p>
                    <MostDaysList items={albums?.most_days_charted ?? []} />
                    <SingleHighlight
                      label="Most #1 days"
                      value={`${albums?.most_number_one_days?.number_one_days ?? 0}`}
                      item={albums?.most_number_one_days ?? null}
                    />
                    <SingleHighlight
                      label="Best peak rank"
                      value={`#${albums?.best_peak_rank?.peak_rank ?? 0}`}
                      item={albums?.best_peak_rank ?? null}
                    />
                    <SingleHighlight
                      label="Longest streak"
                      value={`${albums?.longest_streak?.longest_streak_days ?? 0} days`}
                      item={albums?.longest_streak ?? null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


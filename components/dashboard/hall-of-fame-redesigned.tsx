"use client";

import { ArtworkBackground } from "@/components/ui/artwork-background";
import { type HallOfFameRecap } from "@/components/recaps/hall-of-fame";

type StatCardData = {
  value: string;
  label: string;
  itemName: string;
  imageUrl?: string | null;
};

function extractStats(recap: HallOfFameRecap): StatCardData[] {
  const ranges = ["short_term", "medium_term", "long_term"] as const;

  let bestNumberOneDays: StatCardData = { value: "—", label: "Most Days at #1", itemName: "" };
  let bestStreak: StatCardData = { value: "—", label: "Longest Streak", itemName: "" };
  let bestPeak: StatCardData = { value: "—", label: "Best Peak Rank", itemName: "" };
  let bestCharted: StatCardData = { value: "—", label: "Most Days Charted", itemName: "" };

  for (const range of ranges) {
    const data = recap[range];
    if (!data) continue;

    for (const entity of [data.artists, data.albums]) {
      if (entity.most_number_one_days) {
        const days = entity.most_number_one_days.number_one_days;
        if (bestNumberOneDays.value === "—" || days > parseInt(bestNumberOneDays.value)) {
          bestNumberOneDays = {
            value: String(days),
            label: "Most Days at #1",
            itemName: entity.most_number_one_days.name,
            imageUrl: entity.most_number_one_days.image_url,
          };
        }
      }

      if (entity.longest_streak) {
        const days = entity.longest_streak.longest_streak_days;
        if (bestStreak.value === "—" || days > parseInt(bestStreak.value)) {
          bestStreak = {
            value: String(days),
            label: "Longest Streak",
            itemName: entity.longest_streak.name,
            imageUrl: entity.longest_streak.image_url,
          };
        }
      }

      if (entity.best_peak_rank) {
        const rank = entity.best_peak_rank.peak_rank;
        if (bestPeak.value === "—" || rank < parseInt(bestPeak.value.replace("#", ""))) {
          bestPeak = {
            value: `#${rank}`,
            label: "Best Peak Rank",
            itemName: entity.best_peak_rank.name,
            imageUrl: entity.best_peak_rank.image_url,
          };
        }
      }

      if (entity.most_days_charted && entity.most_days_charted.length > 0) {
        const top = entity.most_days_charted[0];
        if (bestCharted.value === "—" || top.days_charted > parseInt(bestCharted.value)) {
          bestCharted = {
            value: String(top.days_charted),
            label: "Most Days Charted",
            itemName: top.name,
            imageUrl: top.image_url,
          };
        }
      }
    }
  }

  return [bestNumberOneDays, bestStreak, bestPeak, bestCharted];
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <div className="group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-3xl p-5 text-white sm:p-6">
      <ArtworkBackground src={stat.imageUrl} sizes="(max-width: 768px) 50vw, 25vw" />
      <p className="relative text-xs font-medium uppercase tracking-wider text-white/90">{stat.label}</p>
      <div className="relative pt-12">
        <p className="text-5xl font-semibold tracking-tighter">{stat.value}</p>
        {stat.itemName && (
          <p className="mt-3 text-sm font-medium break-words text-white/90">{stat.itemName}</p>
        )}
      </div>
    </div>
  );
}

export function HallOfFameRedesigned({
  recap, hasSnapshots,
}: {
  recap: HallOfFameRecap | null;
  hasSnapshots: boolean;
}) {
  if (!hasSnapshots || !recap) {
    return (
      <div>
        <h3 className="text-lg font-bold">Hall of Fame</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Your all-time achievements and streaks
        </p>
        <div className="bg-card rounded-3xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow
          </p>
        </div>
      </div>
    );
  }

  const stats = extractStats(recap);

  return (
    <div>
      <h3 className="text-lg font-bold">Hall of Fame</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Your all-time achievements and streaks
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}

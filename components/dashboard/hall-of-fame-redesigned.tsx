"use client";

import { type HallOfFameRecap } from "@/components/recaps/hall-of-fame";

type StatCardData = {
  value: string;
  label: string;
  itemName: string;
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
          };
        }
      }
    }
  }

  return [bestNumberOneDays, bestStreak, bestPeak, bestCharted];
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <div className="bg-card rounded-xl border p-5 text-center">
      <p className="text-3xl font-extrabold">{stat.value}</p>
      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
      {stat.itemName && (
        <p className="text-sm font-medium mt-2 truncate">{stat.itemName}</p>
      )}
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
        <div className="bg-card rounded-xl border p-6 text-center">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}

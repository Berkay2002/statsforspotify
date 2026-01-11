"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import SparklineChart from "@/components/charts/sparkline-chart";

type SparklinePoint = { date: string; rank: number };

const EXAMPLE_IMPROVING: SparklinePoint[] = [
  { date: "2026-01-01", rank: 20 },
  { date: "2026-01-05", rank: 16 },
  { date: "2026-01-09", rank: 12 },
];

const EXAMPLE_DECLINING: SparklinePoint[] = [
  { date: "2026-01-01", rank: 12 },
  { date: "2026-01-05", rank: 16 },
  { date: "2026-01-09", rank: 20 },
];

const EXAMPLE_STABLE: SparklinePoint[] = [
  { date: "2026-01-01", rank: 14 },
  { date: "2026-01-05", rank: 14 },
  { date: "2026-01-09", rank: 14 },
];

const EXAMPLE_VOLATILE: SparklinePoint[] = [
  { date: "2026-01-01", rank: 10 },
  { date: "2026-01-03", rank: 28 },
  { date: "2026-01-05", rank: 16 },
  { date: "2026-01-07", rank: 24 },
  { date: "2026-01-09", rank: 14 },
];

function ExampleRow(props: { label: string; description: string; data?: SparklinePoint[] }) {
  const { label, description, data } = props;

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        {data ? (
          <SparklineChart data={data} width={80} height={20} color="var(--muted-foreground)" showTrend />
        ) : (
          <div className="h-5 w-20 rounded bg-muted" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

export function SparklineInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2 text-muted-foreground"
        >
          <Info className="h-4 w-4" />
          Sparkline
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <PopoverHeader>
          <PopoverTitle>What the sparkline means</PopoverTitle>
        </PopoverHeader>
        <div className="text-xs text-muted-foreground">
          Shows rank over recent snapshots (last 14 days). Up means closer to #1 (best).
        </div>
        <div className="mt-3 space-y-3">
          <ExampleRow label="Improving" description="Ranks move toward #1." data={EXAMPLE_IMPROVING} />
          <ExampleRow label="Declining" description="Ranks move away from #1." data={EXAMPLE_DECLINING} />
          <ExampleRow label="Stable" description="Rank stays about the same." data={EXAMPLE_STABLE} />
          <ExampleRow label="Volatile" description="Rank swings between snapshots." data={EXAMPLE_VOLATILE} />
          <ExampleRow label="Hidden" description="If there are fewer than 2 snapshots." />
        </div>
      </PopoverContent>
    </Popover>
  );
}

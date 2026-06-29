"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filters = ["All", "Ranking", "Recap", "Social", "Control", "History"];

const experiments = [
  {
    category: "Ranking",
    title: "Rank drift",
    body: "Spot artists and tracks that keep moving up across captures.",
    variant: "bars",
  },
  {
    category: "Recap",
    title: "Album takeover",
    body: "Find weeks where one album dominates your profile.",
    variant: "stack",
  },
  {
    category: "Social",
    title: "Taste overlap",
    body: "Compare shared artists without exposing private profile details.",
    variant: "overlap",
  },
  {
    category: "Control",
    title: "Privacy switches",
    body: "Choose which parts of your listening profile are public.",
    variant: "switches",
  },
  {
    category: "History",
    title: "Snapshot replay",
    body: "Move through older captures without losing context.",
    variant: "timeline",
  },
];

export function LandingLabs() {
  const [active, setActive] = useState("All");
  const visible =
    active === "All"
      ? experiments
      : experiments.filter((item) => item.category === active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" aria-label="Experiment filters">
        {filters.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant={active === filter ? "default" : "outline"}
            size="sm"
            aria-pressed={active === filter}
            onClick={() => setActive(filter)}
            className={cn(
              active === filter && "bg-primary text-black hover:bg-primary/90",
            )}
          >
            {filter}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {visible.map((experiment) => (
          <article
            key={experiment.title}
            className="flex min-h-[260px] flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.035] p-4 transition-colors hover:border-primary/45"
          >
            <ExperimentVisual variant={experiment.variant} />
            <div className="flex flex-col gap-3">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                {experiment.category}
              </Badge>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">{experiment.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {experiment.body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CopyInviteButton() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(
        "I am tracking my Spotify listening history with Stats for Spotify.",
      );
      setState("copied");
    } catch {
      setState("failed");
    }

    window.setTimeout(() => setState("idle"), 1400);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={copyText}
      className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
    >
      {state === "copied"
        ? "Copied"
        : state === "failed"
          ? "Copy failed"
          : "Copy invite text"}
    </Button>
  );
}

function ExperimentVisual({ variant }: { variant: string }) {
  if (variant === "bars") {
    return (
      <div className="flex aspect-[16/9] min-h-32 items-end gap-2 overflow-hidden rounded-lg bg-black/30 p-3">
        {[64, 42, 88, 54, 96, 70].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-sm bg-primary/80"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "stack") {
    return (
      <div className="grid aspect-[16/9] min-h-32 grid-cols-3 gap-2 overflow-hidden rounded-lg bg-black/30 p-3">
        <span className="rounded-md bg-primary/80" />
        <span className="rounded-md bg-white/20" />
        <span className="rounded-md bg-white/12" />
        <span className="col-span-2 rounded-md bg-white/12" />
        <span className="rounded-md bg-primary/45" />
      </div>
    );
  }

  if (variant === "overlap") {
    return (
      <div className="relative aspect-[16/9] min-h-32 overflow-hidden rounded-lg bg-black/30">
        <span className="absolute left-1/2 top-1/2 size-20 -translate-x-[72%] -translate-y-1/2 rounded-full border border-primary/80 bg-primary/20" />
        <span className="absolute left-1/2 top-1/2 size-20 -translate-x-[28%] -translate-y-1/2 rounded-full border border-white/35 bg-white/10" />
        <span className="absolute bottom-7 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-primary" />
      </div>
    );
  }

  if (variant === "switches") {
    return (
      <div className="flex aspect-[16/9] min-h-32 flex-col justify-center gap-2 overflow-hidden rounded-lg bg-black/30 p-4">
        {[true, false, true].map((enabled, index) => (
          <span
            key={index}
            className="flex items-center justify-between rounded-md bg-white/[0.06] px-3 py-2"
          >
            <span className="h-2 w-20 rounded-full bg-white/20" />
            <span
              className={cn(
                "h-5 w-9 rounded-full p-0.5",
                enabled ? "bg-primary" : "bg-white/20",
              )}
            >
              <span
                className={cn(
                  "block size-4 rounded-full bg-black transition-transform",
                  enabled && "translate-x-4",
                )}
              />
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex aspect-[16/9] min-h-32 items-center justify-between overflow-hidden rounded-lg bg-black/30 p-3">
      {[0, 1, 2, 3].map((item) => (
        <span key={item} className="flex flex-col items-center gap-2">
          <span className="size-3 rounded-full bg-primary" />
          <span className="h-16 w-px bg-white/15" />
        </span>
      ))}
    </div>
  );
}

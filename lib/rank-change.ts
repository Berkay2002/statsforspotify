export type RankMovement = "improved" | "declined" | "unchanged" | "new";

export function getRankDelta(options: {
  previousRank: number | null | undefined;
  currentRank: number;
}): number | null {
  const { previousRank, currentRank } = options;

  if (previousRank === null || previousRank === undefined) {
    return null;
  }

  return previousRank - currentRank;
}

export function getRankMovement(options: {
  previousRank: number | null | undefined;
  currentRank: number;
}): { movement: RankMovement; delta: number | null } {
  const delta = getRankDelta(options);

  if (delta === null) {
    return { movement: "new", delta: null };
  }

  if (delta === 0) {
    return { movement: "unchanged", delta: 0 };
  }

  return { movement: delta > 0 ? "improved" : "declined", delta };
}

export function getRankMovementFromSeries(options: {
  ranks: number[];
  comparison?: "window" | "most_recent";
}): { movement: Exclude<RankMovement, "new">; delta: number } | null {
  const { ranks, comparison = "window" } = options;

  if (ranks.length < 2) {
    return null;
  }

  const currentRank = ranks[ranks.length - 1];
  const previousRank = comparison === "most_recent" ? ranks[ranks.length - 2] : ranks[0];
  const delta = previousRank - currentRank;

  if (delta === 0) {
    return { movement: "unchanged", delta: 0 };
  }

  return { movement: delta > 0 ? "improved" : "declined", delta };
}


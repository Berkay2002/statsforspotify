import { cn } from "@/lib/utils";

interface RankBadgeInlineProps {
  currentRank: number;
  previousRank: number | null;
  className?: string;
}

/**
 * Display inline rank change badge with color-coded indicators
 * - Green ↑N = improved (moved up in ranking)
 * - Red ↓N = declined (moved down in ranking)
 * - Blue "NEW" = new entry (no previous rank)
 * - Gray "—" = unchanged
 */
export default function RankBadgeInline({ 
  currentRank, 
  previousRank, 
  className 
}: RankBadgeInlineProps) {
  // Don't show badge if no previous rank data
  if (previousRank === null || previousRank === undefined) {
    return null;
  }
  
  const change = previousRank - currentRank; // Positive = improved (lower rank number is better)
  
  // No change
  if (change === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground ml-2", className)}>
        —
      </span>
    );
  }
  
  // New entry (was ranked very low or not ranked)
  const isNew = previousRank > 50;
  
  if (isNew) {
    return (
      <span className={cn("text-xs font-medium text-blue-600 dark:text-blue-400 ml-2", className)}>
        NEW
      </span>
    );
  }
  
  // Improved or declined
  const isImprovement = change > 0;
  const arrow = isImprovement ? "↑" : "↓";
  const colorClass = isImprovement 
    ? "text-green-600 dark:text-green-400" 
    : "text-red-600 dark:text-red-400";
  
  return (
    <span className={cn("text-xs font-medium ml-2", colorClass, className)}>
      {arrow}{Math.abs(change)}
    </span>
  );
}

import { Badge } from "@/components/ui/badge";

interface RankingBadgeProps {
  isNewEntry?: boolean;
  isReentry?: boolean;
  className?: string;
}

export function RankingBadge({
  isNewEntry,
  isReentry,
  className,
}: RankingBadgeProps) {
  if (isNewEntry) {
    return (
      <Badge
        variant="default"
        className={`bg-green-500/10 text-green-600 border-green-500/20 ${className || ""}`}
      >
        🆕 New Entry
      </Badge>
    );
  }

  if (isReentry) {
    return (
      <Badge
        variant="outline"
        className={`text-blue-600 border-blue-500/30 ${className || ""}`}
      >
        ↩️ Re-entry
      </Badge>
    );
  }

  return null;
}

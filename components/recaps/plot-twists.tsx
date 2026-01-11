import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recapTimeRangeLabels, recapTimeRanges, RecapItemImage, type RecapTimeRange } from "@/components/recaps/shared";

type PlotTwistEventType = "biggest_climb" | "biggest_drop" | "new_entry_top10" | "dropped_out_after_top10";

type PlotTwistEvent = {
  event_type: PlotTwistEventType;
  date: string;
  item_id: string;
  item_name: string;
  item_image_url: string | null;
  rank: number | null;
  previous_rank: number | null;
  delta: number | null;
  context: unknown | null;
};

type PlotTwistsRange = {
  artists: PlotTwistEvent[];
  albums: PlotTwistEvent[];
};

export type PlotTwistsRecap = Record<RecapTimeRange, PlotTwistsRange>;

function eventLabel(eventType: PlotTwistEventType) {
  switch (eventType) {
    case "biggest_climb":
      return "Biggest climb";
    case "biggest_drop":
      return "Biggest drop";
    case "new_entry_top10":
      return "New entry (Top 10)";
    case "dropped_out_after_top10":
      return "Dropped out (after Top 10)";
    default:
      return eventType;
  }
}

function DeltaBadge(props: { event: PlotTwistEvent }) {
  const { event } = props;

  if (event.event_type === "new_entry_top10") {
    return <Badge variant="secondary">NEW</Badge>;
  }
  if (event.event_type === "dropped_out_after_top10") {
    return <Badge variant="secondary">DROPPED</Badge>;
  }
  if (typeof event.delta !== "number" || event.delta === 0) {
    return <Badge variant="secondary">—</Badge>;
  }

  const arrow = event.delta > 0 ? "↑" : "↓";
  return (
    <Badge variant="secondary">
      {arrow}
      {Math.abs(event.delta)}
    </Badge>
  );
}

function EventRow(props: { event: PlotTwistEvent }) {
  const { event } = props;
  const rankLabel = typeof event.rank === "number" ? `#${event.rank}` : "—";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <RecapItemImage imageUrl={event.item_image_url} alt={event.item_name} size={28} className="rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{event.item_name}</p>
          <p className="text-xs text-muted-foreground">
            {event.date} · {eventLabel(event.event_type)} · {rankLabel}
          </p>
        </div>
      </div>
      <DeltaBadge event={event} />
    </div>
  );
}

export function PlotTwists(props: {
  recap: PlotTwistsRecap | null;
  hasSnapshots: boolean;
}) {
  const { recap, hasSnapshots } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plot Twists</CardTitle>
        <CardDescription>
          The biggest day-to-day changes in your Top 50 snapshots (artists + albums).
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
              const artistEvents = rangeRecap?.artists ?? [];
              const albumEvents = rangeRecap?.albums ?? [];
              const totalEvents = artistEvents.length + albumEvents.length;

              return (
                <div key={timeRange} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{recapTimeRangeLabels[timeRange]}</p>
                    <Badge variant="outline">{totalEvents} events</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Artists</p>
                    {artistEvents.slice(0, 4).map((event) => (
                      <EventRow key={`${event.event_type}-${event.date}-${event.item_id}`} event={event} />
                    ))}
                    {artistEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events yet.</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Albums</p>
                    {albumEvents.slice(0, 4).map((event) => (
                      <EventRow key={`${event.event_type}-${event.date}-${event.item_id}`} event={event} />
                    ))}
                    {albumEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events yet.</p>
                    ) : null}
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


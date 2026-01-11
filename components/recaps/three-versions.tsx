import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recapTimeRangeLabels, recapTimeRanges, RecapItemImage, type RecapTimeRange } from "@/components/recaps/shared";

type RankedRecapItem = {
  id: string;
  name: string;
  image_url: string | null;
  rank: number;
};

type RankedShiftItem = {
  id: string;
  name: string;
  image_url: string | null;
  short_rank: number;
  long_rank: number;
  delta: number;
};

type ThreeVersionsEntity = {
  short_term: RankedRecapItem[];
  medium_term: RankedRecapItem[];
  long_term: RankedRecapItem[];
  constants: string[];
  unique_short: string[];
  unique_medium: string[];
  unique_long: string[];
  biggest_shift_long_vs_short: RankedShiftItem[];
};

export type ThreeVersionsRecap = {
  artists: ThreeVersionsEntity;
  albums: ThreeVersionsEntity;
};

function ItemRow(props: {
  item: RankedRecapItem;
}) {
  const { item } = props;

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <span className="w-6 text-sm font-semibold text-muted-foreground">{item.rank}</span>
      <RecapItemImage imageUrl={item.image_url} alt={item.name} size={28} className="rounded-md" />
      <p className="truncate text-sm font-medium">{item.name}</p>
    </div>
  );
}

function ShiftRow(props: { shift: RankedShiftItem }) {
  const { shift } = props;
  const direction = shift.delta > 0 ? "↓" : "↑";
  const magnitude = Math.abs(shift.delta);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <RecapItemImage imageUrl={shift.image_url} alt={shift.name} size={28} className="rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{shift.name}</p>
          <p className="text-xs text-muted-foreground">
            Short #{shift.short_rank} → Long #{shift.long_rank}
          </p>
        </div>
      </div>
      <Badge variant="secondary">
        {direction}
        {magnitude}
      </Badge>
    </div>
  );
}

function getTopItems(entity: ThreeVersionsEntity | undefined, timeRange: RecapTimeRange) {
  return (entity?.[timeRange] ?? []).slice(0, 3);
}

export function ThreeVersions(props: {
  recap: ThreeVersionsRecap | null;
  hasSnapshots: boolean;
}) {
  const { recap, hasSnapshots } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>3 Versions of You</CardTitle>
        <CardDescription>
          How your Top 50 snapshots change across time ranges (artists + albums).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSnapshots ? (
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {recapTimeRanges.map((timeRange) => (
                <div key={timeRange} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{recapTimeRangeLabels[timeRange]}</p>
                    <Badge variant="outline">
                      {getTopItems(recap?.artists, timeRange).length + getTopItems(recap?.albums, timeRange).length} items
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Top Artists</p>
                    {getTopItems(recap?.artists, timeRange).map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                    {getTopItems(recap?.artists, timeRange).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No snapshot yet.</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Top Albums</p>
                    {getTopItems(recap?.albums, timeRange).map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                    {getTopItems(recap?.albums, timeRange).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No snapshot yet.</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Constants</p>
                <p className="text-sm text-muted-foreground">
                  Appears in all 3 time ranges:{" "}
                  <span className="font-medium text-foreground">
                    {recap?.artists.constants?.length ?? 0} artists, {recap?.albums.constants?.length ?? 0} albums
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Unique short: {recap?.artists.unique_short?.length ?? 0} artists</Badge>
                  <Badge variant="secondary">Unique medium: {recap?.artists.unique_medium?.length ?? 0} artists</Badge>
                  <Badge variant="secondary">Unique long: {recap?.artists.unique_long?.length ?? 0} artists</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Unique short: {recap?.albums.unique_short?.length ?? 0} albums</Badge>
                  <Badge variant="secondary">Unique medium: {recap?.albums.unique_medium?.length ?? 0} albums</Badge>
                  <Badge variant="secondary">Unique long: {recap?.albums.unique_long?.length ?? 0} albums</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Biggest Shifts (Long vs Short)</p>
                <div className="space-y-2">
                  {(recap?.artists.biggest_shift_long_vs_short ?? []).slice(0, 5).map((shift) => (
                    <ShiftRow key={shift.id} shift={shift} />
                  ))}
                  {(recap?.albums.biggest_shift_long_vs_short ?? []).slice(0, 5).map((shift) => (
                    <ShiftRow key={shift.id} shift={shift} />
                  ))}
                  {(recap?.artists.biggest_shift_long_vs_short?.length ?? 0) +
                    (recap?.albums.biggest_shift_long_vs_short?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">No overlaps between short and long yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

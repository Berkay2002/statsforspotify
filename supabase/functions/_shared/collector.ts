import { parseSnapshotResult, prepareSnapshot, TIME_RANGES, type SnapshotTimeRange } from "./snapshots.ts";

export interface SpotifyConnection {
  user_id: string;
  refresh_token: string;
  status: string;
}

export interface CollectorStore {
  // Pages must be ordered by user_id, with an exclusive cursor.
  listConnections(afterUserId?: string): Promise<SpotifyConnection[]>;
  hasSnapshot(userId: string, timeRange: SnapshotTimeRange): Promise<boolean>;
  refreshStats(userId: string): Promise<void>;
  persistSnapshot(userId: string, timeRange: SnapshotTimeRange, payload: ReturnType<typeof prepareSnapshot>): Promise<unknown>;
  // Update only the expected token and connected status. False means the row changed.
  updateConnection(expected: SpotifyConnection, values: {
    refresh_token?: string; status?: string; last_error?: string | null; last_sync_at?: string;
  }): Promise<boolean>;
}

export interface CollectorDependencies {
  store: CollectorStore;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  clientId: string;
  clientSecret: string;
  sleep?: (milliseconds: number) => Promise<void>;
}

type ErrorType = "revoked" | "rate_limit" | "transient" | "fatal";
class CollectionError extends Error {
  constructor(message: string, readonly type: ErrorType = "transient", readonly retryAfter?: number) {
    super(message);
  }
}
class ConnectionChanged extends Error {}

export interface CollectorResult {
  processed: number;
  succeeded: number;
  failed: number;
  revoked: number;
  deferred: number;
  retryAfter?: number;
  errors: Array<{ user_id: string; error: string; type: ErrorType }>;
}

function retryAfterSeconds(value: string | null): number {
  const seconds = Number(value);
  return value && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
}

interface Artist { id: string; name: string; images?: Array<{ url: string }>; genres?: string[]; popularity?: number }
interface Track {
  id: string; name: string; artists: Artist[]; duration_ms: number; popularity?: number;
  album: { id: string; name: string; images?: Array<{ url: string }> };
}

export async function collectSnapshots(dependencies: CollectorDependencies): Promise<CollectorResult> {
  const { store, fetch: fetchRequest, clientId, clientSecret } = dependencies;
  const sleep = dependencies.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  if (!clientId || !clientSecret) throw new Error("Spotify server credentials are not configured");

  // Load stable keyset pages before processing changes connection statuses.
  const connections: SpotifyConnection[] = [];
  let cursor: string | undefined;
  while (true) {
    const page = await store.listConnections(cursor);
    if (!page.length) break;
    connections.push(...page);
    const next = page[page.length - 1].user_id;
    if (next === cursor) throw new Error("Connection pagination did not advance");
    cursor = next;
  }

  let rateLimit: CollectionError | undefined;
  function recordRateLimit(seconds: number) {
    rateLimit = new CollectionError("Spotify rate limit reached; retry after the cooldown", "rate_limit",
      Math.max(seconds, rateLimit?.retryAfter ?? 0));
    return rateLimit;
  }
  async function spotifyRequest(url: string, init?: RequestInit) {
    // A 429 stops further requests for all users in this invocation. Requests
    // already in flight finish; no worker starts another range or batch.
    if (rateLimit) throw rateLimit;
    const response = await fetchRequest(url, { ...init, signal: AbortSignal.timeout(15_000) });
    if (response.status === 429) {
      throw recordRateLimit(retryAfterSeconds(response.headers.get("Retry-After")));
    }
    return response;
  }

  async function refresh(connection: SpotifyConnection) {
    const response = await spotifyRequest("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refresh_token }),
    });
    if (response.status === 400) {
      const error: unknown = await response.json();
      if (error && typeof error === "object" && "error" in error && error.error === "invalid_grant") {
        throw new CollectionError("Spotify refresh token is no longer valid", "revoked");
      }
      if (error && typeof error === "object" && "error" in error && error.error === "invalid_client") {
        throw new CollectionError("Spotify client authentication failed", "fatal");
      }
    }
    if (response.status === 401) throw new CollectionError("Spotify client authentication failed", "fatal");
    if (!response.ok) throw new CollectionError(`Spotify token refresh failed (${response.status})`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("access_token" in data) || typeof data.access_token !== "string" || !data.access_token) {
      throw new CollectionError("Spotify returned an invalid access token");
    }
    const rotated = "refresh_token" in data ? data.refresh_token : undefined;
    if (rotated !== undefined && (typeof rotated !== "string" || !rotated)) {
      throw new CollectionError("Spotify returned an invalid refresh token");
    }
    return { accessToken: data.access_token, refreshToken: rotated ?? connection.refresh_token };
  }

  async function topItems<T>(accessToken: string, type: "artists" | "tracks", range: SnapshotTimeRange): Promise<T[]> {
    const response = await spotifyRequest(`https://api.spotify.com/v1/me/top/${type}?time_range=${range}&limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new CollectionError(`Spotify top ${type} failed (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data?.items)) throw new CollectionError(`Spotify returned invalid top ${type}`);
    return data.items;
  }

  async function processUser(original: SpotifyConnection): Promise<{ success: boolean; error?: CollectionError }> {
    let connection = original;
    try {
      const missing: SnapshotTimeRange[] = [];
      for (const range of TIME_RANGES) {
        if (!await store.hasSnapshot(connection.user_id, range)) missing.push(range);
      }
      // Completed retries need neither a token refresh nor more Spotify quota.
      if (missing.length) {
        const token = await refresh(connection);
        if (token.refreshToken !== connection.refresh_token) {
          if (!await store.updateConnection(connection, { refresh_token: token.refreshToken })) {
            throw new ConnectionChanged("Spotify connection changed during refresh; retry");
          }
          connection = { ...connection, refresh_token: token.refreshToken };
        }
        const failures: string[] = [];
        for (const [index, range] of missing.entries()) {
          try {
            const [artistResult, trackResult] = await Promise.allSettled([
              topItems<Artist>(token.accessToken, "artists", range),
              topItems<Track>(token.accessToken, "tracks", range),
            ]);
            if (rateLimit) throw rateLimit;
            if (artistResult.status === "rejected") throw artistResult.reason;
            if (trackResult.status === "rejected") throw trackResult.reason;
            const artists = artistResult.value;
            const tracks = trackResult.value;
            const payload = prepareSnapshot(
              artists.map((artist, index) => ({
                id: artist.id, name: artist.name, rank: index + 1,
                imageUrl: artist.images?.[1]?.url ?? artist.images?.[0]?.url ?? null,
                genres: artist.genres ?? [], popularity: artist.popularity ?? null,
              })),
              tracks.map((track, index) => ({
                id: track.id, name: track.name, rank: index + 1,
                imageUrl: track.album.images?.[1]?.url ?? track.album.images?.[0]?.url ?? null,
                artistId: track.artists[0]?.id ?? "", artistName: track.artists.map(artist => artist.name).join(", "),
                albumId: track.album.id, albumName: track.album.name,
                durationMs: track.duration_ms, popularity: track.popularity ?? null,
              })),
            );
            parseSnapshotResult(await store.persistSnapshot(connection.user_id, range, payload));
          } catch (error) {
            if (error instanceof CollectionError && error.type === "rate_limit") throw error;
            failures.push(range);
          }
          if (index < missing.length - 1 && !rateLimit) await sleep(500);
        }
        if (failures.length) throw new CollectionError(`Failed time ranges: ${failures.join(", ")}`);
      } else await store.refreshStats(connection.user_id);
      if (!await store.updateConnection(connection, { last_sync_at: new Date().toISOString(), status: "connected", last_error: null })) {
        throw new ConnectionChanged("Spotify connection changed during collection; retry");
      }
      return { success: true };
    } catch (caught) {
      let error = caught instanceof CollectionError ? caught : new CollectionError(caught instanceof Error ? caught.message : "Snapshot collection failed");
      // Never overwrite metadata on a connection replaced by reconnect or refresh.
      if (!(caught instanceof ConnectionChanged)) {
        try {
          const updated = await store.updateConnection(connection, {
            status: error.type === "revoked" ? "revoked" : "connected",
            last_error: error.message,
          });
          if (!updated) error = new CollectionError("Spotify connection changed during collection; retry");
        } catch {
          error = new CollectionError(`${error.message}; unable to save connection status`, error.type, error.retryAfter);
        }
      }
      return { success: false, error };
    }
  }

  const result: CollectorResult = { processed: 0, succeeded: 0, failed: 0, revoked: 0, deferred: 0, errors: [] };
  for (let index = 0; index < connections.length; index += 2) {
    const batch = connections.slice(index, index + 2);
    const outcomes = await Promise.all(batch.map(processUser));
    outcomes.forEach((outcome, batchIndex) => {
      result.processed++;
      if (outcome.success) result.succeeded++;
      else {
        result.failed++;
        if (outcome.error?.type === "revoked") result.revoked++;
        result.errors.push({ user_id: batch[batchIndex].user_id, error: outcome.error?.message ?? "Collection failed", type: outcome.error?.type ?? "transient" });
      }
    });
    if (rateLimit || outcomes.some(outcome => outcome.error?.type === "fatal")) {
      if (rateLimit) result.retryAfter = rateLimit.retryAfter;
      result.deferred = connections.length - result.processed;
      break;
    }
    if (index + 2 < connections.length) await sleep(2000);
  }
  return result;
}

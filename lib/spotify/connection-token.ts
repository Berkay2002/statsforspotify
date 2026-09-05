import { SpotifyAPIError } from "./errors";
import type { refreshSpotifyToken } from "./token-refresh";
import type { createSpotifyTokenCache } from "./token-cache";

type Token = Awaited<ReturnType<typeof refreshSpotifyToken>>;
type Connection = { refreshToken: string; status: string };
type TokenStore = {
  read(): Promise<Connection | null>;
  save(previous: string, next: string): Promise<boolean>;
  refresh(refreshToken: string): Promise<Token>;
  cached: ReturnType<typeof createSpotifyTokenCache>;
};
class ConnectionChanged extends Error {}

export async function getConnectionToken(userId: string, store: TokenStore, forceRefresh = false) {
  let nextConnection = await store.read();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const connection = nextConnection;
    if (!connection || connection.status === "revoked") {
      throw new SpotifyAPIError("Please reconnect your Spotify account.", 401, true);
    }
    try {
      return await store.cached(userId, connection.refreshToken, async () => {
        const token = await store.refresh(connection.refreshToken);
        if (token.refreshToken !== connection.refreshToken &&
            !await store.save(connection.refreshToken, token.refreshToken)) {
          throw new ConnectionChanged();
        }
        return token;
      }, forceRefresh);
    } catch (error) {
      const lostUpdate = error instanceof ConnectionChanged;
      const rejectedGrant = error instanceof SpotifyAPIError && error.shouldRefresh;
      if (attempt === 0 && (lostUpdate || rejectedGrant)) {
        const latest = await store.read();
        // A rejected old grant may race with reconnect or token rotation.
        // Retry only a replacement credential, never the same rejected grant.
        if (lostUpdate || (latest && latest.refreshToken !== connection.refreshToken)) {
          nextConnection = latest;
          continue;
        }
      }
      if (!(error instanceof ConnectionChanged)) throw error;
    }
  }
  throw new SpotifyAPIError("Spotify connection changed. Please retry.", 503);
}

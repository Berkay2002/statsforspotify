type RefreshedToken = { accessToken: string; refreshToken: string; expiresIn: number };

// Bounded process-local cache; callers still verify the user and connection on
// every request. Serverless restarts only cause an extra refresh.
export function createSpotifyTokenCache(now = Date.now) {
  const entries = new Map<string, { refreshToken: string; value: RefreshedToken; expiresAt: number }>();
  const pending = new Map<string, { refreshToken: string; promise: Promise<RefreshedToken> }>();
  return async (userId: string, refreshToken: string, refresh: () => Promise<RefreshedToken>, forceRefresh = false) => {
    const existing = entries.get(userId);
    if (!forceRefresh && existing?.refreshToken === refreshToken && existing.expiresAt > now() + 30_000) {
      return { ...existing.value, expiresIn: Math.floor((existing.expiresAt - now()) / 1000) };
    }
    const active = pending.get(userId);
    if (active?.refreshToken === refreshToken) return active.promise;
    const startedAt = now();
    const promise = refresh().then(value => {
      if (pending.get(userId)?.promise === promise) {
        for (const [key, entry] of entries) if (entry.expiresAt <= now()) entries.delete(key);
        if (entries.size >= 1000) entries.delete(entries.keys().next().value!);
        entries.set(userId, { refreshToken: value.refreshToken, value, expiresAt: startedAt + value.expiresIn * 1000 });
      }
      return value;
    }).finally(() => {
      if (pending.get(userId)?.promise === promise) pending.delete(userId);
    });
    pending.set(userId, { refreshToken, promise });
    return promise;
  };
}

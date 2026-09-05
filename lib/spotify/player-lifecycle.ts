const playerEvents = ["ready", "not_ready", "player_state_changed", "initialization_error", "authentication_error", "account_error", "playback_error"];

export function disconnectPlaybackPlayer(player: { removeListener(event: string): unknown; disconnect(): void }) {
  // Remove callbacks before disconnect so an old account cannot update state.
  for (const event of playerEvents) player.removeListener(event);
  player.disconnect();
}

export async function connectPlaybackPlayer(player: { connect(): Promise<boolean> }, signal: AbortSignal, timeoutMs = 15_000) {
  if (signal.aborted) throw signal.reason;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      player.connect(),
      new Promise<never>((_resolve, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        timeout = setTimeout(() => reject(new Error("Spotify player could not connect. Please try again.")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    if (abort) signal.removeEventListener("abort", abort);
  }
}

export function waitForPlaybackSdk(signal: AbortSignal, isReady: () => boolean, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    if (isReady()) { resolve(); return; }
    const finish = (error?: unknown) => {
      clearInterval(poll);
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve();
    };
    const abort = () => finish(signal.reason);
    const poll = setInterval(() => { if (isReady()) finish(); }, 100);
    const timeout = setTimeout(() => finish(new Error("Spotify player could not load. Please try again.")), timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
  });
}

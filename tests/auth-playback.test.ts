import { expect, test } from "bun:test";
import { connectPlaybackPlayer, disconnectPlaybackPlayer, waitForPlaybackSdk } from "../lib/spotify/player-lifecycle";

test("unmount cancels SDK initialization before a late script can connect", async () => {
  const controller = new AbortController();
  let checks = 0;
  const ready = waitForPlaybackSdk(controller.signal, () => { checks += 1; return false; });
  controller.abort();
  await expect(ready).rejects.toBeInstanceOf(DOMException);
  const checksAtAbort = checks;
  await Bun.sleep(130);
  expect(checks).toBe(checksAtAbort);
});

test("a blocked SDK fails instead of leaving initialization pending indefinitely", async () => {
  await expect(waitForPlaybackSdk(new AbortController().signal, () => false, 5)).rejects.toThrow("could not load");
});

test("a ready SDK can initialize without scheduling a wait", async () => {
  await expect(waitForPlaybackSdk(new AbortController().signal, () => true)).resolves.toBeUndefined();
});

test("disconnect removes old account callbacks before SDK disconnect events", () => {
  let staleUpdates = 0;
  const events = new Map(["ready", "not_ready", "player_state_changed", "initialization_error", "authentication_error", "account_error", "playback_error"].map(name => [name, () => { staleUpdates += 1; }]));
  let disconnected = false;
  disconnectPlaybackPlayer({
    removeListener(event) { events.delete(event); },
    disconnect() { for (const callback of events.values()) callback(); disconnected = true; },
  });
  expect(disconnected).toBe(true);
  expect(staleUpdates).toBe(0);
});

test("token or SDK connection stalls time out and signout cancels a pending connection", async () => {
  const stalled = { connect: () => new Promise<boolean>(() => {}) };
  await expect(connectPlaybackPlayer(stalled, new AbortController().signal, 5)).rejects.toThrow("could not connect");
  const controller = new AbortController();
  const pending = connectPlaybackPlayer(stalled, controller.signal);
  controller.abort();
  await expect(pending).rejects.toBeInstanceOf(DOMException);
});

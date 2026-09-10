import { test } from "node:test";
import assert from "node:assert/strict";
import { getProfileAvatarUpdate } from "./profile-avatar";

test("Spotify's current image takes precedence over stale identity data", () => {
  assert.equal(getProfileAvatarUpdate({ images: [{ url: "https://i.scdn.co/image/current", width: 640, height: 640 }] }, { picture: "https://i.scdn.co/image/stale" }), "https://i.scdn.co/image/current");
});

test("OAuth picture strings, legacy picture objects and avatar_url are supported", () => {
  const url = "https://i.scdn.co/image/avatar";
  for (const identity of [{ picture: url }, { picture: { url } }, { avatar_url: url }]) {
    assert.equal(getProfileAvatarUpdate(null, identity), url);
  }
});

test("failed profile fetch with missing identity artwork preserves a saved avatar", () => {
  for (const identity of [{}, { picture: null }, { picture: {} }, { picture: "" }, { picture: 42 }]) {
    assert.equal(getProfileAvatarUpdate(null, identity), undefined);
  }
});

test("a successful profile fetch with no images clears a removed Spotify avatar", () => {
  assert.equal(getProfileAvatarUpdate({ images: [] }, { picture: "https://i.scdn.co/image/removed" }), null);
});

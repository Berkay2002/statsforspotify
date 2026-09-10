import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeStatsOwner, comparisonFriends, StatsAccessError, type StatsAccessStore, type StatsAccessProfile, type StatsFriendship } from "./access";

const viewerId = "11111111-1111-4111-8111-111111111111";
const friendId = "22222222-2222-4222-8222-222222222222";
const friend: StatsAccessProfile = { userId: friendId, displayName: "Ludwig", discriminator: "7345", statsVisibility: "followers" };

function store(profile: StatsAccessProfile | null = friend, friendships: StatsFriendship[] = []): StatsAccessStore {
  return { getProfile: async () => profile, getFriendships: async () => friendships };
}

test("own history needs no friendship or public visibility", async () => {
  const result = await authorizeStatsOwner(viewerId, null, store({ ...friend, userId: viewerId, statsVisibility: "private" }));
  assert.equal(result.userId, viewerId);
});

test("accepted friendship permits either direction and returns stored identity", async () => {
  for (const [userId, otherId] of [[viewerId, friendId], [friendId, viewerId]]) {
    const result = await authorizeStatsOwner(viewerId, friendId, store(friend, [{ userId, friendId: otherId, status: "accepted" }]));
    assert.deepEqual(result, { userId: friendId, displayName: "Ludwig", discriminator: "7345" });
  }
});

test("private, missing, pending, blocked, and unrelated users share a denial", async () => {
  const cases = [
    store(null),
    store({ ...friend, statsVisibility: "private" }, [{ userId: viewerId, friendId, status: "accepted" }]),
    store(friend, [{ userId: viewerId, friendId, status: "pending" }]),
    store(friend, [{ userId: viewerId, friendId, status: "blocked" }]),
    store({ ...friend, statsVisibility: "public" }),
    store(friend, [{ userId: friendId, friendId: "33333333-3333-4333-8333-333333333333", status: "accepted" }]),
  ];
  for (const candidate of cases) {
    await assert.rejects(authorizeStatsOwner(viewerId, friendId, candidate), (error: unknown) =>
      error instanceof StatsAccessError && error.status === 403 && error.message === "These stats are unavailable");
  }
});

test("malformed targets fail before database reads", async () => {
  const unreachable: StatsAccessStore = { getProfile: async () => { throw new Error("must not read"); }, getFriendships: async () => [] };
  await assert.rejects(authorizeStatsOwner(viewerId, "bad,or=(user_id.eq.any)", unreachable), (error: unknown) => error instanceof StatsAccessError && error.status === 400);
});

test("comparison stays absent without own history and does not probe friends", async () => {
  const queried: string[] = [];
  assert.deepEqual(await comparisonFriends(viewerId, [friend], async (id) => { queried.push(id); return false; }), []);
  assert.deepEqual(queried, [viewerId]);
});

test("comparison requires visible friend history for the same requested item/range", async () => {
  const privateFriend = { ...friend, userId: "private", statsVisibility: "private" };
  const emptyFriend = { ...friend, userId: "empty" };
  const queried: string[] = [];
  const result = await comparisonFriends(viewerId, [friend, privateFriend, emptyFriend], async (id) => {
    queried.push(id);
    return id !== "empty";
  });
  assert.deepEqual(result.map((profile) => profile.userId), [friendId]);
  assert.deepEqual(queried, [viewerId, friendId, "empty"]);
});

test("database failures remain errors rather than empty history or forbidden", async () => {
  const failure = new Error("database unavailable");
  await assert.rejects(authorizeStatsOwner(viewerId, friendId, { getProfile: async () => { throw failure; }, getFriendships: async () => [] }), failure);
  await assert.rejects(comparisonFriends(viewerId, [friend], async () => { throw failure; }), failure);
});

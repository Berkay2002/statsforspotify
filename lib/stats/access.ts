export interface StatsProfile {
  userId: string;
  displayName: string;
  discriminator: string;
}

export interface StatsAccessProfile extends StatsProfile {
  statsVisibility: string;
}

export interface StatsFriendship {
  userId: string;
  friendId: string;
  status: string;
}

export interface StatsAccessStore {
  getProfile(userId: string): Promise<StatsAccessProfile | null>;
  getFriendships(viewerId: string): Promise<StatsFriendship[]>;
}

export class StatsAccessError extends Error {
  readonly status: 400 | 403;

  constructor(status: 400 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export function acceptedFriendIds(viewerId: string, friendships: StatsFriendship[]): string[] {
  return [...new Set(friendships.flatMap((friendship) => {
    if (friendship.status !== "accepted") return [];
    if (friendship.userId === viewerId) return [friendship.friendId];
    if (friendship.friendId === viewerId) return [friendship.userId];
    return [];
  }))].filter((id) => id !== viewerId);
}

export function isSharedStatsProfile(profile: StatsAccessProfile): boolean {
  return profile.statsVisibility === "public" || profile.statsVisibility === "followers";
}

export function publicStatsProfile(profile: StatsProfile): StatsProfile {
  return { userId: profile.userId, displayName: profile.displayName, discriminator: profile.discriminator };
}

export async function authorizeStatsOwner(
  viewerId: string,
  requestedUserId: string | null,
  store: StatsAccessStore,
): Promise<StatsProfile> {
  const ownerId = (requestedUserId ?? viewerId).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
    throw new StatsAccessError(400, "Invalid user_id");
  }
  const profile = await store.getProfile(ownerId);
  if (ownerId === viewerId) {
    return profile ? publicStatsProfile(profile) : { userId: viewerId, displayName: "You", discriminator: "" };
  }
  if (!profile || !isSharedStatsProfile(profile)) {
    throw new StatsAccessError(403, "These stats are unavailable");
  }
  const friendIds = acceptedFriendIds(viewerId, await store.getFriendships(viewerId));
  if (!friendIds.includes(ownerId)) {
    throw new StatsAccessError(403, "These stats are unavailable");
  }
  return publicStatsProfile(profile);
}

/** Eligibility requires history for this exact item and range on both sides. */
export async function comparisonFriends(
  viewerId: string,
  candidates: StatsAccessProfile[],
  hasHistory: (userId: string) => Promise<boolean>,
): Promise<StatsProfile[]> {
  if (!await hasHistory(viewerId)) return [];
  const friends: StatsProfile[] = [];
  // Sequential checks bound database concurrency even for large friend lists.
  for (const profile of candidates) {
    if (profile.userId !== viewerId && isSharedStatsProfile(profile) && await hasHistory(profile.userId)) {
      friends.push(publicStatsProfile(profile));
    }
  }
  return friends;
}

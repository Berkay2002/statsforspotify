import type { SpotifyUser } from "./types";

/** Undefined means that no reliable update is available; preserve the saved avatar. */
export function getProfileAvatarUpdate(
  profile: Pick<SpotifyUser, "images"> | null,
  identityData: Record<string, unknown>,
): string | null | undefined {
  if (profile) return profile.images[0]?.url ?? null;

  const picture = identityData.picture;
  if (typeof picture === "string" && picture) return picture;
  if (picture && typeof picture === "object" && "url" in picture && typeof picture.url === "string" && picture.url) {
    return picture.url;
  }
  if (typeof identityData.avatar_url === "string" && identityData.avatar_url) {
    return identityData.avatar_url;
  }
  return undefined;
}

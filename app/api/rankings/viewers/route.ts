import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, unauthorizedResponse, validateItemType, validateTimeRange } from "@/lib/api/utils";
import { acceptedFriendIds, authorizeStatsOwner, comparisonFriends, type StatsAccessProfile, type StatsProfile } from "@/lib/stats/access";
import { createStatsAccessStore, statsErrorResponse } from "@/lib/stats/server";

export interface StatsViewersResponse {
  viewer: StatsProfile;
  owner: StatsProfile;
  friends: StatsProfile[];
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser();
    if (!auth) return unauthorizedResponse();
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const id = params.get("id");
    const timeRange = params.get("time_range") ?? "medium_term";
    if (!validateItemType(type) || !id || !validateTimeRange(timeRange)) {
      return badRequestResponse("Invalid type, id, or time_range");
    }
    const { user, supabase } = auth;
    const store = createStatsAccessStore(supabase);
    const owner = await authorizeStatsOwner(user.id, params.get("user_id"), store);
    const viewer = owner.userId === user.id ? owner : await authorizeStatsOwner(user.id, null, store);
    const hasHistory = async (userId: string) => {
      const { data, error } = await supabase.rpc("get_ranking_history", {
        p_user_id: userId,
        p_entity_id: id,
        p_entity_type: type,
        p_time_range: timeRange,
        p_limit: 1,
      });
      if (error) throw error;
      return Boolean(data?.length);
    };
    const candidates: StatsAccessProfile[] = [];
    // Avoid retrieving friends' history when the viewer has nothing to compare.
    const viewerHasHistory = await hasHistory(user.id);
    if (viewerHasHistory) {
      const friendIds = acceptedFriendIds(user.id, await store.getFriendships(user.id));
      for (const friendId of friendIds) {
        const profile = await store.getProfile(friendId);
        if (profile) candidates.push(profile);
      }
    }
    const friends = viewerHasHistory
      ? await comparisonFriends(user.id, candidates, (userId) => userId === user.id ? Promise.resolve(true) : hasHistory(userId))
      : [];
    const response: StatsViewersResponse = { viewer, owner, friends };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return statsErrorResponse(error);
  }
}

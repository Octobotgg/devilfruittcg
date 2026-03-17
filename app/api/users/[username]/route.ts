import { NextRequest, NextResponse } from "next/server";
import {
  getFollowCountsSupabase,
  getUserProfileByUsernameSupabase,
  getUserProfileSummarySupabase,
  isUserFollowingSupabase,
  listFeaturedProfileDecksSupabase,
  listPublicProfileDecksSupabase,
  listUserProfileActivitiesSupabase,
} from "@/lib/profile-store";
import { deriveProfileBadges } from "@/lib/profile-types";
import { requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { username: rawUsername } = await ctx.params;
  const username = String(rawUsername || "").trim().toLowerCase();
  const profile = await getUserProfileByUsernameSupabase(username);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (profile.profileVisibility === "private") {
    return NextResponse.json(
      {
        profile: {
          displayName: profile.displayName,
          username: profile.username,
        profileVisibility: "private",
      },
      featuredDecks: [],
      publicDecks: [],
      private: true,
    },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  let viewerId: string | null = null;
  try {
    viewerId = (await requireAuthenticatedUser(req)).id;
  } catch {
    viewerId = null;
  }

  const summary = await getUserProfileSummarySupabase(profile.userId);
  const { followerCount, followingCount } = await getFollowCountsSupabase(profile.userId);

  return NextResponse.json(
    {
      profile,
      summary,
      featuredDecks: await listFeaturedProfileDecksSupabase(profile.userId),
      publicDecks: await listPublicProfileDecksSupabase(profile.userId),
      activities: profile.showActivity
        ? await listUserProfileActivitiesSupabase(profile.userId, { limit: 20, publicOnly: true })
        : [],
      followerCount,
      followingCount,
      isFollowing: viewerId ? await isUserFollowingSupabase(viewerId, profile.userId) : false,
      badges: summary ? deriveProfileBadges(summary) : [],
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

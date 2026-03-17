import { NextRequest, NextResponse } from "next/server";
import {
  addUserProfileActivitySupabase,
  getFollowCountsSupabase,
  getUserProfileRecord,
  getUserProfileByUsernameSupabase,
  isUserFollowingSupabase,
  setUserFollowStateSupabase,
  upsertUserProfileRecord,
} from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{
    username: string;
  }>;
};

async function resolveTarget(ctx: RouteCtx) {
  const { username: rawUsername } = await ctx.params;
  return await getUserProfileByUsernameSupabase(String(rawUsername || "").trim().toLowerCase());
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  let viewerId = "";
  let viewerEmail: string | null = null;
  try {
    ({ id: viewerId, email: viewerEmail } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error);
  }

  if (!(await getUserProfileRecord(viewerId))) {
    await upsertUserProfileRecord({ userId: viewerId, email: viewerEmail });
  }

  const target = await resolveTarget(ctx);
  if (!target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      isFollowing: await isUserFollowingSupabase(viewerId, target.userId),
      ...(await getFollowCountsSupabase(target.userId)),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  let viewerId = "";
  let viewerEmail: string | null = null;
  try {
    ({ id: viewerId, email: viewerEmail } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error);
  }

  if (!(await getUserProfileRecord(viewerId))) {
    await upsertUserProfileRecord({ userId: viewerId, email: viewerEmail });
  }

  const target = await resolveTarget(ctx);
  if (!target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (!(await setUserFollowStateSupabase(viewerId, target.userId, true))) {
    return NextResponse.json({ error: "Could not follow this user" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  void addUserProfileActivitySupabase({
    userId: viewerId,
    kind: "followed_user",
    title: `Followed @${target.username || "pirate"}`,
    detail: `Started following ${target.displayName}.`,
    publicVisible: false,
    dedupeKey: `follow:${target.userId}`,
  });

  return NextResponse.json(
    {
      ok: true,
      isFollowing: true,
      ...(await getFollowCountsSupabase(target.userId)),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  let viewerId = "";
  let viewerEmail: string | null = null;
  try {
    ({ id: viewerId, email: viewerEmail } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error);
  }

  if (!(await getUserProfileRecord(viewerId))) {
    await upsertUserProfileRecord({ userId: viewerId, email: viewerEmail });
  }

  const target = await resolveTarget(ctx);
  if (!target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (!(await setUserFollowStateSupabase(viewerId, target.userId, false))) {
    return NextResponse.json({ error: "Could not unfollow this user" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    {
      ok: true,
      isFollowing: false,
      ...(await getFollowCountsSupabase(target.userId)),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getCollectionCompareDataSupabase, getUserProfileByUsernameSupabase } from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  let viewerId = "";
  try {
    ({ id: viewerId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error);
  }

  const { username: rawUsername } = await ctx.params;
  const profile = await getUserProfileByUsernameSupabase(String(rawUsername || "").trim().toLowerCase());
  if (!profile || profile.profileVisibility === "private") {
    return NextResponse.json({ error: "Profile not available" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const compare = await getCollectionCompareDataSupabase(viewerId, profile.userId);

  return NextResponse.json(
    compare,
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

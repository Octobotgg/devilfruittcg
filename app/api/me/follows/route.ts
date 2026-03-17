import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { getFollowCountsSupabase, listFollowersSupabase, listFollowingSupabase } from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:follows",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimit.headers });
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  const counts = await getFollowCountsSupabase(userId);

  return NextResponse.json(
    {
      ...counts,
      followers: await listFollowersSupabase(userId, 40),
      following: await listFollowingSupabase(userId, 40),
    },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import {
  addUserProfileActivitySupabase,
  getUserProfileSummarySupabase,
  getUserProfileRecord,
  upsertUserProfileSummarySupabase,
  upsertUserProfileRecord,
} from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";
import { deriveProfileBadges, type ProfileSummary } from "@/lib/profile-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:profile:sync",
    max: 30,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimit.headers });
  }

  let userId = "";
  let email: string | null = null;
  try {
    ({ id: userId, email } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  if (!(await getUserProfileRecord(userId))) {
    await upsertUserProfileRecord({ userId, email });
  }

  try {
    const body = (await req.json()) as { summary?: Partial<ProfileSummary> };
    const previous = await getUserProfileSummarySupabase(userId);
    const next = await upsertUserProfileSummarySupabase(userId, body.summary || {});

    if (!next) {
      return NextResponse.json({ error: "Could not sync profile summary" }, { status: 500, headers: rateLimit.headers });
    }

    const previousBadges = new Set((previous ? deriveProfileBadges(previous) : []).map((badge) => badge.id));
    const nextBadges = deriveProfileBadges(next);
    nextBadges
      .filter((badge) => !previousBadges.has(badge.id))
      .forEach((badge) => {
        void addUserProfileActivitySupabase({
          userId,
          kind: "badge_earned",
          title: `Earned ${badge.label}`,
          detail: badge.description,
          publicVisible: true,
          dedupeKey: `badge:${badge.id}`,
        });
      });

    const previousCompleted = new Set(previous?.completedSetCodes || []);
    next.completedSetCodes
      .filter((code) => !previousCompleted.has(code))
      .forEach((setCode) => {
        void addUserProfileActivitySupabase({
          userId,
          kind: "set_completed",
          title: `Completed ${setCode}`,
          detail: `${setCode} collection reached 100%.`,
          publicVisible: true,
          dedupeKey: `set:${setCode}`,
        });
      });

    return NextResponse.json(
      {
        ok: true,
        summary: next,
        badges: nextBadges,
      },
      {
        status: 200,
        headers: {
          ...rateLimit.headers,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(error) },
      { status: 400, headers: rateLimit.headers },
    );
  }
}

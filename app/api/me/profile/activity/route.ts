import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import {
  addUserProfileActivitySupabase,
  getUserProfileRecord,
  listUserProfileActivitiesSupabase,
  upsertUserProfileRecord,
} from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";
import type { ProfileActivityKind } from "@/lib/profile-types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:profile:activity",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
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

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 40)));

  return NextResponse.json(
    { activities: await listUserProfileActivitiesSupabase(userId, { limit }) },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:profile:activity:write",
    max: 40,
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
    const body = (await req.json()) as {
      kind?: ProfileActivityKind;
      title?: string;
      detail?: string;
      cardId?: string | null;
      deckId?: string | null;
      publicVisible?: boolean;
      dedupeKey?: string | null;
    };

    if (!body.kind || !body.title || !body.detail) {
      return NextResponse.json({ error: "kind, title, and detail are required" }, { status: 400, headers: rateLimit.headers });
    }

    const activity = await addUserProfileActivitySupabase({
      userId,
      kind: body.kind,
      title: body.title,
      detail: body.detail,
      cardId: body.cardId,
      deckId: body.deckId,
      publicVisible: body.publicVisible,
      dedupeKey: body.dedupeKey,
    });

    return NextResponse.json(
      { ok: true, activity },
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

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { deleteWatchlistItem, listUserWatchlist, upsertWatchlistItem } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:watchlist",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for watchlist endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const items = listUserWatchlist(userId);

  return NextResponse.json(
    { userId, count: items.length, items },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:watchlist:write",
    max: 40,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for watchlist write endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  try {
    const body = (await req.json()) as {
      cardId?: string;
      variantKey?: string;
      alertPercent?: number | null;
      targetPrice?: number | null;
      enabled?: boolean;
    };

    const cardId = String(body.cardId || "").trim();
    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400, headers: rateLimit.headers });
    }

    const item = upsertWatchlistItem({
      userId,
      cardId,
      variantKey: body.variantKey,
      alertPercent: body.alertPercent,
      targetPrice: body.targetPrice,
      enabled: body.enabled,
    });

    if (!item) {
      return NextResponse.json({ error: "Could not save watchlist item" }, { status: 400, headers: rateLimit.headers });
    }

    return NextResponse.json(
      { ok: true, userId, item },
      {
        status: 200,
        headers: {
          ...rateLimit.headers,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(error) },
      { status: 400, headers: rateLimit.headers }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:watchlist:delete",
    max: 24,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for watchlist delete endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const watchId = req.nextUrl.searchParams.get("watchId") || req.nextUrl.searchParams.get("id") || "";

  if (!watchId.trim()) {
    return NextResponse.json({ error: "watchId is required" }, { status: 400, headers: rateLimit.headers });
  }

  const deleted = deleteWatchlistItem(userId, watchId.trim());
  if (!deleted) {
    return NextResponse.json({ error: "Watchlist item not found" }, { status: 404, headers: rateLimit.headers });
  }

  return NextResponse.json(
    { ok: true, userId, watchId: watchId.trim() },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    }
  );
}

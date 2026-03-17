import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { listUserHoldings, upsertUserHolding } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:holdings",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for holdings endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const holdings = listUserHoldings(userId);

  return NextResponse.json(
    {
      userId,
      count: holdings.length,
      holdings,
    },
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
    key: "api:me:holdings:write",
    max: 30,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for holdings write endpoint" },
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
      holdingId?: string;
      cardId?: string;
      variantKey?: string;
      quantity?: number;
      language?: string;
      conditionLabel?: string;
      gradeLabel?: string | null;
      avgBuyPrice?: number | null;
      avgSellPrice?: number | null;
      notes?: string | null;
    };

    const cardId = String(body.cardId || "").trim();
    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400, headers: rateLimit.headers });
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity)) {
      return NextResponse.json({ error: "quantity is required" }, { status: 400, headers: rateLimit.headers });
    }

    const holding = upsertUserHolding({
      userId,
      holdingId: body.holdingId,
      cardId,
      variantKey: body.variantKey,
      quantity,
      language: body.language,
      conditionLabel: body.conditionLabel,
      gradeLabel: body.gradeLabel,
      avgBuyPrice: body.avgBuyPrice,
      avgSellPrice: body.avgSellPrice,
      notes: body.notes,
    });

    if (!holding) {
      return NextResponse.json({ error: "Could not save holding" }, { status: 400, headers: rateLimit.headers });
    }

    return NextResponse.json(
      {
        ok: true,
        userId,
        holding,
      },
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

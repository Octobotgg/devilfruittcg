import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { addUserTransaction, listUserTransactions } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:transactions",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for transactions endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const limit = Math.min(300, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 100)));
  const items = listUserTransactions(userId, limit);

  return NextResponse.json(
    {
      userId,
      count: items.length,
      transactions: items,
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
    key: "api:me:transactions:write",
    max: 40,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for transaction write endpoint" },
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
      holdingId?: string | null;
      cardId?: string;
      variantKey?: string;
      txnType?: "buy" | "sell" | "adjust";
      quantity?: number;
      unitPrice?: number | null;
      fees?: number | null;
      occurredAt?: number;
      note?: string | null;
    };

    const cardId = String(body.cardId || "").trim();
    if (!cardId) {
      return NextResponse.json({ error: "cardId is required" }, { status: 400, headers: rateLimit.headers });
    }

    const txnType = body.txnType;
    if (!txnType || !["buy", "sell", "adjust"].includes(txnType)) {
      return NextResponse.json({ error: "txnType must be buy, sell, or adjust" }, { status: 400, headers: rateLimit.headers });
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || Math.trunc(quantity) === 0) {
      return NextResponse.json({ error: "quantity must be a non-zero integer" }, { status: 400, headers: rateLimit.headers });
    }

    const txn = addUserTransaction({
      userId,
      holdingId: body.holdingId,
      cardId,
      variantKey: body.variantKey,
      txnType,
      quantity,
      unitPrice: body.unitPrice,
      fees: body.fees,
      occurredAt: body.occurredAt,
      note: body.note,
    });

    if (!txn) {
      return NextResponse.json({ error: "Could not save transaction" }, { status: 400, headers: rateLimit.headers });
    }

    return NextResponse.json(
      { ok: true, userId, transaction: txn },
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

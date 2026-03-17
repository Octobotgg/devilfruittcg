import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { getCachedWithMeta, listUserHoldings } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type CachedMarketPayload = {
  ebay?: { averagePrice?: number };
  tcgplayer?: { market?: number | null };
};

function inferMarkPrice(cached: CachedMarketPayload | null, avgBuyPrice: number | null): number {
  const tcg = cached?.tcgplayer?.market;
  if (typeof tcg === "number" && Number.isFinite(tcg) && tcg > 0) return tcg;

  const ebay = cached?.ebay?.averagePrice;
  if (typeof ebay === "number" && Number.isFinite(ebay) && ebay > 0) return ebay;

  if (typeof avgBuyPrice === "number" && Number.isFinite(avgBuyPrice) && avgBuyPrice > 0) return avgBuyPrice;

  return 0;
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:movers",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for portfolio movers endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 6)));
  const holdings = listUserHoldings(userId);

  const rows = holdings.map((h) => {
    const cached = getCachedWithMeta<CachedMarketPayload>(h.cardId);
    const markPrice = inferMarkPrice(cached?.data || null, h.avgBuyPrice);
    const costBasis = (typeof h.avgBuyPrice === "number" ? h.avgBuyPrice : 0) * h.quantity;
    const marketValue = markPrice * h.quantity;
    const pnl = marketValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    return {
      holdingId: h.holdingId,
      cardId: h.cardId,
      variantKey: h.variantKey,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      markPrice,
      costBasis,
      marketValue,
      pnl,
      pnlPercent,
    };
  });

  const gainers = [...rows].sort((a, b) => b.pnlPercent - a.pnlPercent).slice(0, limit);
  const losers = [...rows].sort((a, b) => a.pnlPercent - b.pnlPercent).slice(0, limit);

  return NextResponse.json(
    {
      userId,
      gainers,
      losers,
      generatedAt: new Date().toISOString(),
      source: {
        provider: "DevilFruit portfolio engine",
        feeds: ["user_holdings", "price_cache"],
      },
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

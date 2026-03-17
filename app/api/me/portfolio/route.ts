import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { getCachedWithMeta, listUserHoldings } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type CachedMarketPayload = {
  ebay?: { averagePrice?: number };
  tcgplayer?: { market?: number | null };
  lastUpdated?: string;
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
    key: "api:me:portfolio",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for portfolio endpoint" },
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

  const positions = holdings.map((h) => {
    const cached = getCachedWithMeta<CachedMarketPayload>(h.cardId);
    const markPrice = inferMarkPrice(cached?.data || null, h.avgBuyPrice);
    const costBasisPerCard = typeof h.avgBuyPrice === "number" && Number.isFinite(h.avgBuyPrice) ? h.avgBuyPrice : 0;
    const quantity = Math.max(0, Number(h.quantity) || 0);

    const marketValue = markPrice * quantity;
    const costBasis = costBasisPerCard * quantity;
    const pnl = marketValue - costBasis;

    return {
      holdingId: h.holdingId,
      cardId: h.cardId,
      variantKey: h.variantKey,
      quantity,
      language: h.language,
      conditionLabel: h.conditionLabel,
      gradeLabel: h.gradeLabel,
      avgBuyPrice: h.avgBuyPrice,
      markPrice,
      marketValue,
      costBasis,
      pnl,
      freshness: {
        updatedAt: cached ? new Date(cached.updatedAt).toISOString() : null,
        staleAgeMs: cached?.ageMs ?? null,
      },
    };
  });

  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPnl = totalValue - totalCostBasis;
  const livePricedCount = positions.filter((p) => p.markPrice > 0).length;

  return NextResponse.json(
    {
      userId,
      summary: {
        holdings: positions.length,
        livePricedHoldings: livePricedCount,
        totalValue,
        totalCostBasis,
        totalPnl,
      },
      positions,
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

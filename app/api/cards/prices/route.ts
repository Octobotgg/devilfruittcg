import { NextRequest, NextResponse } from "next/server";
import type { Card } from "@/lib/cards";
import { getCachedMarketSummaries } from "@/lib/db";
import { getOfficialCardById } from "@/lib/official-cards";

const MOCK_PRICE_BY_RARITY: Record<string, number> = {
  C: 0.25,
  UC: 0.6,
  R: 1.5,
  SR: 5.5,
  SEC: 14,
  L: 4.25,
  P: 3.75,
  TR: 18,
  "SP CARD": 24,
};

const MOCK_PRICE_BY_TYPE: Record<string, number> = {
  Leader: 0.75,
  Character: 0.35,
  Event: 0.15,
  Stage: 0.25,
};

function normalizeIds(idsParam: string) {
  return Array.from(
    new Set(
      idsParam
        .split(",")
        .map((id) => id.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function buildMockPrice(card: Card | undefined) {
  if (!card) return 0;

  const base = MOCK_PRICE_BY_RARITY[String(card.baseRarity || card.rarity || "").toUpperCase()] ?? 1.25;
  const typeBump = MOCK_PRICE_BY_TYPE[card.type] ?? 0.2;
  const costBump = Math.max(0, (typeof card.cost === "number" ? card.cost : 0) - 1) * 0.2;
  const counterBump = card.counter === 2000 ? 0.3 : card.counter === 1000 ? 0.15 : 0;
  const promoBump = card.setCode === "P" ? 0.75 : 0;

  return Number(Math.max(0.25, base + typeBump + costBump + counterBump + promoBump).toFixed(2));
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = normalizeIds(idsParam);

  if (!ids.length) {
    return NextResponse.json({ error: "ids are required" }, { status: 400 });
  }

  const cached = getCachedMarketSummaries(ids);
  const results = ids.map((cardId) => {
    const market = cached[cardId];
    const marketPrice = market?.marketPrice ?? null;
    const card = getOfficialCardById(cardId);
    const estimatedPrice = typeof marketPrice === "number" ? marketPrice : buildMockPrice(card);

    return {
      cardId,
      marketPrice,
      estimatedPrice,
      source: typeof marketPrice === "number" ? "market_cache" : "mock",
      stale: market?.stale ?? false,
      updatedAt: market ? new Date(market.updatedAt).toISOString() : null,
    };
  });

  return NextResponse.json(
    {
      total: results.length,
      note: "Card records do not include native pricing. Cached market prices are used when available, with a deterministic placeholder estimate as fallback.",
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

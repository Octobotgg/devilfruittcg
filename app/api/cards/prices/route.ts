import { NextRequest, NextResponse } from "next/server";
import { toCardPriceQuote } from "@/lib/card-price-quotes";
import { normalizePricingLookupId } from "@/lib/deck-pricing";
import { getCardPrintRuntimePrices } from "@/lib/server/pricing/published-card-prices";

function normalizeIds(idsParam: string) {
  return Array.from(
    new Set(
      idsParam
        .split(",")
        .map((id) => normalizePricingLookupId(id))
        .filter(Boolean),
    ),
  );
}

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const ids = normalizeIds(idsParam);

  if (!ids.length) {
    return NextResponse.json({ error: "ids are required" }, { status: 400 });
  }

  const runtimePrices = await getCardPrintRuntimePrices(ids);
  const results = ids.map((cardId) => toCardPriceQuote(cardId, runtimePrices.get(cardId) || {
    status: "unpriced",
    kind: "raw_card",
    cardPrintId: cardId,
    reason: "missing_active_approved_mapping",
    currency: "USD",
  }));

  return NextResponse.json(
    {
      total: results.length,
      note: "Published marketplace pricing for the exact requested card print. Unpriced rows are returned explicitly and excluded from higher-level totals.",
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

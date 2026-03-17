import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/db";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  const range = (req.nextUrl.searchParams.get("range") || "30d").trim();

  if (!id) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  const days = RANGE_DAYS[range] ?? 30;
  const rows = getPriceHistory(id, days);
  const lastTs = rows.length ? rows[rows.length - 1].ts : null;
  const staleThresholdMs = 30 * 60 * 1000;
  const staleAgeMs = lastTs ? Math.max(0, Date.now() - lastTs) : null;

  return NextResponse.json({
    cardId: id,
    range,
    points: rows.map((r) => ({
      ts: r.ts,
      date: new Date(r.ts).toISOString().slice(0, 10),
      ebayAvg: r.ebay_avg,
      tcgMarket: r.tcg_market,
    })),
    source: {
      provider: "DevilFruit cache",
      feed: "price_history",
    },
    freshness: {
      updatedAt: lastTs ? new Date(lastTs).toISOString() : null,
      stale: lastTs ? staleAgeMs! > staleThresholdMs : true,
      staleAgeMs,
      staleThresholdMs,
    },
  });
}

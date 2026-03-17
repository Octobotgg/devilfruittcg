import { NextRequest, NextResponse } from "next/server";
import { getJustTcgPriceDetail, getJustTcgPriceSummaries } from "@/lib/justtcg-store";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

function parseIds(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim().toUpperCase();
  const ids = (req.nextUrl.searchParams.get("ids") || "").trim();
  const range = (req.nextUrl.searchParams.get("range") || "30d").trim();
  const rangeDays = RANGE_DAYS[range] ?? 30;

  try {
    if (ids) {
      const requestedIds = parseIds(ids).slice(0, 200);
      if (!requestedIds.length) {
        return NextResponse.json({ error: "ids param required" }, { status: 400 });
      }

      const results = await getJustTcgPriceSummaries(requestedIds);
      return NextResponse.json(
        {
          ids: requestedIds,
          results,
          source: {
            provider: "JustTCG cache",
          },
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (!id) {
      return NextResponse.json({ error: "id or ids param required" }, { status: 400 });
    }

    const detail = await getJustTcgPriceDetail(id, rangeDays);
    return NextResponse.json(
      {
        cardId: id,
        range,
        price: detail.price,
        points: detail.points,
        source: {
          provider: "JustTCG cache",
        },
        freshness: {
          updatedAt: detail.price?.updatedAt || detail.price?.fetchedAt || null,
          stale: detail.price?.stale ?? true,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load cached TCG price",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

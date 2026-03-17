import { NextRequest, NextResponse } from "next/server";
import { searchMarketCatalog } from "@/lib/market-catalog";

function parseListParam(params: URLSearchParams, key: string) {
  return Array.from(
    new Set(
      params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function parseNumberParam(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q") || params.get("card") || "";

  const result = searchMarketCatalog({
    q,
    sets: parseListParam(params, "set"),
    types: parseListParam(params, "type"),
    colors: parseListParam(params, "color"),
    rarities: parseListParam(params, "rarity"),
    counters: parseListParam(params, "counter")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value)),
    attributes: parseListParam(params, "attribute"),
    costMin: parseNumberParam(params, "costMin"),
    costMax: parseNumberParam(params, "costMax"),
    lifeMin: parseNumberParam(params, "lifeMin"),
    lifeMax: parseNumberParam(params, "lifeMax"),
    powerMin: parseNumberParam(params, "powerMin"),
    powerMax: parseNumberParam(params, "powerMax"),
    priceMin: parseNumberParam(params, "priceMin"),
    priceMax: parseNumberParam(params, "priceMax"),
    sort: (params.get("sort") || undefined) as Parameters<typeof searchMarketCatalog>[0]["sort"],
    page: parseNumberParam(params, "page"),
    pageSize: parseNumberParam(params, "pageSize"),
  });

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

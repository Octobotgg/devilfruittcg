import { NextRequest, NextResponse } from "next/server";
import { searchMarketCatalog } from "@/lib/market-catalog";
import { marketUrlStateToCatalogQuery, parseMarketUrlState } from "@/lib/market-query";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = parseMarketUrlState(params, { allowAnyPageSize: true });
  const includeMetadata = params.get("includeMetadata") !== "0";

  const result = await searchMarketCatalog(marketUrlStateToCatalogQuery(state, { includeMetadata }));

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

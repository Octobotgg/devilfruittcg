import { NextRequest, NextResponse } from "next/server";
import { loadMarketCatalogSnapshot, searchMarketCatalog } from "@/lib/market-catalog";
import { marketUrlStateToCatalogQuery, parseMarketUrlState } from "@/lib/market-query";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const includeMetadata = params.get("includeMetadata") !== "0";

  if (params.get("snapshot") === "1") {
    const snapshot = await loadMarketCatalogSnapshot({ includeMetadata });

    return NextResponse.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  }

  const state = parseMarketUrlState(params, { allowAnyPageSize: true });
  const result = await searchMarketCatalog(marketUrlStateToCatalogQuery(state, { includeMetadata }));

  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

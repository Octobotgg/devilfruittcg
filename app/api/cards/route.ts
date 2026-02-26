import { NextRequest, NextResponse } from "next/server";
import { filterCards, loadCards } from "@/lib/card-feed";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q") || "";
  const set = params.get("set") || undefined;
  const color = params.get("color") || undefined;
  const rarity = params.get("rarity") || undefined;
  const costMin = params.get("costMin") ? Number(params.get("costMin")) : undefined;
  const costMax = params.get("costMax") ? Number(params.get("costMax")) : undefined;
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : 40;

  const all = await loadCards();
  const result = filterCards(all, { q, set, color, rarity, costMin, costMax, page, pageSize });
  return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
}

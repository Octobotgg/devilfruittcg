import { NextRequest, NextResponse } from "next/server";
import { OFFICIAL_BASE_CARDS, getOfficialCardsByIds, searchOfficialCards } from "@/lib/official-cards";
import type { Card } from "@/lib/cards";

function filterCards(cards: Card[], params: {
  set?: string;
  color?: string;
  rarity?: string;
  costMin?: number;
  costMax?: number;
}) {
  return cards.filter((card) => {
    if (params.set && card.setCode.toLowerCase() !== params.set.toLowerCase()) return false;
    if (params.color && !card.color.toLowerCase().includes(params.color.toLowerCase())) return false;
    if (params.rarity && card.rarity.toLowerCase() !== params.rarity.toLowerCase()) return false;
    if (params.costMin !== undefined && (card.cost ?? -1) < params.costMin) return false;
    if (params.costMax !== undefined && (card.cost ?? Number.MAX_SAFE_INTEGER) > params.costMax) return false;
    return true;
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const idsParam = params.get("ids") || "";
  const q = params.get("q") || "";
  const set = params.get("set") || undefined;
  const color = params.get("color") || undefined;
  const rarity = params.get("rarity") || undefined;
  const costMin = params.get("costMin") ? Number(params.get("costMin")) : undefined;
  const costMax = params.get("costMax") ? Number(params.get("costMax")) : undefined;
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const pageSize = params.get("pageSize") ? Number(params.get("pageSize")) : 40;
  const includeVariants = params.get("includeVariants") === "true";

  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const results = getOfficialCardsByIds(ids);

    return NextResponse.json(
      {
        total: results.length,
        page: 1,
        pageSize: results.length,
        results,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const source = q.trim()
    ? searchOfficialCards(q, { includeVariants })
    : OFFICIAL_BASE_CARDS;

  const filtered = filterCards(source, { set, color, rarity, costMin, costMax });
  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const results = filtered.slice(start, start + pageSize);

  return NextResponse.json(
    {
      total,
      page,
      pageSize,
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { filterCards, loadCards } from "@/lib/card-feed";
import { fetchLimitlessVariantsById } from "@/lib/sources/limitless";

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

  // If exact card-id query, enrich with Limitless variants (alt arts/prints)
  const qTrim = q.trim().toUpperCase();
  if (/^[A-Z0-9]{2,5}-\d{3}$/.test(qTrim)) {
    try {
      const variants = await fetchLimitlessVariantsById(qTrim);
      if (variants.length) {
        const merged = [...variants, ...result.results];
        const seen = new Set<string>();
        const deduped = merged.filter((c) => {
          const key = `${c.id}|${c.name}|${c.setCode}|${c.number}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return NextResponse.json(
          {
            ...result,
            total: Math.max(result.total, deduped.length),
            results: deduped.slice(0, pageSize),
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }
    } catch {
      // ignore and return base result
    }
  }

  return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
}

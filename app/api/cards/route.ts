import { NextRequest, NextResponse } from "next/server";
import { filterCards, loadCards } from "@/lib/card-feed";
import { deriveCardVariantInfo } from "@/lib/card-variants";
import { fetchLimitlessVariantsById } from "@/lib/sources/limitless";

function isEnglishCardName(name: string): boolean {
  if (!name) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  return !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(name);
}

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

  const baseResults = result.results
    .filter((c) => (c.language ? c.language === "EN" : isEnglishCardName(c.name)))
    .map((c) => ({
      ...c,
      ...deriveCardVariantInfo(c),
    }));

  // If exact card-id query, enrich with extra variants.
  const qTrim = q.trim().toUpperCase();
  if (/^[A-Z0-9]{2,5}-\d{3}$/.test(qTrim)) {
    try {
      const variants = (await fetchLimitlessVariantsById(qTrim))
        .filter((c) => isEnglishCardName(c.name))
        .map((c) => ({
          ...c,
          ...deriveCardVariantInfo(c),
          language: "EN" as const,
        }));

      if (variants.length) {
        const merged = [...variants, ...baseResults];
        const seen = new Set<string>();
        const deduped = merged.filter((c) => {
          const key = `${c.id}|${c.name}|${c.setCode}|${c.number}|${c.canonicalVariantId || ""}`;
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

  return NextResponse.json(
    {
      ...result,
      results: baseResults,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

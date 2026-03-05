import { NextRequest, NextResponse } from "next/server";
import { loadCards } from "@/lib/card-feed";
import { deriveCardVariantInfo, getBaseCardId } from "@/lib/card-variants";

function isEnglishCard(name: string): boolean {
  if (!name) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  // reject Japanese/CJK scripts
  return !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(name);
}

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return NextResponse.json({ variants: [] }, { status: 200 });

  const baseId = getBaseCardId(id).toUpperCase();

  const cards = await loadCards();
  const variants = cards
    .filter((c) => getBaseCardId(c.id).toUpperCase() === baseId)
    .filter((c) => (c.language ? c.language === "EN" : isEnglishCard(c.name)))
    .map((c) => {
      const info = deriveCardVariantInfo(c);
      return {
        ...c,
        ...info,
      };
    })
    .sort((a, b) => {
      const av = a.variantOrder ?? 999;
      const bv = b.variantOrder ?? 999;
      if (av !== bv) return av - bv;
      if ((a.number || "") !== (b.number || "")) return String(a.number || "").localeCompare(String(b.number || ""));
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

  return NextResponse.json(
    {
      baseId,
      variants,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

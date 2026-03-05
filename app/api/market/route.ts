import { NextRequest, NextResponse } from "next/server";
import { fetchEbaySales } from "@/lib/ebay";
import { getCached, setCache } from "@/lib/db";
import { searchCards } from "@/lib/cards";
import { filterCards, loadCards } from "@/lib/card-feed";

export async function GET(req: NextRequest) {
  const cardParam = req.nextUrl.searchParams.get("card") || "";
  const idParam = req.nextUrl.searchParams.get("id") || "";

  if (!cardParam && !idParam) {
    return NextResponse.json({ error: "card or id param required" }, { status: 400 });
  }

  // Find card (prefer full feed so new sets/promos are searchable, fallback to local seeds)
  let cardName = cardParam;
  let cardId = idParam;
  let cardInfo:
    | {
        id: string;
        name: string;
        rarity?: string;
        baseCardId?: string;
        variantType?: "base" | "alt_art" | "sp" | "manga" | "manga_red" | "manga_gold" | "anniversary";
        variantLabel?: string;
        canonicalVariantId?: string;
      }
    | undefined;

  if (!cardName || !cardId) {
    try {
      const all = await loadCards();
      const q = (cardParam || cardId || "").trim();
      const qUpper = q.toUpperCase();
      const byId = all.find((c) => c.id.toUpperCase() === qUpper);
      const fromFeed = byId ?? filterCards(all, { q, pageSize: 1 }).results[0];

      if (fromFeed) {
        cardName = fromFeed.name;
        cardId = fromFeed.id;
        cardInfo = {
          id: fromFeed.id,
          name: fromFeed.name,
          rarity: fromFeed.rarity,
          baseCardId: fromFeed.baseCardId,
          variantType: fromFeed.variantType,
          variantLabel: fromFeed.variantLabel,
          canonicalVariantId: fromFeed.canonicalVariantId,
        };
      }
    } catch {
      // fallback to local static set search
      const results = searchCards(cardParam || cardId);
      if (results.length > 0) {
        cardName = results[0].name;
        cardId = results[0].id;
        cardInfo = {
          id: results[0].id,
          name: results[0].name,
          rarity: results[0].rarity,
          baseCardId: results[0].baseCardId,
          variantType: results[0].variantType,
          variantLabel: results[0].variantLabel,
          canonicalVariantId: results[0].canonicalVariantId,
        };
      }
    }
  }

  if (!cardId || !cardName) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Check cache
  const cached = getCached(cardId);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // Fetch fresh data
  try {
    const data = await fetchEbaySales(cardName, cardId, cardInfo);
    setCache(cardId, cardName, data);
    return NextResponse.json({ ...data, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch market data", detail: String(err) },
      { status: 500 }
    );
  }
}

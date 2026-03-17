import { NextRequest, NextResponse } from "next/server";
import { fetchEbaySales } from "@/lib/ebay";
import { getCachedWithMeta, setCache } from "@/lib/db";
import { checkRateLimit } from "@/lib/abuse-protection";
import { getOfficialCardById, searchOfficialCards } from "@/lib/official-cards";

const MARKET_STALE_THRESHOLD_MS = 30 * 60 * 1000;

function buildFreshness(updatedAtMs: number) {
  const ageMs = Math.max(0, Date.now() - updatedAtMs);
  return {
    updatedAt: new Date(updatedAtMs).toISOString(),
    stale: ageMs > MARKET_STALE_THRESHOLD_MS,
    staleAgeMs: ageMs,
    staleThresholdMs: MARKET_STALE_THRESHOLD_MS,
  };
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:market",
    max: 45,
    windowMs: 60_000,
    blockMs: 5 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for market endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const withRateHeaders = (response: NextResponse) => {
    for (const [k, v] of Object.entries(rateLimit.headers)) response.headers.set(k, v);
    return response;
  };

  const cardParam = req.nextUrl.searchParams.get("card") || "";
  const idParam = req.nextUrl.searchParams.get("id") || "";

  if (!cardParam && !idParam) {
    return withRateHeaders(NextResponse.json({ error: "card or id param required" }, { status: 400 }));
  }

  // Resolve card from the canonical official catalog only.
  let cardName = cardParam;
  let cardId = idParam;
  let cardInfo:
    | {
        id: string;
        name: string;
        rarity?: string;
        baseCardId?: string;
        variantType?: "base" | "parallel" | "alt_art" | "sp" | "manga" | "manga_red" | "manga_gold" | "anniversary";
        variantLabel?: string;
        canonicalVariantId?: string;
      }
    | undefined;

  if (!cardName || !cardId) {
    const q = (cardParam || cardId || "").trim();
    const exact = getOfficialCardById(q);
    const match = exact || searchOfficialCards(q, { includeVariants: true })[0];

    if (match) {
      cardName = match.name;
      cardId = match.id;
      cardInfo = {
        id: match.id,
        name: match.name,
        rarity: match.rarity,
        baseCardId: match.baseCardId,
        variantType: match.variantType,
        variantLabel: match.variantLabel,
        canonicalVariantId: match.canonicalVariantId,
      };
    }
  }

  if (!cardId || !cardName) {
    return withRateHeaders(NextResponse.json({ error: "Card not found" }, { status: 404 }));
  }

  // Check cache
  const cached = getCachedWithMeta<{
    lastUpdated?: string;
    ebay?: { source?: "completed" | "active" | "mock" };
    [key: string]: unknown;
  }>(cardId);

  if (cached) {
    const payload = cached.data;
    const payloadUpdatedAtMs = payload?.lastUpdated ? Date.parse(payload.lastUpdated) : NaN;
    const updatedAtMs = Number.isFinite(payloadUpdatedAtMs) ? payloadUpdatedAtMs : cached.updatedAt;

    return withRateHeaders(
      NextResponse.json({
        ...payload,
        cached: true,
        source: {
          provider: "eBay + TCGPlayer",
          ebayMode: payload?.ebay?.source || "unknown",
          details: {
            ebay: "https://api.ebay.com",
            tcgplayer: "market proxy",
          },
        },
        freshness: buildFreshness(updatedAtMs),
      })
    );
  }

  // Fetch fresh data
  try {
    const data = await fetchEbaySales(cardName, cardId, cardInfo);
    setCache(cardId, cardName, data);

    const updatedAtMs = Number.isFinite(Date.parse(data.lastUpdated))
      ? Date.parse(data.lastUpdated)
      : Date.now();

    return withRateHeaders(
      NextResponse.json({
        ...data,
        cached: false,
        source: {
          provider: "eBay + TCGPlayer",
          ebayMode: data.ebay.source,
          details: {
            ebay: "https://api.ebay.com",
            tcgplayer: "market proxy",
          },
        },
        freshness: buildFreshness(updatedAtMs),
      })
    );
  } catch (err) {
    return withRateHeaders(
      NextResponse.json(
        {
          error: "Failed to fetch market data",
          detail: String(err),
          source: {
            provider: "eBay + TCGPlayer",
            details: {
              ebay: "https://api.ebay.com",
              tcgplayer: "market proxy",
            },
          },
          freshness: {
            updatedAt: null,
            stale: true,
            staleAgeMs: null,
            staleThresholdMs: MARKET_STALE_THRESHOLD_MS,
          },
        },
        { status: 500 }
      )
    );
  }
}

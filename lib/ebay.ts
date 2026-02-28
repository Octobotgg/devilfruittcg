export interface EbaySale {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  condition: string;
  url: string;
  image?: string;
  confidence?: number;
  sourceType?: "completed" | "active" | "mock";
}

export interface MarketData {
  cardName: string;
  cardId: string;
  ebay: {
    sales: EbaySale[];
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
    saleCount: number;
    qualityConfidence: number;
    filteredOut: number;
    source: "completed" | "active" | "mock";
  };
  tcgplayer: {
    low: number | null;
    mid: number | null;
    high: number | null;
    market: number | null;
  };
  trend: {
    direction: "up" | "down" | "flat";
    percent: number;
  };
  lastUpdated: string;
}

async function getEbayToken(): Promise<string> {
  const clientId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CERT_ID;

  if (!clientId || !clientSecret) {
    throw new Error("eBay credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });

  if (!res.ok) throw new Error(`eBay token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function isLikelyEnglish(title: string): boolean {
  // Reject titles with heavy CJK/Kana usage (commonly JP/CN listings for this niche)
  const cjkKana = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
  const match = title.match(cjkKana) || [];
  return match.length <= 2;
}

function listingLooksLikeSingleCard(titleNorm: string): boolean {
  const banned = [
    "booster box",
    "case break",
    "starter deck",
    "deck box",
    "playmat",
    "sleeves",
    "binder",
    "proxy",
    "custom card",
    "fan art",
    "digital",
    "lot of",
    "bundle",
    "psa slab lot",
    "grading service",
  ];

  return !banned.some((phrase) => titleNorm.includes(phrase));
}

function normalizeCondition(raw: string): string {
  const c = normalize(raw);
  if (!c || c === "unknown") return "Unknown";
  if (c.includes("near mint") || c === "nm" || c.includes("nm m")) return "Near Mint";
  if (c.includes("lightly played") || c === "lp") return "Lightly Played";
  if (c.includes("moderately played") || c === "mp") return "Moderately Played";
  if (c.includes("heavily played") || c === "hp") return "Heavily Played";
  if (c.includes("damaged")) return "Damaged";
  return raw;
}

function scoreListing(title: string, cardName: string, cardId: string, price: number): number {
  const t = normalize(title);
  const cardNameNorm = normalize(cardName);
  const cardIdNorm = normalize(cardId);

  let score = 0;

  if (t.includes("one piece")) score += 0.15;
  if (t.includes("tcg")) score += 0.1;
  if (t.includes(cardIdNorm)) score += 0.35;

  const nameTokens = cardNameNorm.split(" ").filter((x) => x.length > 2);
  const tokenHits = nameTokens.filter((tk) => t.includes(tk)).length;
  if (nameTokens.length) {
    score += Math.min(0.25, (tokenHits / nameTokens.length) * 0.25);
  }

  if (t.includes("alt art") || t.includes("aa")) score += 0.05;
  if (t.includes("japanese") || t.includes("jp ver") || t.includes("chinese")) score -= 0.4;
  if (!isLikelyEnglish(title)) score -= 0.35;
  if (!listingLooksLikeSingleCard(t)) score -= 0.5;

  // Basic outlier guardrails for single-card comps
  if (price <= 0.99 || price > 2000) score -= 0.4;

  return Math.max(0, Math.min(1, score));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function trimPriceOutliersByIqr(candidates: EbaySale[]): EbaySale[] {
  if (candidates.length < 4) return candidates;
  const prices = candidates.map((c) => c.price).sort((a, b) => a - b);
  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return candidates;

  const lower = Math.max(0, q1 - 1.5 * iqr);
  const upper = q3 + 1.5 * iqr;
  const trimmed = candidates.filter((c) => c.price >= lower && c.price <= upper);

  // Avoid over-trimming thin samples
  return trimmed.length >= 3 ? trimmed : candidates;
}

function detectVariantSignals(text: string): { manga: boolean; altArt: boolean; sp: boolean } {
  const t = normalize(text);
  return {
    manga: /\bmanga\b/.test(t),
    altArt: /\balt\s*art\b|\baa\b/.test(t),
    sp: /\bsp\b|special/.test(t),
  };
}

function variantMatchScore(title: string, cardName: string, cardId: string): number {
  const wanted = detectVariantSignals(`${cardName} ${cardId}`);
  const got = detectVariantSignals(title);

  let score = 0;
  if (wanted.manga && got.manga) score += 0.2;
  if (wanted.altArt && got.altArt) score += 0.15;
  if (wanted.sp && got.sp) score += 0.12;

  if (wanted.manga && !got.manga) score -= 0.3;
  if (wanted.altArt && !got.altArt) score -= 0.2;
  if (wanted.sp && !got.sp) score -= 0.15;

  // If query is base print and listing screams premium variant, lightly penalize to reduce mixing
  if (!wanted.manga && got.manga) score -= 0.1;

  return score;
}

async function fetchCompletedSalesViaFinding(cardName: string, cardId: string): Promise<EbaySale[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  const keywords = encodeURIComponent(`One Piece TCG ${cardName} ${cardId}`);
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${encodeURIComponent(appId)}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${keywords}&categoryId=2536&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&itemFilter(1).name=Condition&itemFilter(1).value=1000&sortOrder=EndTimeSoonest&paginationInput.entriesPerPage=30`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  const items =
    data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

  const parsed: EbaySale[] = items.map((item: Record<string, unknown>) => {
    const title = String((item.title as string[] | undefined)?.[0] || "");
    const price = parseFloat(
      String(
        (item.sellingStatus as Record<string, unknown>[] | undefined)?.[0]?.currentPrice &&
          ((item.sellingStatus as Record<string, unknown>[])[0].currentPrice as Record<string, string>[])[0]?.__value__
      ) || "0"
    );

    const confidence = Math.max(0, Math.min(1, scoreListing(title, cardName, cardId, price) + variantMatchScore(title, cardName, cardId)));

    return {
      title,
      price,
      currency:
        ((item.sellingStatus as Record<string, unknown>[] | undefined)?.[0]?.currentPrice as Record<string, string>[] | undefined)?.[0]?.["@currencyId"] ||
        "USD",
      soldDate: String((item.listingInfo as Record<string, string>[] | undefined)?.[0]?.endTime || new Date().toISOString()).split("T")[0],
      condition: normalizeCondition(String((item.condition as Record<string, string>[] | undefined)?.[0]?.conditionDisplayName || "Unknown")),
      url: String((item.viewItemURL as string[] | undefined)?.[0] || ""),
      image: String((item.galleryURL as string[] | undefined)?.[0] || ""),
      confidence,
      sourceType: "completed",
    };
  });

  return parsed.filter((p) => p.price > 0);
}

export async function fetchEbaySales(cardName: string, cardId: string): Promise<MarketData> {
  let sales: EbaySale[] = [];
  let filteredOut = 0;
  let source: "completed" | "active" | "mock" = "completed";

  try {
    // Prefer sold/completed data path first (true comps)
    let candidates: EbaySale[] = await fetchCompletedSalesViaFinding(cardName, cardId);

    // If completed path is thin/unavailable, backfill with Browse API results
    if (candidates.length < 5) {
      const token = await getEbayToken();
      const query = encodeURIComponent(`One Piece TCG ${cardName} ${cardId}`);

      const res = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&filter=buyingOptions%3A%7BFIXED_PRICE%7D,conditions%3A%7BNEW%7D&category_ids=2536&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const browseCandidates: EbaySale[] = (data.itemSummaries || []).map((item: Record<string, unknown>) => {
          const title = (item.title as string) || "";
          const price = parseFloat((item.price as Record<string, string>)?.value || "0");
          const confidence = Math.max(0, Math.min(1, scoreListing(title, cardName, cardId, price) + variantMatchScore(title, cardName, cardId)));

          return {
            title,
            price,
            currency: (item.price as Record<string, string>)?.currency || "USD",
            soldDate: new Date().toISOString().split("T")[0],
            condition: normalizeCondition((item.condition as string) || "Unknown"),
            url: (item.itemWebUrl as string) || "",
            image: ((item.thumbnailImages as Record<string, string>[])?.[0] || (item.image as Record<string, string>))?.imageUrl,
            confidence,
            sourceType: "active",
          } satisfies EbaySale;
        });

        candidates = [...candidates, ...browseCandidates];
      }
    }

    const deduped = Array.from(
      new Map(candidates.filter((c) => c.url).map((c) => [c.url, c])).values()
    );

    const completedCount = deduped.filter((c) => c.sourceType === "completed").length;
    source = completedCount > 0 ? "completed" : "active";

    const qualityKept = deduped.filter((c) => c.confidence !== undefined && c.confidence >= 0.45);
    const outlierTrimmed = trimPriceOutliersByIqr(qualityKept);
    const kept = outlierTrimmed.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 5);

    filteredOut = Math.max(0, deduped.length - kept.length);
    sales = kept;
  } catch (err) {
    console.error("eBay fetch error:", err);
  }

  // Use mock data if no real data or API not configured
  if (sales.length === 0) {
    sales = getMockSales(cardName, cardId);
    source = "mock";
  }

  const prices = sales.map((s) => s.price).filter((p) => p > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const qualityConfidence = sales.length
    ? sales.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / sales.length
    : 0.5;

  // Mock TCGPlayer data (replace with real API when key is available)
  const tcgMock = getMockTCGPlayer(avg);

  return {
    cardName,
    cardId,
    ebay: {
      sales,
      averagePrice: parseFloat(avg.toFixed(2)),
      lowestPrice: parseFloat(low.toFixed(2)),
      highestPrice: parseFloat(high.toFixed(2)),
      saleCount: sales.length,
      qualityConfidence: parseFloat(qualityConfidence.toFixed(2)),
      filteredOut,
      source,
    },
    tcgplayer: tcgMock,
    trend: {
      direction: Math.random() > 0.5 ? "up" : "down",
      percent: parseFloat((Math.random() * 15).toFixed(1)),
    },
    lastUpdated: new Date().toISOString(),
  };
}

function getMockSales(cardName: string, cardId: string): EbaySale[] {
  const basePrice = getBasePrice(cardId);
  const dates = ["2025-02-24", "2025-02-23", "2025-02-22", "2025-02-21", "2025-02-20"];
  return dates.map((date, i) => ({
    title: `One Piece TCG ${cardName} ${cardId} NM/M`,
    price: parseFloat((basePrice * (0.85 + Math.random() * 0.3)).toFixed(2)),
    currency: "USD",
    soldDate: date,
    condition: i % 3 === 0 ? "Near Mint" : i % 3 === 1 ? "Lightly Played" : "Near Mint",
    url: `https://www.ebay.com/sch/i.html?_nkw=one+piece+tcg+${encodeURIComponent(cardName)}`,
    confidence: 0.75,
    sourceType: "mock",
  }));
}

function getBasePrice(cardId: string): number {
  const rareCards: Record<string, number> = {
    "OP05-001": 85,
    "OP07-001": 120,
    "OP08-001": 95,
    "OP04-001": 45,
    "OP01-001": 35,
    "OP05-002": 55,
    "OP02-001": 28,
    "OP04-002": 40,
  };
  return rareCards[cardId] || 5 + Math.random() * 20;
}

function getMockTCGPlayer(avg: number) {
  if (!avg) return { low: null, mid: null, high: null, market: null };
  return {
    low: parseFloat((avg * 0.8).toFixed(2)),
    mid: parseFloat((avg * 1.0).toFixed(2)),
    high: parseFloat((avg * 1.25).toFixed(2)),
    market: parseFloat((avg * 0.95).toFixed(2)),
  };
}

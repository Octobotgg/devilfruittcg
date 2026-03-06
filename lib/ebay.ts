import { deriveCardVariantInfo, type EnVariantType } from "@/lib/card-variants";
import type { Card } from "@/lib/cards";

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
    queryTemplate?: {
      query: string;
      searchUrl: string;
      variantLabel: string;
      variantType: EnVariantType;
      language: "EN";
      excludedSignals: string[];
    };
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

export type EbayCardInput = Pick<Card, "id" | "name" | "rarity"> & {
  baseCardId?: string;
  variantType?: EnVariantType;
  variantLabel?: string;
  canonicalVariantId?: string;
  language?: "EN";
};

type VariantTemplate = {
  baseCardId: string;
  baseName: string;
  baseRarity: string;
  variantType: EnVariantType;
  variantLabel: string;
  query: string;
  searchUrl: string;
  mustMatchAny: RegExp[];
  mustNotMatch: RegExp[];
  excludedSignals: string[];
};

const COMMON_EXCLUSION_WORDS = [
  "PSA",
  "BGS",
  "CGC",
  "SGC",
  "graded",
  "slab",
  "proxy",
  "custom",
  "orica",
  "playmat",
  "sleeves",
  "starter deck",
  "booster box",
  "lot",
  "bundle",
  "japanese",
  "jp",
  "chinese",
  "korean",
];

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

function stripVariantWords(name: string): string {
  return name
    .replace(/\b(alt\s*art|manga|red\s*manga|gold\s*manga|anniversary|\bsp\b|special)\b/gi, " ")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyEnglish(title: string): boolean {
  const cjkKana = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
  const match = title.match(cjkKana) || [];
  return match.length <= 1;
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
    "playset",
    "set of",
    "x4",
    "4x",
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

function buildVariantTemplate(input: EbayCardInput): VariantTemplate {
  const info = deriveCardVariantInfo({ id: input.id, name: input.name, rarity: input.rarity || "" });
  const variantType = input.variantType || info.variantType;
  const variantLabel = input.variantLabel || info.variantLabel;
  const baseCardId = input.baseCardId || info.baseCardId;
  const baseRarity = info.baseRarity;
  const baseName = stripVariantWords(input.name) || input.name;

  const queryParts = ["One Piece TCG", baseCardId, baseName];
  if (variantType === "base" && ["SR", "SEC"].includes(baseRarity)) {
    queryParts.push(baseRarity);
  }
  const mustMatchAny: RegExp[] = [];
  const mustNotMatch: RegExp[] = [
    /\b(psa|bgs|cgc|sgc|graded|grading|slab|beckett|hga)\b/i,
    /\b(japanese|jp\b|chinese|korean)\b/i,
    /\b(proxy|custom|orica)\b/i,
  ];

  const excludedSignals = [...COMMON_EXCLUSION_WORDS];

  switch (variantType) {
    case "alt_art":
      queryParts.push('"Alt Art"');
      mustMatchAny.push(/\balt\s*art\b/i, /\baa\b/i, /\bparallel\b/i);
      mustNotMatch.push(/\bmanga\b/i, /\banniversary\b/i);
      excludedSignals.push("manga", "anniversary");
      break;
    case "sp":
      queryParts.push("SP");
      mustMatchAny.push(/\bsp\b/i, /\bspecial\b/i);
      mustNotMatch.push(/\bmanga\b/i, /\balt\s*art\b/i);
      excludedSignals.push("manga", "alt art");
      break;
    case "manga":
      queryParts.push("Manga");
      mustMatchAny.push(/\bmanga\b/i);
      mustNotMatch.push(/\bred\s*manga\b/i, /\bgold\s*manga\b/i);
      excludedSignals.push("red manga", "gold manga");
      break;
    case "manga_red":
      queryParts.push('"Red Manga"');
      mustMatchAny.push(/\bred\s*manga\b/i);
      mustNotMatch.push(/\bgold\s*manga\b/i);
      excludedSignals.push("gold manga");
      break;
    case "manga_gold":
      queryParts.push('"Gold Manga"');
      mustMatchAny.push(/\bgold\s*manga\b/i);
      mustNotMatch.push(/\bred\s*manga\b/i);
      excludedSignals.push("red manga");
      break;
    case "anniversary":
      queryParts.push("Anniversary");
      mustMatchAny.push(/\banniversary\b/i);
      mustNotMatch.push(/\bmanga\b/i);
      excludedSignals.push("manga");
      break;
    case "base":
    default:
      // Base print should avoid premium variants.
      mustNotMatch.push(/\balt\s*art\b/i, /\baa\b/i, /\bsp\b/i, /\bmanga\b/i, /\banniversary\b/i, /\bparallel\b/i);
      excludedSignals.push("alt art", "aa", "sp", "manga", "anniversary", "parallel");
      break;
  }

  // eBay Finding query string (negative keywords included directly)
  const query = [
    ...queryParts,
    ...["-PSA", "-BGS", "-CGC", "-SGC", "-graded", "-slab", "-japanese", "-jp", "-proxy", "-custom", "-orica", "-lot", "-bundle"],
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=0&LH_Sold=1&LH_Complete=1`;

  return {
    baseCardId,
    baseName,
    baseRarity,
    variantType,
    variantLabel,
    query,
    searchUrl,
    mustMatchAny,
    mustNotMatch,
    excludedSignals,
  };
}

function matchesTemplate(title: string, template: VariantTemplate): boolean {
  const tNorm = normalize(title);

  if (!listingLooksLikeSingleCard(tNorm)) return false;
  if (!isLikelyEnglish(title)) return false;

  // Must include card id or enough name tokens.
  const hasId = tNorm.includes(template.baseCardId.toLowerCase());
  const tokens = normalize(template.baseName)
    .split(" ")
    .filter((x) => x.length > 2 && !["one", "piece", "tcg", "card"].includes(x));
  const tokenHits = tokens.filter((tk) => tNorm.includes(tk)).length;
  const hasNameSignal = tokens.length ? tokenHits >= Math.min(2, tokens.length) : false;
  if (!hasId && !hasNameSignal) return false;

  if (template.mustNotMatch.some((rx) => rx.test(title))) return false;
  if (template.mustMatchAny.length && !template.mustMatchAny.some((rx) => rx.test(title))) return false;

  return true;
}

function scoreListing(title: string, cardName: string, template: VariantTemplate, price: number): number {
  const t = normalize(title);
  const cardNameNorm = normalize(cardName);
  const cardIdNorm = normalize(template.baseCardId);

  let score = 0;

  if (t.includes("one piece")) score += 0.15;
  if (t.includes("tcg")) score += 0.1;
  if (t.includes(cardIdNorm)) score += 0.35;

  const nameTokens = cardNameNorm.split(" ").filter((x) => x.length > 2);
  const tokenHits = nameTokens.filter((tk) => t.includes(tk)).length;
  if (nameTokens.length) {
    score += Math.min(0.25, (tokenHits / nameTokens.length) * 0.25);
  }

  if (template.mustMatchAny.length && template.mustMatchAny.some((rx) => rx.test(title))) score += 0.15;
  if (template.mustNotMatch.some((rx) => rx.test(title))) score -= 0.6;

  if (!isLikelyEnglish(title)) score -= 0.35;
  if (!listingLooksLikeSingleCard(t)) score -= 0.5;

  // Outlier guardrails for single-card comps
  if (price <= 0.99 || price > 5000) score -= 0.4;

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

  return trimmed.length >= 3 ? trimmed : candidates;
}

async function fetchCompletedSalesViaFinding(template: VariantTemplate, cardName: string): Promise<EbaySale[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  const keywords = encodeURIComponent(template.query);
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${encodeURIComponent(appId)}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${keywords}&categoryId=2536&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&sortOrder=EndTimeSoonest&paginationInput.entriesPerPage=60`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

  const parsed: EbaySale[] = items.map((item: Record<string, unknown>) => {
    const title = String((item.title as string[] | undefined)?.[0] || "");
    const price = parseFloat(
      String(
        (item.sellingStatus as Record<string, unknown>[] | undefined)?.[0]?.currentPrice &&
          ((item.sellingStatus as Record<string, unknown>[])[0].currentPrice as Record<string, string>[])[0]?.__value__
      ) || "0"
    );

    const confidence = Math.max(0, Math.min(1, scoreListing(title, cardName, template, price)));

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

export async function fetchEbaySales(cardName: string, cardId: string, cardInput?: Partial<EbayCardInput>): Promise<MarketData> {
  const input: EbayCardInput = {
    id: cardId,
    name: cardName,
    rarity: cardInput?.rarity || "",
    baseCardId: cardInput?.baseCardId,
    variantType: cardInput?.variantType,
    variantLabel: cardInput?.variantLabel,
    canonicalVariantId: cardInput?.canonicalVariantId,
    language: "EN",
  };

  const template = buildVariantTemplate(input);

  let sales: EbaySale[] = [];
  let filteredOut = 0;
  let source: "completed" | "active" | "mock" = "completed";

  try {
    let candidates: EbaySale[] = await fetchCompletedSalesViaFinding(template, cardName);

    if (candidates.length < 6) {
      const token = await getEbayToken();
      const query = encodeURIComponent(template.query);

      const res = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&filter=buyingOptions%3A%7BFIXED_PRICE%7D&category_ids=2536&limit=30`,
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
          const confidence = Math.max(0, Math.min(1, scoreListing(title, cardName, template, price)));

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

    const deduped = Array.from(new Map(candidates.filter((c) => c.url).map((c) => [c.url, c])).values());

    const strict = deduped.filter((c) => matchesTemplate(c.title, template));
    const completedCount = strict.filter((c) => c.sourceType === "completed").length;
    source = completedCount > 0 ? "completed" : strict.some((c) => c.sourceType === "active") ? "active" : "mock";

    const qualityKept = strict.filter((c) => c.confidence !== undefined && c.confidence >= 0.42);
    const basePool = qualityKept.length >= 2 ? qualityKept : strict;
    const outlierTrimmed = trimPriceOutliersByIqr(basePool);
    const kept = outlierTrimmed.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 8);

    filteredOut = Math.max(0, deduped.length - kept.length);
    sales = kept;
  } catch (err) {
    console.error("eBay fetch error:", err);
  }

  // If no reliable real data, return mock skeleton (temporary fallback until phase 3 strict no-data mode).
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
      queryTemplate: {
        query: template.query,
        searchUrl: template.searchUrl,
        variantLabel: template.variantLabel,
        variantType: template.variantType,
        language: "EN",
        excludedSignals: template.excludedSignals,
      },
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
  const dates = ["2026-03-04", "2026-03-03", "2026-03-02", "2026-03-01", "2026-02-28"];
  return dates.map((date, i) => ({
    title: `One Piece TCG ${cardName} ${cardId} NM/M`,
    price: parseFloat((basePrice * (0.88 + Math.random() * 0.24)).toFixed(2)),
    currency: "USD",
    soldDate: date,
    condition: i % 3 === 0 ? "Near Mint" : i % 3 === 1 ? "Lightly Played" : "Near Mint",
    url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`one piece tcg ${cardName} ${cardId}`)}`,
    confidence: 0.45,
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

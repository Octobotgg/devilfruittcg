export interface EbaySale {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  condition: string;
  url: string;
  image?: string;
  confidence?: number;
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

type EbayTokenCache = { token: string; expiresAtMs: number };
let tokenCache: EbayTokenCache | null = null;

const EBAY_ENV = (process.env.EBAY_ENV || "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
const EBAY_BASE = EBAY_ENV === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const EBAY_FINDING_BASE = EBAY_ENV === "sandbox"
  ? "https://svcs.sandbox.ebay.com/services/search/FindingService/v1"
  : "https://svcs.ebay.com/services/search/FindingService/v1";

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
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

function isLikelyEnglish(title: string): boolean {
  const cjkKana = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
  const match = title.match(cjkKana) || [];
  return match.length <= 2;
}

function listingLooksLikeSingleCard(titleNorm: string): boolean {
  const banned = [
    "booster box", "case break", "starter deck", "deck box", "playmat", "sleeves",
    "binder", "proxy", "custom card", "fan art", "digital", "lot of", "bundle",
    "psa slab lot", "grading service",
  ];
  return !banned.some((phrase) => titleNorm.includes(phrase));
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
  if (!wanted.manga && got.manga) score -= 0.1;
  return score;
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
  if (nameTokens.length) score += Math.min(0.25, (tokenHits / nameTokens.length) * 0.25);
  if (t.includes("japanese") || t.includes("jp ver") || t.includes("chinese")) score -= 0.4;
  if (!isLikelyEnglish(title)) score -= 0.35;
  if (!listingLooksLikeSingleCard(t)) score -= 0.5;
  if (price <= 0.99 || price > 2000) score -= 0.4;
  return Math.max(0, Math.min(1, score + variantMatchScore(title, cardName, cardId)));
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
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

function requireAppId(): string {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) throw new Error("Missing EBAY_APP_ID");
  return appId;
}

async function getEbayToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CERT_ID;
  if (!clientId || !clientSecret) {
    throw new Error("Missing EBAY_APP_ID or EBAY_CERT_ID");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const scope = encodeURIComponent("https://api.ebay.com/oauth/api_scope");

  const res = await fetch(`${EBAY_BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${scope}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = Math.max(300, data.expires_in || 7200);
  tokenCache = {
    token: data.access_token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };

  return data.access_token;
}

async function fetchCompletedSales(cardName: string, cardId: string): Promise<EbaySale[]> {
  const appId = requireAppId();
  const keywords = encodeURIComponent(`One Piece TCG ${cardName} ${cardId}`);

  const url = `${EBAY_FINDING_BASE}?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${encodeURIComponent(appId)}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD=true&GLOBAL-ID=EBAY-US&keywords=${keywords}&categoryId=2536&paginationInput.entriesPerPage=12&sortOrder=EndTimeSoonest&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true&itemFilter(1).name=ListingType&itemFilter(1).value(0)=FixedPrice&itemFilter(1).value(1)=AuctionWithBIN`;

  const res = await fetch(url, {
    headers: { "X-EBAY-SOA-SECURITY-APPNAME": appId },
  });

  if (!res.ok) {
    throw new Error(`eBay completed lookup failed (${res.status})`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const root = json.findCompletedItemsResponse as Array<Record<string, unknown>> | undefined;
  const first = root?.[0] || {};
  const searchResultArr = first.searchResult as Array<Record<string, unknown>> | undefined;
  const searchResult = searchResultArr?.[0] || {};
  const items = (searchResult.item as Array<Record<string, unknown>> | undefined) || [];

  return items.slice(0, 5).map((item) => {
    const sellingStatus = (item.sellingStatus as Array<Record<string, unknown>> | undefined)?.[0] || {};
    const currentPrice = (sellingStatus.currentPrice as Array<Record<string, string>> | undefined)?.[0] || {};
    const listingInfo = (item.listingInfo as Array<Record<string, string>> | undefined)?.[0] || {};
    const condition = (item.condition as Array<Record<string, unknown>> | undefined)?.[0] || {};

    const price = Number(currentPrice.__value__ || 0);
    const currency = String(currentPrice["@currencyId"] || "USD");
    const soldDateRaw = String(listingInfo.endTime || new Date().toISOString());

    const confidence = scoreListing(String((item.title as string[] | undefined)?.[0] || `${cardName} ${cardId}`), cardName, cardId, Number.isFinite(price) ? price : 0);

    return {
      title: String((item.title as string[] | undefined)?.[0] || `${cardName} ${cardId}`),
      price: Number.isFinite(price) ? price : 0,
      currency,
      soldDate: soldDateRaw.slice(0, 10),
      condition: normalizeCondition(String((condition.conditionDisplayName as string[] | undefined)?.[0] || "Unknown")),
      url: String((item.viewItemURL as string[] | undefined)?.[0] || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardName + " " + cardId)}`),
      image: String((item.galleryURL as string[] | undefined)?.[0] || ""),
      confidence,
    } satisfies EbaySale;
  }).filter((x) => x.price > 0);
}

async function fetchActiveListings(cardName: string, cardId: string): Promise<EbaySale[]> {
  const token = await getEbayToken();
  const query = encodeURIComponent(`One Piece TCG ${cardName} ${cardId}`);
  const url = `${EBAY_BASE}/buy/browse/v1/item_summary/search?q=${query}&category_ids=2536&limit=10&sort=newlyListed`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE_ID,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay active search failed (${res.status}): ${text.slice(0, 220)}`);
  }

  const data = (await res.json()) as { itemSummaries?: Array<Record<string, unknown>> };
  const summaries = data.itemSummaries || [];

  return summaries.slice(0, 5).map((item) => {
    const priceObj = (item.price as Record<string, string> | undefined) || {};
    const rawPrice = Number(priceObj.value || 0);
    const title = String(item.title || `${cardName} ${cardId}`);
    const confidence = scoreListing(title, cardName, cardId, Number.isFinite(rawPrice) ? rawPrice : 0);
    return {
      title,
      price: Number.isFinite(rawPrice) ? rawPrice : 0,
      currency: String(priceObj.currency || "USD"),
      soldDate: new Date().toISOString().slice(0, 10),
      condition: normalizeCondition(String(item.condition || "Unknown")),
      url: String(item.itemWebUrl || `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cardName + " " + cardId)}`),
      image: String(((item.thumbnailImages as Array<Record<string, string>> | undefined)?.[0]?.imageUrl) || ((item.image as Record<string, string> | undefined)?.imageUrl) || ""),
      confidence,
    } satisfies EbaySale;
  }).filter((x) => x.price > 0);
}

export async function fetchEbaySales(cardName: string, cardId: string): Promise<MarketData> {
  let sales: EbaySale[] = [];
  let source: MarketData["ebay"]["source"] = "mock";

  try {
    sales = await fetchCompletedSales(cardName, cardId);
    if (sales.length > 0) source = "completed";
  } catch (err) {
    console.warn("Completed sales lookup failed:", err);
  }

  if (sales.length === 0) {
    try {
      sales = await fetchActiveListings(cardName, cardId);
      if (sales.length > 0) source = "active";
    } catch (err) {
      console.warn("Active listing lookup failed:", err);
    }
  }

  if (sales.length === 0) {
    sales = getMockSales(cardName, cardId);
    source = "mock";
  }

  const deduped = Array.from(new Map(sales.filter((s) => s.url).map((s) => [s.url, s])).values());
  const qualityKept = deduped.filter((s) => (s.confidence ?? 0) >= 0.45);
  const cleaned = trimPriceOutliersByIqr(qualityKept).slice(0, 5);
  const finalSales = cleaned.length > 0 ? cleaned : sales;

  const prices = finalSales.map((s) => s.price).filter((p) => p > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const qualityConfidence = finalSales.length
    ? finalSales.reduce((sum, s) => sum + (s.confidence ?? 0.5), 0) / finalSales.length
    : 0.5;
  const filteredOut = Math.max(0, deduped.length - finalSales.length);

  const tcg = getMockTCGPlayer(avg);
  const trend = deriveTrend(avg, tcg.market);

  return {
    cardName,
    cardId,
    ebay: {
      sales: finalSales,
      averagePrice: Number(avg.toFixed(2)),
      lowestPrice: Number(low.toFixed(2)),
      highestPrice: Number(high.toFixed(2)),
      saleCount: finalSales.length,
      qualityConfidence: Number(qualityConfidence.toFixed(2)),
      filteredOut,
      source,
    },
    tcgplayer: tcg,
    trend,
    lastUpdated: new Date().toISOString(),
  };
}

function deriveTrend(ebayAvg: number, tcgMarket: number | null): MarketData["trend"] {
  if (!tcgMarket || tcgMarket <= 0 || ebayAvg <= 0) return { direction: "flat", percent: 0 };
  const diff = ((ebayAvg - tcgMarket) / tcgMarket) * 100;
  if (Math.abs(diff) < 1.5) return { direction: "flat", percent: Number(Math.abs(diff).toFixed(1)) };
  return { direction: diff > 0 ? "up" : "down", percent: Number(Math.abs(diff).toFixed(1)) };
}

function getMockSales(cardName: string, cardId: string): EbaySale[] {
  const basePrice = getBasePrice(cardId);
  const dates = ["2026-02-26", "2026-02-25", "2026-02-24", "2026-02-23", "2026-02-22"];
  return dates.map((date, i) => ({
    title: `One Piece TCG ${cardName} ${cardId} NM/M`,
    price: Number((basePrice * (0.9 + i * 0.03)).toFixed(2)),
    currency: "USD",
    soldDate: date,
    condition: i % 2 === 0 ? "Near Mint" : "Lightly Played",
    url: `https://www.ebay.com/sch/i.html?_nkw=one+piece+tcg+${encodeURIComponent(cardName)}`,
    confidence: 0.75,
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
  return rareCards[cardId] || 8 + Math.random() * 22;
}

function getMockTCGPlayer(avg: number) {
  if (!avg) return { low: null, mid: null, high: null, market: null };
  return {
    low: Number((avg * 0.83).toFixed(2)),
    mid: Number((avg * 1.0).toFixed(2)),
    high: Number((avg * 1.22).toFixed(2)),
    market: Number((avg * 0.95).toFixed(2)),
  };
}

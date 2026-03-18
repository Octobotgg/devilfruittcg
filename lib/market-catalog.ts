import "server-only";

import type { Card } from "@/lib/cards";
import { getJustTcgPriceSummaries } from "@/lib/justtcg-store";
import { OFFICIAL_CARDS } from "@/lib/official-cards";
import type {
  MarketCardResult,
  MarketCatalogResponse,
  MarketFacetOption,
  MarketFacets,
  MarketPriceSummary,
  MarketSort,
} from "@/lib/market-types";

type MarketCatalogQuery = {
  q?: string;
  sets?: string[];
  types?: string[];
  colors?: string[];
  rarities?: string[];
  counters?: number[];
  attributes?: string[];
  costMin?: number;
  costMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  powerMin?: number;
  powerMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: MarketSort;
  page?: number;
  pageSize?: number;
};

type ScoredCard = {
  card: Card;
  score: number;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 96;

const RARITY_LABELS: Record<string, string> = {
  C: "Common (C)",
  UC: "Uncommon (UC)",
  R: "Rare (R)",
  SR: "Super Rare (SR)",
  SEC: "Secret Rare (SEC)",
  L: "Leader (L)",
  P: "Promo (P)",
  TR: "Treasure Rare (TR)",
  "SP CARD": "SP Card",
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function setLabel(card: Card) {
  if (card.setCode === "P") return "Promotion Cards";
  return card.set.replace(/\s*\[[A-Z0-9-]+\]\s*$/u, "").trim() || card.set;
}

function buildFacetOptions(values: Map<string, number>, labelForValue?: (value: string) => string): MarketFacetOption[] {
  return Array.from(values.entries())
    .map(([value, count]) => ({
      value,
      label: labelForValue ? labelForValue(value) : value,
      count,
    }))
    .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
}

function createRanges(cards: Card[]) {
  const costValues = cards.map((card) => card.cost).filter((value): value is number => typeof value === "number");
  const lifeValues = cards.map((card) => card.life).filter((value): value is number => typeof value === "number");
  const powerValues = cards.map((card) => card.power).filter((value): value is number => typeof value === "number");

  return {
    cost: { min: Math.min(...costValues), max: Math.max(...costValues) },
    life: { min: Math.min(...lifeValues), max: Math.max(...lifeValues) },
    power: { min: Math.min(...powerValues), max: Math.max(...powerValues) },
  };
}

function createFacets(cards: Card[]): MarketFacets {
  const sets = new Map<string, number>();
  const types = new Map<string, number>();
  const colors = new Map<string, number>();
  const rarities = new Map<string, number>();
  const counters = new Map<string, number>();
  const attributes = new Map<string, number>();

  for (const card of cards) {
    sets.set(card.setCode, (sets.get(card.setCode) || 0) + 1);
    types.set(card.type, (types.get(card.type) || 0) + 1);
    colors.set(card.color, (colors.get(card.color) || 0) + 1);
    rarities.set(card.rarity, (rarities.get(card.rarity) || 0) + 1);

    const counterValue = typeof card.counter === "number" ? card.counter : 0;
    counters.set(String(counterValue), (counters.get(String(counterValue)) || 0) + 1);

    const normalizedAttribute = (card.attribute || "").trim();
    if (normalizedAttribute && normalizedAttribute !== "?") {
      attributes.set(normalizedAttribute, (attributes.get(normalizedAttribute) || 0) + 1);
    }
  }

  return {
    sets: buildFacetOptions(sets, (value) => {
      const firstCard = cards.find((card) => card.setCode === value);
      return firstCard ? `${value} · ${setLabel(firstCard)}` : value;
    }),
    types: buildFacetOptions(types),
    colors: buildFacetOptions(colors),
    rarities: buildFacetOptions(rarities, (value) => RARITY_LABELS[value] || value),
    counters: buildFacetOptions(counters, (value) => value),
    attributes: buildFacetOptions(attributes),
  };
}

const MARKET_RANGES = createRanges(OFFICIAL_CARDS);
const MARKET_FACETS = createFacets(OFFICIAL_CARDS);

function priceSummaryFromMap(cardId: string, priceMap: Record<string, MarketPriceSummary>): MarketPriceSummary | null {
  const summary = priceMap[cardId.toUpperCase()];
  if (!summary) return null;
  return summary;
}

function cardNumberValue(card: Card) {
  return Number(card.number.replace(/\D/g, "")) || 0;
}

function compareCardNumber(a: Card, b: Card) {
  const setCompare = a.setCode.localeCompare(b.setCode, undefined, { numeric: true });
  if (setCompare !== 0) return setCompare;

  const numberCompare = cardNumberValue(a) - cardNumberValue(b);
  if (numberCompare !== 0) return numberCompare;

  return a.name.localeCompare(b.name);
}

function compareNewest(a: Card, b: Card) {
  const dateA = a.releaseDate || "0000-00-00";
  const dateB = b.releaseDate || "0000-00-00";

  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return compareCardNumber(a, b);
}

function colorMatch(card: Card, filters: string[]) {
  if (!filters.length) return true;

  const cardColor = card.color.toLowerCase();
  const parts = cardColor.split("/").map((part) => part.trim());
  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return cardColor === normalized || parts.includes(normalized);
  });
}

function attributeMatch(card: Card, filters: string[]) {
  if (!filters.length) return true;
  const attribute = (card.attribute || "").toLowerCase();
  const parts = attribute.split("/").map((part) => part.trim()).filter(Boolean);

  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return attribute === normalized || parts.includes(normalized);
  });
}

function scoreCard(card: Card, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const raw = trimmed.toLowerCase();
  const normalized = normalizeText(trimmed);
  const canonicalId = String(card.canonicalId || "");
  const searchable = normalizeText([
    card.name,
    card.id,
    canonicalId,
    `${card.setCode}-${card.number}`,
    card.number,
    card.setCode,
    card.set,
    card.type,
    card.color,
    card.rarity,
    card.attribute || "",
    card.traits || "",
    card.effect || "",
    card.trigger || "",
  ].join(" "));

  let score = 0;

  if (card.id.toLowerCase() === raw) score += 1800;
  else if (canonicalId.toLowerCase() === raw) score += 1790;
  else if (`${card.setCode}-${card.number}`.toLowerCase() === raw) score += 1700;
  else if (card.id.toLowerCase().startsWith(raw)) score += 950;
  else if (canonicalId.toLowerCase().startsWith(raw)) score += 940;
  else if (card.id.toLowerCase().includes(raw)) score += 780;
  else if (canonicalId.toLowerCase().includes(raw)) score += 770;

  if (card.name.toLowerCase() === raw) score += 1500;
  else if (card.name.toLowerCase().startsWith(raw)) score += 920;
  else if (card.name.toLowerCase().includes(raw)) score += 700;

  if (card.number.toLowerCase() === raw) score += 820;
  if (card.setCode.toLowerCase() === raw) score += 520;
  if ((card.traits || "").toLowerCase().includes(raw)) score += 220;
  if ((card.attribute || "").toLowerCase().includes(raw)) score += 180;
  if ((card.effect || "").toLowerCase().includes(raw)) score += 150;
  if ((card.trigger || "").toLowerCase().includes(raw)) score += 130;

  const tokens = tokenize(normalized);
  if (tokens.length) {
    const tokenHits = tokens.filter((token) => searchable.includes(token)).length;
    if (tokenHits === tokens.length) score += 360 + tokens.length * 40;
    else score += tokenHits * 50;
  }

  return score;
}

function filterByQuery(cards: Card[], query: string) {
  const trimmed = query.trim();
  if (!trimmed) return cards.map((card) => ({ card, score: 0 }));

  return cards
    .map((card) => ({ card, score: scoreCard(card, trimmed) }))
    .filter((item) => item.score > 0);
}

function filterCards(items: ScoredCard[], query: MarketCatalogQuery, priceMap: Record<string, MarketPriceSummary>) {
  return items.filter(({ card }) => {
    if (query.sets?.length && !query.sets.includes(card.setCode)) return false;
    if (query.types?.length && !query.types.includes(card.type)) return false;
    if (query.rarities?.length && !query.rarities.includes(card.rarity)) return false;
    if (!colorMatch(card, query.colors || [])) return false;
    if (!attributeMatch(card, query.attributes || [])) return false;

    const counter = typeof card.counter === "number" ? card.counter : 0;
    if (query.counters?.length && !query.counters.includes(counter)) return false;

    if (query.costMin !== undefined && (typeof card.cost !== "number" || card.cost < query.costMin)) return false;
    if (query.costMax !== undefined && (typeof card.cost !== "number" || card.cost > query.costMax)) return false;
    if (query.lifeMin !== undefined && (typeof card.life !== "number" || card.life < query.lifeMin)) return false;
    if (query.lifeMax !== undefined && (typeof card.life !== "number" || card.life > query.lifeMax)) return false;
    if (query.powerMin !== undefined && (typeof card.power !== "number" || card.power < query.powerMin)) return false;
    if (query.powerMax !== undefined && (typeof card.power !== "number" || card.power > query.powerMax)) return false;

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      const market = priceMap[card.id.toUpperCase()];
      const price = market?.marketPrice ?? null;
      if (typeof price !== "number") return false;
      if (query.priceMin !== undefined && price < query.priceMin) return false;
      if (query.priceMax !== undefined && price > query.priceMax) return false;
    }

    return true;
  });
}

function sortCards(items: ScoredCard[], sort: MarketSort, hasQuery: boolean, priceMap: Record<string, MarketPriceSummary>) {
  const effectiveSort = sort === "relevance" && !hasQuery ? "newest" : sort;

  return [...items].sort((a, b) => {
    if (effectiveSort === "relevance") {
      if (b.score !== a.score) return b.score - a.score;
      return compareNewest(a.card, b.card);
    }

    if (effectiveSort === "price_asc" || effectiveSort === "price_desc") {
      const priceA = priceMap[a.card.id.toUpperCase()]?.marketPrice;
      const priceB = priceMap[b.card.id.toUpperCase()]?.marketPrice;
      const missingA = typeof priceA !== "number";
      const missingB = typeof priceB !== "number";

      if (missingA && missingB) return compareNewest(a.card, b.card);
      if (missingA) return 1;
      if (missingB) return -1;

      const delta = priceA - priceB;
      if (delta !== 0) return effectiveSort === "price_asc" ? delta : -delta;
      return compareNewest(a.card, b.card);
    }

    if (effectiveSort === "name_asc") return a.card.name.localeCompare(b.card.name);
    if (effectiveSort === "name_desc") return b.card.name.localeCompare(a.card.name);
    if (effectiveSort === "number_asc") return compareCardNumber(a.card, b.card);

    return compareNewest(a.card, b.card);
  });
}

function clampPageSize(pageSize?: number) {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(12, Math.trunc(pageSize)));
}

function normalizeSort(sort?: string, hasQuery?: boolean): MarketSort {
  if (sort === "relevance" || sort === "price_asc" || sort === "price_desc" || sort === "name_asc" || sort === "name_desc" || sort === "number_asc" || sort === "newest") {
    return sort;
  }

  return hasQuery ? "relevance" : "newest";
}

export function getMarketCatalogMetadata() {
  return {
    facets: MARKET_FACETS,
    ranges: MARKET_RANGES,
  };
}

export async function searchMarketCatalog(query: MarketCatalogQuery): Promise<MarketCatalogResponse> {
  const pageSize = clampPageSize(query.pageSize);
  const page = Math.max(1, Math.trunc(query.page || 1));
  const trimmedQuery = query.q?.trim() || "";
  const hasQuery = Boolean(trimmedQuery);
  const sort = normalizeSort(query.sort, hasQuery);

  const scored = filterByQuery(OFFICIAL_CARDS, trimmedQuery);
  const needsAllPrices =
    sort === "price_asc" ||
    sort === "price_desc" ||
    typeof query.priceMin === "number" ||
    typeof query.priceMax === "number";

  const allPriceMap = needsAllPrices
    ? await getJustTcgPriceSummaries(scored.map((item) => item.card.id))
    : {};

  const filtered = filterCards(scored, query, allPriceMap);
  const sorted = sortCards(filtered, sort, hasQuery, allPriceMap);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  const pagePriceMap = needsAllPrices
    ? allPriceMap
    : await getJustTcgPriceSummaries(pageItems.map((item) => item.card.id));

  const results: MarketCardResult[] = pageItems.map(({ card }) => ({
    ...card,
    market: priceSummaryFromMap(card.id, pagePriceMap),
  }));

  return {
    total,
    page: safePage,
    pageSize,
    totalPages,
    sort,
    query: trimmedQuery,
    results,
    facets: MARKET_FACETS,
    ranges: MARKET_RANGES,
  };
}

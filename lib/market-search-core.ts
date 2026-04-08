import { formatMarketSetFacetLabel } from "./market-display.ts";
import type {
  MarketCardResult,
  MarketCatalogQuery,
  MarketCatalogResponse,
  MarketFacetOption,
  MarketFacets,
  MarketSort,
} from "./market-types.ts";

type SearchableMarketCard = MarketCardResult & {
  printedCardId?: string | null;
  justtcgTitle?: string | null;
  cardPrintId?: string | null;
};

type SortableMarketCard = Pick<
  SearchableMarketCard,
  | "id"
  | "printedCardId"
  | "cardPrintId"
  | "justtcgTitle"
  | "name"
  | "set"
  | "setCode"
  | "number"
  | "type"
  | "color"
  | "rarity"
  | "attribute"
  | "traits"
  | "effect"
  | "trigger"
  | "releaseDate"
  | "market"
>;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 96;

const EMPTY_MARKET_METADATA: Pick<MarketCatalogResponse, "facets" | "ranges"> = {
  facets: {
    sets: [],
    types: [],
    colors: [],
    rarities: [],
    counters: [],
    attributes: [],
  },
  ranges: {
    cost: { min: 0, max: 0 },
    life: { min: 0, max: 0 },
    power: { min: 0, max: 0 },
  },
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

function cardNumberValue(card: Pick<SortableMarketCard, "number">) {
  return Number(card.number.replace(/\D/g, "")) || 0;
}

function compareCardNumber(
  a: Pick<SortableMarketCard, "setCode" | "number" | "name">,
  b: Pick<SortableMarketCard, "setCode" | "number" | "name">,
) {
  const setCompare = a.setCode.localeCompare(b.setCode, undefined, { numeric: true });
  if (setCompare !== 0) return setCompare;

  const numberCompare = cardNumberValue(a) - cardNumberValue(b);
  if (numberCompare !== 0) return numberCompare;

  return a.name.localeCompare(b.name);
}

function compareNewest(
  a: Pick<SortableMarketCard, "releaseDate" | "setCode" | "number" | "name">,
  b: Pick<SortableMarketCard, "releaseDate" | "setCode" | "number" | "name">,
) {
  const dateA = a.releaseDate || "0000-00-00";
  const dateB = b.releaseDate || "0000-00-00";

  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return compareCardNumber(a, b);
}

function buildFacetOptions(values: Map<string, number>, labelForValue?: (value: string) => string): MarketFacetOption[] {
  return Array.from(values.entries())
    .map(([value, count]) => ({
      value,
      label: labelForValue ? labelForValue(value) : value,
      count,
    }))
    .sort((left, right) => left.value.localeCompare(right.value, undefined, { numeric: true }));
}

export function createMarketRanges(cards: SearchableMarketCard[]) {
  const costValues = cards.map((card) => card.cost).filter((value): value is number => typeof value === "number");
  const lifeValues = cards.map((card) => card.life).filter((value): value is number => typeof value === "number");
  const powerValues = cards.map((card) => card.power).filter((value): value is number => typeof value === "number");

  return {
    cost: {
      min: costValues.length ? Math.min(...costValues) : 0,
      max: costValues.length ? Math.max(...costValues) : 0,
    },
    life: {
      min: lifeValues.length ? Math.min(...lifeValues) : 0,
      max: lifeValues.length ? Math.max(...lifeValues) : 0,
    },
    power: {
      min: powerValues.length ? Math.min(...powerValues) : 0,
      max: powerValues.length ? Math.max(...powerValues) : 0,
    },
  };
}

export function createMarketFacets(cards: SearchableMarketCard[]): MarketFacets {
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

    const attribute = String(card.attribute || "").trim();
    if (attribute && attribute !== "?") {
      attributes.set(attribute, (attributes.get(attribute) || 0) + 1);
    }
  }

  return {
    sets: buildFacetOptions(sets, (value) => {
      const card = cards.find((candidate) => candidate.setCode === value);
      return card ? formatMarketSetFacetLabel(value, card.set) : formatMarketSetFacetLabel(value, value);
    }),
    types: buildFacetOptions(types),
    colors: buildFacetOptions(colors),
    rarities: buildFacetOptions(rarities),
    counters: buildFacetOptions(counters),
    attributes: buildFacetOptions(attributes),
  };
}

function scoreCard(card: SortableMarketCard, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const raw = trimmed.toLowerCase();
  const normalized = normalizeText(trimmed);
  const cardName = String(card.name || "");
  const cardId = String(card.id || "");
  const cardPrintId = String(card.cardPrintId || card.id || "");
  const justtcgTitle = String(card.justtcgTitle || "");
  const searchable = normalizeText(
    [
      cardName,
      cardId,
      cardPrintId,
      card.printedCardId || "",
      justtcgTitle,
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
    ].join(" "),
  );

  let score = 0;

  if (cardPrintId.toLowerCase() === raw) score += 1800;
  else if (cardId.toLowerCase() === raw) score += 1700;
  else if (`${card.setCode}-${card.number}`.toLowerCase() === raw) score += 1600;

  if (cardName.toLowerCase() === raw) score += 1500;
  else if (cardName.toLowerCase().startsWith(raw)) score += 900;
  else if (cardName.toLowerCase().includes(raw)) score += 700;

  if (justtcgTitle.toLowerCase() === raw) score += 1450;
  else if (justtcgTitle.toLowerCase().includes(raw)) score += 650;

  const tokens = tokenize(normalized);
  if (tokens.length) {
    const tokenHits = tokens.filter((token) => searchable.includes(token)).length;
    if (tokenHits === tokens.length) score += 300 + tokens.length * 40;
    else score += tokenHits * 50;
  }

  return score;
}

function colorMatch(card: SearchableMarketCard, filters: string[]) {
  if (!filters.length) return true;

  const cardColor = card.color.toLowerCase();
  const parts = cardColor.split("/").map((part) => part.trim());
  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return cardColor === normalized || parts.includes(normalized);
  });
}

function attributeMatch(card: SearchableMarketCard, filters: string[]) {
  if (!filters.length) return true;

  const attribute = String(card.attribute || "").toLowerCase();
  const parts = attribute
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return attribute === normalized || parts.includes(normalized);
  });
}

export function filterMarketCards(cards: SearchableMarketCard[], query: MarketCatalogQuery) {
  const searchQuery = String(query.q || "").trim();

  return cards.filter((card) => {
    if (searchQuery && scoreCard(card, searchQuery) <= 0) return false;
    if (query.sets?.length && !query.sets.includes(card.setCode)) return false;
    if (query.types?.length && !query.types.includes(card.type)) return false;
    if (!colorMatch(card, query.colors || [])) return false;
    if (query.rarities?.length && !query.rarities.includes(card.rarity)) return false;
    if (query.counters?.length) {
      const counter = typeof card.counter === "number" ? card.counter : 0;
      if (!query.counters.includes(counter)) return false;
    }
    if (!attributeMatch(card, query.attributes || [])) return false;

    if (typeof query.costMin === "number" && (card.cost ?? -1) < query.costMin) return false;
    if (typeof query.costMax === "number" && (card.cost ?? Number.MAX_SAFE_INTEGER) > query.costMax) return false;
    if (typeof query.lifeMin === "number" && (card.life ?? -1) < query.lifeMin) return false;
    if (typeof query.lifeMax === "number" && (card.life ?? Number.MAX_SAFE_INTEGER) > query.lifeMax) return false;
    if (typeof query.powerMin === "number" && (card.power ?? -1) < query.powerMin) return false;
    if (typeof query.powerMax === "number" && (card.power ?? Number.MAX_SAFE_INTEGER) > query.powerMax) return false;

    const marketPrice = card.market?.marketPrice ?? null;
    if (typeof query.priceMin === "number" && (marketPrice ?? -1) < query.priceMin) return false;
    if (typeof query.priceMax === "number") {
      const resolvedPrice = marketPrice ?? Number.MAX_SAFE_INTEGER;
      if (resolvedPrice > query.priceMax) return false;
    }

    return true;
  });
}

export function sortMarketCards<T extends SearchableMarketCard>(cards: T[], sort: MarketSort, query: string) {
  const scored = cards.map((card) => ({
    card,
    score: scoreCard(card, query),
  }));

  scored.sort((left, right) => {
    const leftPriceAsc = left.card.market?.marketPrice ?? Number.POSITIVE_INFINITY;
    const rightPriceAsc = right.card.market?.marketPrice ?? Number.POSITIVE_INFINITY;
    const leftPriceDesc = left.card.market?.marketPrice ?? Number.NEGATIVE_INFINITY;
    const rightPriceDesc = right.card.market?.marketPrice ?? Number.NEGATIVE_INFINITY;

    switch (sort) {
      case "price_asc":
        return leftPriceAsc - rightPriceAsc || compareCardNumber(left.card, right.card);
      case "price_desc":
        return rightPriceDesc - leftPriceDesc || compareCardNumber(left.card, right.card);
      case "name_asc":
        return left.card.name.localeCompare(right.card.name) || compareCardNumber(left.card, right.card);
      case "name_desc":
        return right.card.name.localeCompare(left.card.name) || compareCardNumber(left.card, right.card);
      case "number_asc":
        return compareCardNumber(left.card, right.card);
      case "newest":
        return compareNewest(left.card, right.card);
      case "relevance":
      default:
        return right.score - left.score || compareCardNumber(left.card, right.card);
    }
  });

  return scored.map((item) => item.card);
}

export function resolveMarketSort(query: string, sort?: MarketSort) {
  if (sort) return sort;
  return query.trim() ? "relevance" : "newest";
}

export function buildMarketCatalogSnapshot(cards: SearchableMarketCard[]) {
  return {
    total: cards.length,
    cards,
    facets: createMarketFacets(cards),
    ranges: createMarketRanges(cards),
  };
}

export function searchMarketCardsSnapshot(
  cards: SearchableMarketCard[],
  query: MarketCatalogQuery = {},
): MarketCatalogResponse {
  const includeMetadata = query.includeMetadata !== false;
  const filtered = filterMarketCards(cards, query);
  const sort = resolveMarketSort(String(query.q || ""), query.sort);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize || DEFAULT_PAGE_SIZE));
  const page = Math.max(1, query.page || 1);
  const sorted = sortMarketCards(filtered, sort, String(query.q || ""));
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const results = sorted.slice(start, start + pageSize);
  const metadata = includeMetadata ? buildMarketCatalogSnapshot(cards) : EMPTY_MARKET_METADATA;

  return {
    total,
    page,
    pageSize,
    totalPages,
    sort,
    query: String(query.q || ""),
    results,
    facets: metadata.facets,
    ranges: metadata.ranges,
  };
}

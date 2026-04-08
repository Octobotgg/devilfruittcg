import { createRequire } from "node:module";

import type { Card } from "../../cards";
import type {
  MarketCatalogQuery,
  MarketCardResult,
  MarketCatalogResponse,
  MarketFacetOption,
  MarketFacets,
  MarketPriceSummary,
  MarketSort,
} from "../../market-types";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");
const { formatMarketSetFacetLabel }: typeof import("../../market-display") = require("../../market-display.ts");

type MarketSearchQuery = MarketCatalogQuery;

type MarketSearchRow = {
  cardPrintId: string;
  cardId: string;
  printedCardCode: string;
  variantLabel: string;
  variantSlug: string;
  cardName: string;
  setCode: string;
  setName: string;
  number: string;
  cardType: string;
  color: string;
  rarity: string;
  cost: number | null;
  life: number | null;
  power: number | null;
  counter: number | null;
  attribute: string | null;
  traits: string | null;
  effectText: string | null;
  triggerText: string | null;
  imageUrl: string | null;
  releaseDate: string | null;
  productKind: string | null;
  activeExternalVariantId?: string | null;
  externalVariantId?: string | null;
  variantCondition?: string | null;
  justtcgTitle: string | null;
  justtcgImageUrl: string | null;
  displayTitle?: string | null;
  displaySetName?: string | null;
  displaySetCode?: string | null;
  displayRarity?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
  labelStatus?: string | null;
  mappingApproved: boolean;
  priceNm: string | number | null;
  priceLp: string | number | null;
  priceChange7d: string | number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
  publishedAt?: string | null;
};

type RuntimeMarketCardResult = MarketCardResult & {
  cardPrintId: string;
  justtcgTitle: string | null;
  justtcgImageUrl: string | null;
  publishedTreatmentLabel?: string | null;
  official: {
    name: string;
    setCode: string;
    setName: string;
  };
  pricingStatus: "priced" | "unpriced";
  currentPrice: number | null;
};

type SortableMarketCard = {
  id?: string;
  cardPrintId?: string;
  printedCardId?: string | null;
  justtcgTitle?: string | null;
  name: string;
  set?: string;
  setCode: string;
  number: string;
  type?: string;
  color?: string;
  rarity?: string;
  attribute?: string | null;
  traits?: string | null;
  effect?: string | null;
  trigger?: string | null;
  releaseDate?: string | null;
  market: MarketPriceSummary | null;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 96;
const STALE_THRESHOLD_MS = 8 * 24 * 60 * 60 * 1000;
const MARKET_ROWS_CACHE_TTL_MS = 60 * 1000;
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

let cachedMarketRows: MarketSearchRow[] | null = null;
let cachedMarketRowsAt = 0;
let pendingMarketRows: Promise<MarketSearchRow[]> | null = null;

function parseNullableNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProductKind(value: string | null | undefined) {
  switch (value) {
    case "raw_card":
    case "sealed":
    case "graded":
      return value;
    default:
      return "other";
  }
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

async function loadMarketRows(): Promise<MarketSearchRow[]> {
  const now = Date.now();
  if (cachedMarketRows && now - cachedMarketRowsAt < MARKET_ROWS_CACHE_TTL_MS) {
    return cachedMarketRows;
  }

  if (pendingMarketRows) {
    return pendingMarketRows;
  }

  const sql = createPostgresClient();
  pendingMarketRows = (async () => {
    const rows = await sql.unsafe(
      `
        select
          cp.id as "cardPrintId",
          cards.id as "cardId",
          cp.printed_card_code as "printedCardCode",
          cp.variant_label as "variantLabel",
          cp.variant_slug as "variantSlug",
          cards.name as "cardName",
          releases.code as "setCode",
          releases.name as "setName",
          cards.number as "number",
          cards.card_type as "cardType",
          cards.color as "color",
          cards.rarity as "rarity",
          cards.cost as "cost",
          cards.life as "life",
          cards.power as "power",
          cards.counter as "counter",
          cards.attribute as "attribute",
          cards.traits as "traits",
          cards.effect_text as "effectText",
          cards.trigger_text as "triggerText",
          cp.image_url as "imageUrl",
          coalesce(cp.release_date_override::text, releases.release_date::text) as "releaseDate",
          ep.product_kind as "productKind",
          cp.active_external_variant_id as "activeExternalVariantId",
          published.external_variant_id as "externalVariantId",
          variant.condition as "variantCondition",
          case when ep.product_kind = 'raw_card' then ep.name end as "justtcgTitle",
          case when ep.product_kind = 'raw_card' then ep.image_url end as "justtcgImageUrl",
          display.display_title as "displayTitle",
          display.display_set_name as "displaySetName",
          display.display_set_code as "displaySetCode",
          display.display_rarity as "displayRarity",
          display.display_treatment_label as "displayTreatmentLabel",
          display.display_image_url as "displayImageUrl",
          display.label_status as "labelStatus",
          (published.external_product_id is not null and published.external_variant_id is not null) as "mappingApproved",
          published.price_nm as "priceNm",
          published.price_lp as "priceLp",
          current_prices.price_change_7d as "priceChange7d",
          published.updated_at::text as "updatedAt",
          published.published_at::text as "fetchedAt",
          published.published_at::text as "publishedAt"
        from card_prints cp
        join cards on cards.id = cp.card_id
        join releases on releases.id = cp.release_id
        left join card_print_price_published published
          on published.card_print_id = cp.id
         and published.source_id = 'justtcg'
        left join card_print_display_published display
          on display.card_print_id = cp.id
        left join external_products ep on ep.id = published.external_product_id
        left join external_product_variants variant
          on variant.id = published.external_variant_id
         and variant.external_product_id = published.external_product_id
        left join card_print_price_current current_prices
          on current_prices.card_print_id = cp.id
         and current_prices.external_product_id = published.external_product_id
         and current_prices.external_variant_id = published.external_variant_id
         and current_prices.source_id = 'justtcg'
        where cp.is_active = true
      `,
    );

    cachedMarketRows = toPlainRows<MarketSearchRow>(rows);
    cachedMarketRowsAt = Date.now();
    return cachedMarketRows;
  })();

  try {
    return await pendingMarketRows;
  } finally {
    pendingMarketRows = null;
  }
}

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

function createRanges(cards: RuntimeMarketCardResult[]) {
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

function buildFacetOptions(values: Map<string, number>, labelForValue?: (value: string) => string): MarketFacetOption[] {
  return Array.from(values.entries())
    .map(([value, count]) => ({
      value,
      label: labelForValue ? labelForValue(value) : value,
      count,
    }))
    .sort((left, right) => left.value.localeCompare(right.value, undefined, { numeric: true }));
}

function createFacets(cards: RuntimeMarketCardResult[]): MarketFacets {
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
  const searchable = normalizeText([
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
  ].join(" "));

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

function colorMatch(card: RuntimeMarketCardResult, filters: string[]) {
  if (!filters.length) return true;

  const cardColor = card.color.toLowerCase();
  const parts = cardColor.split("/").map((part) => part.trim());
  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return cardColor === normalized || parts.includes(normalized);
  });
}

function attributeMatch(card: RuntimeMarketCardResult, filters: string[]) {
  if (!filters.length) return true;

  const attribute = String(card.attribute || "").toLowerCase();
  const parts = attribute.split("/").map((part) => part.trim()).filter(Boolean);
  return filters.some((filter) => {
    const normalized = filter.toLowerCase();
    return attribute === normalized || parts.includes(normalized);
  });
}

function toMarketPriceSummary(row: MarketSearchRow): MarketPriceSummary | null {
  if (!row.mappingApproved) return null;
  if (normalizeProductKind(row.productKind) !== "raw_card") return null;
  if (!row.externalVariantId) return null;
  if (String(row.variantCondition || "").trim().toLowerCase() !== "near mint") return null;

  const marketPrice = parseNullableNumber(row.priceNm);
  if (marketPrice == null) return null;

  const updatedAt = row.updatedAt || row.fetchedAt;
  const updatedAtMs = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const stale = Number.isFinite(updatedAtMs)
    ? Date.now() - updatedAtMs > STALE_THRESHOLD_MS
    : true;

  return {
    marketPrice,
    averagePrice: marketPrice,
    lowestPrice: parseNullableNumber(row.priceLp),
    highestPrice: null,
    updatedAt,
    fetchedAt: row.fetchedAt,
    priceChange7d: parseNullableNumber(row.priceChange7d),
    stale,
    cached: true,
    source: "justtcg",
  };
}

export function toMarketCardResultForTesting(row: MarketSearchRow): RuntimeMarketCardResult {
  const market = toMarketPriceSummary(row);
  const publicPrintId = row.printedCardCode || row.cardId;
  const hasPublishedDisplay =
    row.labelStatus != null ||
    row.displayTitle != null ||
    row.displaySetName != null ||
    row.displaySetCode != null ||
    row.displayRarity != null ||
    row.displayTreatmentLabel != null ||
    row.displayImageUrl != null;
  const publishedTitle = String(row.displayTitle || "").trim() || row.cardName;
  const publishedSetName = String(row.displaySetName || "").trim() || row.setName;
  const publishedSetCode = String(row.displaySetCode || "").trim() || row.setCode;
  const publishedRarity = String(row.displayRarity || "").trim() || row.rarity;
  const publishedTreatmentLabel = hasPublishedDisplay
    ? String(row.displayTreatmentLabel || "").trim() || null
    : row.variantLabel;
  const publishedImageUrl = String(row.displayImageUrl || "").trim() || row.imageUrl;

  const card: Card = {
    id: publicPrintId,
    baseId: row.cardId,
    baseCardId: row.cardId,
    printedCardId: row.printedCardCode,
    canonicalId: publicPrintId,
    canonicalVariantId: publicPrintId,
    canonicalVariantKey: row.variantSlug,
    variantLabel: publishedTreatmentLabel ?? undefined,
    variantSlug: row.variantSlug,
    name: publishedTitle,
    set: publishedSetName,
    setCode: publishedSetCode,
    number: row.number,
    type: row.cardType,
    color: row.color,
    rarity: publishedRarity,
    cost: row.cost,
    life: row.life,
    power: row.power,
    counter: row.counter,
    attribute: row.attribute,
    traits: row.traits,
    effect: row.effectText,
    trigger: row.triggerText,
    imageUrl: publishedImageUrl,
    releaseDate: row.releaseDate,
    language: "EN",
  };

  return {
    ...card,
    market,
    cardPrintId: row.cardPrintId,
    justtcgTitle: row.justtcgTitle,
    justtcgImageUrl: publishedImageUrl,
    publishedTreatmentLabel: hasPublishedDisplay
      ? String(row.displayTreatmentLabel || "").trim() || null
      : null,
    official: {
      name: row.cardName,
      setCode: row.setCode,
      setName: row.setName,
    },
    pricingStatus: market ? "priced" : "unpriced",
    currentPrice: market?.marketPrice ?? null,
  };
}

function applyFilters(cards: RuntimeMarketCardResult[], query: MarketSearchQuery) {
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

export function sortMarketCardsForTesting<T extends Pick<RuntimeMarketCardResult, "market" | "name" | "setCode" | "number">>(
  cards: Array<T & SortableMarketCard>,
  sort: MarketSort,
  query: string,
) {
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

export function resolveMarketSortForTesting(query: string, sort?: MarketSort) {
  if (sort) return sort;
  return query.trim() ? "relevance" : "newest";
}

export async function searchMarketCatalogReadModel(
  query: MarketSearchQuery = {},
): Promise<MarketCatalogResponse & { results: RuntimeMarketCardResult[] }> {
  const includeMetadata = query.includeMetadata !== false;
  const allCards = (await loadMarketRows()).map((row) => toMarketCardResultForTesting(row));
  const filtered = applyFilters(allCards, query);
  const sort = resolveMarketSortForTesting(String(query.q || ""), query.sort);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize || DEFAULT_PAGE_SIZE));
  const page = Math.max(1, query.page || 1);
  const sorted = sortMarketCardsForTesting(filtered, sort, String(query.q || ""));
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const results = sorted.slice(start, start + pageSize);
  const metadata = includeMetadata
    ? {
        facets: createFacets(allCards),
        ranges: createRanges(allCards),
      }
    : EMPTY_MARKET_METADATA;

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

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");

type MarketMoverRow = {
  collectibleId: string;
  collectibleKind: "raw_card" | "sealed";
  cardId: string | null;
  officialName: string;
  officialSetCode: string | null;
  officialSetName: string | null;
  externalProductId: string | null;
  activeExternalProductId: string | null;
  justtcgTitle: string | null;
  justtcgImageUrl: string | null;
  currentPrice: string | number | null;
  priceChange24h: string | number | null;
  updatedAt: string | null;
  mappingApproved: boolean;
};

export type MarketMover = {
  collectibleId: string;
  collectibleKind: "raw_card" | "sealed";
  cardId: string | null;
  name: string;
  justtcgTitle: string | null;
  imageUrl: string | null;
  currentPrice: number;
  priceChange24h: number;
  previousPrice: number;
  dailyChangePct: number;
  updatedAt: string | null;
  officialSetCode: string | null;
  officialSetName: string | null;
  source: "justtcg-runtime-pricing";
};

export type MarketMoverTrustFilters = {
  minimumPriceFloor: number;
  maximumAbsoluteDelta: number;
  maximumPercentSwing: number;
};

export type MarketHomeReadModel = {
  source: "justtcg-runtime-pricing";
  updatedAt: string | null;
  cards: {
    topGainers24h: MarketMover[];
    topLosers24h: MarketMover[];
  };
  sealed: {
    topGainers24h: MarketMover[];
    topLosers24h: MarketMover[];
  };
};

export const DEFAULT_MARKET_MOVER_TRUST_FILTERS: MarketMoverTrustFilters = {
  minimumPriceFloor: 1,
  maximumAbsoluteDelta: 500,
  maximumPercentSwing: 300,
};

function parseNullableNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

const RAW_CARD_MOVER_QUERY = `
  select
    cp.id as "collectibleId",
    'raw_card' as "collectibleKind",
    cards.id as "cardId",
    cards.name as "officialName",
    releases.code as "officialSetCode",
    releases.name as "officialSetName",
    current_prices.external_product_id as "externalProductId",
    cp.active_external_product_id as "activeExternalProductId",
    ep.name as "justtcgTitle",
    ep.image_url as "justtcgImageUrl",
    current_prices.price_nm as "currentPrice",
    current_prices.price_change_24h as "priceChange24h",
    current_prices.updated_at::text as "updatedAt",
    true as "mappingApproved"
  from card_print_price_current current_prices
  join card_prints cp
    on cp.id = current_prices.card_print_id
   and cp.active_external_product_id = current_prices.external_product_id
  join cards on cards.id = cp.card_id
  join releases on releases.id = cp.release_id
  join external_products ep on ep.id = current_prices.external_product_id and ep.product_kind = 'raw_card'
  join card_print_market_links link
    on link.card_print_id = cp.id
   and link.external_product_id = current_prices.external_product_id
   and link.approved_at is not null
   and link.mapping_status = 'exact'
  where current_prices.source_id = 'justtcg'
    and cp.is_active = true
`;

const SEALED_MOVER_QUERY = `
  select
    sealed.id as "collectibleId",
    'sealed' as "collectibleKind",
    null as "cardId",
    sealed.name as "officialName",
    releases.code as "officialSetCode",
    releases.name as "officialSetName",
    current_prices.external_product_id as "externalProductId",
    sealed.active_external_product_id as "activeExternalProductId",
    ep.name as "justtcgTitle",
    ep.image_url as "justtcgImageUrl",
    current_prices.price_market as "currentPrice",
    current_prices.price_change_24h as "priceChange24h",
    current_prices.updated_at::text as "updatedAt",
    true as "mappingApproved"
  from sealed_product_price_current current_prices
  join sealed_products sealed
    on sealed.id = current_prices.sealed_product_id
   and sealed.active_external_product_id = current_prices.external_product_id
  left join releases on releases.id = sealed.release_id
  join external_products ep on ep.id = current_prices.external_product_id and ep.product_kind = 'sealed'
  join sealed_product_market_links link
    on link.sealed_product_id = sealed.id
   and link.external_product_id = current_prices.external_product_id
   and link.approved_at is not null
   and link.mapping_status = 'exact'
  where current_prices.source_id = 'justtcg'
    and sealed.is_active = true
`;

async function loadMoverRows(): Promise<MarketMoverRow[]> {
  const sql = createPostgresClient();
  const rawCardRows = await sql.unsafe(RAW_CARD_MOVER_QUERY);

  const sealedRows = await sql.unsafe(SEALED_MOVER_QUERY);

  return [
    ...toPlainRows<MarketMoverRow>(rawCardRows),
    ...toPlainRows<MarketMoverRow>(sealedRows),
  ];
}

export function getMarketHomeMoverQueriesForTesting() {
  return {
    rawCardQuery: RAW_CARD_MOVER_QUERY,
    sealedQuery: SEALED_MOVER_QUERY,
  };
}

export function passesMarketMoverTrustFilters(
  row: MarketMoverRow,
  filters: MarketMoverTrustFilters = DEFAULT_MARKET_MOVER_TRUST_FILTERS,
) {
  if (!row.mappingApproved) return false;
  if (!row.externalProductId || !row.activeExternalProductId) return false;
  if (row.externalProductId !== row.activeExternalProductId) return false;

  const currentPrice = parseNullableNumber(row.currentPrice);
  const priceChange24h = parseNullableNumber(row.priceChange24h);
  if (currentPrice == null || priceChange24h == null) return false;

  const previousPrice = currentPrice - priceChange24h;
  if (!(currentPrice >= filters.minimumPriceFloor)) return false;
  if (!(previousPrice >= filters.minimumPriceFloor)) return false;
  if (Math.abs(priceChange24h) > filters.maximumAbsoluteDelta) return false;

  const dailyChangePct = (priceChange24h / previousPrice) * 100;
  if (!Number.isFinite(dailyChangePct)) return false;
  if (Math.abs(dailyChangePct) > filters.maximumPercentSwing) return false;

  return true;
}

function toMarketMover(row: MarketMoverRow): MarketMover | null {
  const currentPrice = parseNullableNumber(row.currentPrice);
  const priceChange24h = parseNullableNumber(row.priceChange24h);
  if (currentPrice == null || priceChange24h == null) return null;

  const previousPrice = Number((currentPrice - priceChange24h).toFixed(2));
  if (!(previousPrice > 0)) return null;

  return {
    collectibleId: row.collectibleId,
    collectibleKind: row.collectibleKind,
    cardId: row.cardId,
    name: row.officialName,
    justtcgTitle: row.justtcgTitle,
    imageUrl: row.justtcgImageUrl,
    currentPrice,
    priceChange24h,
    previousPrice,
    dailyChangePct: Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2)),
    updatedAt: row.updatedAt,
    officialSetCode: row.officialSetCode,
    officialSetName: row.officialSetName,
    source: "justtcg-runtime-pricing",
  };
}

function latestUpdatedAt(movers: MarketMover[]) {
  return movers.reduce<string | null>((latest, mover) => {
    if (!mover.updatedAt) return latest;
    if (!latest || mover.updatedAt > latest) return mover.updatedAt;
    return latest;
  }, null);
}

function sortGainers(movers: MarketMover[]) {
  return [...movers]
    .filter((mover) => mover.priceChange24h > 0)
    .sort((left, right) => right.dailyChangePct - left.dailyChangePct);
}

function sortLosers(movers: MarketMover[]) {
  return [...movers]
    .filter((mover) => mover.priceChange24h < 0)
    .sort((left, right) => left.dailyChangePct - right.dailyChangePct);
}

export async function getMarketHomeReadModel(options?: {
  limit?: number;
  trustFilters?: MarketMoverTrustFilters;
}): Promise<MarketHomeReadModel> {
  const limit = Math.max(1, options?.limit || 12);
  const trustFilters = options?.trustFilters || DEFAULT_MARKET_MOVER_TRUST_FILTERS;
  const movers = (await loadMoverRows())
    .filter((row) => passesMarketMoverTrustFilters(row, trustFilters))
    .map((row) => toMarketMover(row))
    .filter((row): row is MarketMover => Boolean(row));

  const cards = movers.filter((mover) => mover.collectibleKind === "raw_card");
  const sealed = movers.filter((mover) => mover.collectibleKind === "sealed");
  const updatedAt = latestUpdatedAt(movers);

  return {
    source: "justtcg-runtime-pricing",
    updatedAt,
    cards: {
      topGainers24h: sortGainers(cards).slice(0, limit),
      topLosers24h: sortLosers(cards).slice(0, limit),
    },
    sealed: {
      topGainers24h: sortGainers(sealed).slice(0, limit),
      topLosers24h: sortLosers(sealed).slice(0, limit),
    },
  };
}

export function toLegacyMarketWatchShape(home: MarketHomeReadModel) {
  const combinedGainers = [...home.cards.topGainers24h, ...home.sealed.topGainers24h].sort(
    (left, right) => right.dailyChangePct - left.dailyChangePct,
  );
  const combinedMovers = [
    ...home.cards.topGainers24h,
    ...home.cards.topLosers24h,
    ...home.sealed.topGainers24h,
    ...home.sealed.topLosers24h,
  ].sort((left, right) => Math.abs(right.dailyChangePct) - Math.abs(left.dailyChangePct));

  const topDaily = combinedGainers.slice(0, 12);
  const topWeekly = combinedMovers.slice(0, 12);
  const bountyBoard = Array.from(
    new Map(
      [...topDaily, ...topWeekly].map((row) => [row.collectibleId, row]),
    ).values(),
  ).slice(0, 12);

  return {
    source: home.source,
    updatedAt: home.updatedAt,
    topDaily,
    topWeekly,
    bountyBoard,
  };
}

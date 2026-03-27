import { createRequire } from "node:module";

import type { CardPrintRuntimePrice } from "../pricing/external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const cardPrintPrices = require("../pricing/card-print-prices.ts") as typeof import("../pricing/card-print-prices");
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");
const pricingShared = require("../pricing/external-products.ts") as typeof import("../pricing/external-products");

export type PortfolioRange = "24H" | "7D" | "1M" | "3M" | "6M" | "ALL";

export type PortfolioCollectionItem = {
  cardPrintId: string;
  quantity: number;
  cardId?: string | null;
  variantId?: string | null;
  variantKey?: string | null;
};

export type PortfolioPriceHistoryPoint = {
  cardPrintId: string;
  recordedAt: string;
  price: number | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  approvedActive?: boolean;
};

export type PortfolioSummaryLineItem = {
  cardPrintId: string;
  quantity: number;
  price: CardPrintRuntimePrice;
  currentValue: number;
};

export type PortfolioSummary = {
  totalCollectionValue: number;
  pricedCount: number;
  unpricedCount: number;
  mostValuableItems: PortfolioSummaryLineItem[];
  chartHistory: Array<{
    date: string;
    value: number;
  }>;
  lineItems: PortfolioSummaryLineItem[];
};

export type LoadPortfolioPrices = (
  cardPrintIds: string[],
) => Promise<Map<string, CardPrintRuntimePrice> | Record<string, CardPrintRuntimePrice>>;

export type LoadPortfolioHistory = (
  cardPrintIds: string[],
  range: PortfolioRange,
) => Promise<Map<string, PortfolioPriceHistoryPoint[]> | Record<string, PortfolioPriceHistoryPoint[]>>;

function normalizeItems(items: PortfolioCollectionItem[]) {
  const merged = new Map<string, number>();

  for (const item of items) {
    const cardPrintId = item.cardPrintId.trim();
    const quantity = Number(item.quantity);
    if (!cardPrintId || !Number.isFinite(quantity) || quantity <= 0) continue;

    merged.set(cardPrintId, (merged.get(cardPrintId) || 0) + quantity);
  }

  return Array.from(merged.entries()).map(([cardPrintId, quantity]) => ({
    cardPrintId,
    quantity,
  }));
}

function getFromLookup<T>(lookup: Map<string, T> | Record<string, T>, key: string) {
  if (lookup instanceof Map) return lookup.get(key);
  return lookup[key];
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

function rangeStart(range: PortfolioRange, now: Date) {
  if (range === "ALL") return null;

  const start = new Date(now);
  switch (range) {
    case "24H":
      start.setHours(start.getHours() - 24);
      break;
    case "7D":
      start.setDate(start.getDate() - 7);
      break;
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6M":
      start.setMonth(start.getMonth() - 6);
      break;
    default:
      return null;
  }

  return start;
}

async function defaultLoadHistory(
  cardPrintIds: string[],
  range: PortfolioRange,
): Promise<Map<string, PortfolioPriceHistoryPoint[]>> {
  const ids = Array.from(new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean)));
  const history = new Map<string, PortfolioPriceHistoryPoint[]>();
  if (!ids.length) return history;

  const sql = createPostgresClient();
  const now = new Date();
  const start = rangeStart(range, now);
  const params: Array<string | string[]> = [ids];
  const query = buildPortfolioHistoryQuery(Boolean(start));

  if (start) {
    params.push(start.toISOString());
  }

  const rows = await sql.unsafe(
    query,
    params,
  );

  for (const row of toPlainRows<PortfolioPriceHistoryPoint>(rows)) {
    const bucket = history.get(row.cardPrintId) || [];
    bucket.push({
      cardPrintId: row.cardPrintId,
      recordedAt: row.recordedAt,
      price: pricingShared.parseNullableNumber(row.price),
      externalProductId: row.externalProductId ?? null,
      externalVariantId: row.externalVariantId ?? null,
      approvedActive: row.approvedActive,
    });
    history.set(row.cardPrintId, bucket);
  }

  return history;
}

export function buildPortfolioHistoryQuery(hasBoundarySeed: boolean) {
  let query = `
    with eligible_history as (
      select
        history.card_print_id as card_print_id,
        history.external_product_id as external_product_id,
        history.external_variant_id as external_variant_id,
        history.recorded_at as recorded_at,
        history.price_nm as price_nm
      from card_print_price_history history
      join card_prints cp
        on cp.id = history.card_print_id
      join card_print_market_links link
        on link.card_print_id = cp.id
       and link.external_product_id = cp.active_external_product_id
       and link.approved_at is not null
       and link.mapping_status = 'exact'
      where history.card_print_id = any($1::text[])
        and history.source_id = 'justtcg'
        and history.external_product_id = cp.active_external_product_id
        and history.external_variant_id = cp.active_external_variant_id
    )
  `;

  if (hasBoundarySeed) {
    query += `
      , boundary_seed as (
        select distinct on (card_print_id)
          card_print_id,
          external_product_id,
          external_variant_id,
          recorded_at,
          price_nm
        from eligible_history
        where recorded_at < $2::timestamptz
        order by card_print_id, recorded_at desc
      )
      select
        combined.card_print_id as "cardPrintId",
        combined.external_product_id as "externalProductId",
        combined.external_variant_id as "externalVariantId",
        combined.recorded_at::text as "recordedAt",
        combined.price_nm as "price",
        true as "approvedActive"
      from (
        select * from eligible_history where recorded_at >= $2::timestamptz
        union all
        select * from boundary_seed
      ) combined
      order by combined.card_print_id asc, combined.recorded_at asc
    `;
  } else {
    query += `
      select
        eligible_history.card_print_id as "cardPrintId",
        eligible_history.external_product_id as "externalProductId",
        eligible_history.external_variant_id as "externalVariantId",
        eligible_history.recorded_at::text as "recordedAt",
        eligible_history.price_nm as "price",
        true as "approvedActive"
      from eligible_history
      order by eligible_history.card_print_id asc, eligible_history.recorded_at asc
    `;
  }

  return query;
}

export function getPortfolioHistoryQueryForTesting(hasBoundarySeed: boolean) {
  return buildPortfolioHistoryQuery(hasBoundarySeed);
}

function historyMatchesActivePrice(
  point: PortfolioPriceHistoryPoint,
  currentPrice: CardPrintRuntimePrice | undefined,
) {
  if (point.approvedActive === false) return false;
  if (
    point.externalProductId &&
    currentPrice?.status === "priced" &&
    point.externalProductId !== currentPrice.externalProductId
  ) {
    return false;
  }
  if (
    point.externalVariantId &&
    currentPrice?.status === "priced" &&
    point.externalVariantId !== (currentPrice as { externalVariantId?: string | null }).externalVariantId
  ) {
    return false;
  }

  return true;
}

function chartPointsForItems(
  items: Array<{ cardPrintId: string; quantity: number }>,
  priceLookup: Map<string, CardPrintRuntimePrice> | Record<string, CardPrintRuntimePrice>,
  historyLookup: Map<string, PortfolioPriceHistoryPoint[]> | Record<string, PortfolioPriceHistoryPoint[]>,
  boundaryDate?: string | null,
) {
  const dates = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  const effectiveHistoryLookup = new Map<string, PortfolioPriceHistoryPoint[]>();

  for (const item of items) {
    const currentPrice = getFromLookup(priceLookup, item.cardPrintId);
    const history = (getFromLookup(historyLookup, item.cardPrintId) || []).filter((point) =>
      historyMatchesActivePrice(point, currentPrice),
    );
    effectiveHistoryLookup.set(item.cardPrintId, history);

    for (const point of history) {
      const pointDate = point.recordedAt.slice(0, 10);
      if (!boundaryDate || pointDate >= boundaryDate) {
        dates.add(pointDate);
      }
    }
  }

  if (boundaryDate) {
    dates.add(boundaryDate);
  }
  dates.add(today);

  const orderedDates = Array.from(dates).sort((left, right) => left.localeCompare(right));
  const series: Array<{ date: string; value: number }> = [];

  for (const date of orderedDates) {
    let value = 0;

    for (const item of items) {
      const currentPrice = getFromLookup(priceLookup, item.cardPrintId);
      const history = (effectiveHistoryLookup.get(item.cardPrintId) || []).filter(
        (point) => point.recordedAt.slice(0, 10) <= date,
      );
      const latestHistoryPrice = history.length ? history[history.length - 1]?.price ?? null : null;

      let unitPrice = latestHistoryPrice;
      if (date === today) {
        unitPrice = currentPrice?.status === "priced" ? currentPrice.currentPrice : null;
      }

      if (unitPrice != null) {
        value += unitPrice * item.quantity;
      }
    }

    series.push({
      date,
      value: Number(value.toFixed(2)),
    });
  }

  return series;
}

export async function buildPortfolioSummary(
  items: PortfolioCollectionItem[],
  options?: {
    range?: PortfolioRange;
    limitMostValuable?: number;
    loadPrices?: LoadPortfolioPrices;
    loadHistory?: LoadPortfolioHistory;
  },
): Promise<PortfolioSummary> {
  const normalizedItems = normalizeItems(items);
  const cardPrintIds = normalizedItems.map((item) => item.cardPrintId);
  const loadPrices =
    options?.loadPrices ??
    (async (ids: string[]) => cardPrintPrices.getCardPrintRuntimePrices(ids));
  const loadHistory = options?.loadHistory ?? defaultLoadHistory;
  const range = options?.range || "1M";
  const limitMostValuable = Math.max(1, options?.limitMostValuable || 10);

  const [priceLookup, historyLookup] = await Promise.all([
    loadPrices(cardPrintIds),
    loadHistory(cardPrintIds, range),
  ]);

  const lineItems: PortfolioSummaryLineItem[] = normalizedItems.map((item) => {
    const price = getFromLookup(priceLookup, item.cardPrintId) ||
      pricingShared.createUnpricedCardPrintPrice(item.cardPrintId, "missing_active_approved_mapping");
    const currentValue =
      price.status === "priced"
        ? Number((price.currentPrice * item.quantity).toFixed(2))
        : 0;

    return {
      cardPrintId: item.cardPrintId,
      quantity: item.quantity,
      price,
      currentValue,
    };
  });

  const boundaryDate = rangeStart(range, new Date())?.toISOString().slice(0, 10) ?? null;

  const totalCollectionValue = Number(
    lineItems.reduce((sum, item) => sum + item.currentValue, 0).toFixed(2),
  );
  const pricedCount = lineItems.filter((item) => item.price.status === "priced").length;
  const unpricedCount = lineItems.length - pricedCount;
  const mostValuableItems = [...lineItems]
    .sort((left, right) => right.currentValue - left.currentValue)
    .slice(0, limitMostValuable);

  return {
    totalCollectionValue,
    pricedCount,
    unpricedCount,
    mostValuableItems,
    chartHistory: chartPointsForItems(normalizedItems, priceLookup, historyLookup, boundaryDate),
    lineItems,
  };
}

export async function translateLegacyCollectionItems<T extends { quantity: number }>(
  items: T[],
  resolveCardPrintId: (item: T) => Promise<string | null>,
): Promise<PortfolioCollectionItem[]> {
  const translated: PortfolioCollectionItem[] = [];

  for (const item of items) {
    const cardPrintId = await resolveCardPrintId(item);
    if (!cardPrintId) continue;

    translated.push({
      cardPrintId,
      quantity: item.quantity,
    });
  }

  return translated;
}

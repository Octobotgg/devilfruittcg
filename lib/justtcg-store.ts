import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../db/postgres") = require("../db/postgres.ts");

const JUSTTCG_SOURCE_ID = "justtcg";
const JUSTTCG_STALE_THRESHOLD_MS = 8 * 24 * 60 * 60 * 1000;

type ReadModelPriceRow = {
  cardPrintId: string;
  printedCardCode: string | null;
  cardId: string | null;
  externalProductId: string | null;
  productKind: string | null;
  mappingApproved: boolean;
  priceMarket: string | number | null;
  priceNm: string | number | null;
  priceLp: string | number | null;
  priceChange24h: string | number | null;
  priceChange7d: string | number | null;
  priceChange30d: string | number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
};

type ReadModelHistoryRow = {
  cardPrintId: string;
  printedCardCode: string | null;
  cardId: string | null;
  externalProductId: string | null;
  recordedAt: string;
  priceNm: string | number | null;
};

export type JustTcgPriceSummary = {
  cardId: string;
  justtcgId: string;
  marketPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  priceLp: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
  stale: boolean;
  cached: true;
  source: "justtcg";
};

export type JustTcgHistoryPoint = {
  ts: number;
  date: string;
  tcgMarket: number | null;
};

export type JustTcgStoreOptions = {
  loadCurrentRows?: (requestedIds: string[]) => Promise<ReadModelPriceRow[]>;
  loadHistoryRows?: (params: {
    requestedIds: string[];
    rangeDays: number;
    priceRow: ReadModelPriceRow;
  }) => Promise<ReadModelHistoryRow[]>;
  now?: () => number;
};

function parseNullableNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRequestedId(cardId: string) {
  return cardId.trim().toUpperCase();
}

function baseRequestedId(cardId: string) {
  return normalizeRequestedId(cardId).replace(/_[A-Z0-9]+$/u, "");
}

function candidateLookupIds(cardIds: string[]) {
  return Array.from(
    new Set(
      cardIds
        .flatMap((cardId) => {
          const normalized = normalizeRequestedId(cardId);
          const baseId = baseRequestedId(cardId);
          return normalized === baseId ? [normalized] : [normalized, baseId];
        })
        .filter(Boolean),
    ),
  );
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

function extractJustTcgId(externalProductId: string | null | undefined) {
  const value = String(externalProductId || "").trim();
  return value.startsWith("justtcg:") ? value.slice("justtcg:".length) : value;
}

function rowAliases(row: ReadModelPriceRow | ReadModelHistoryRow) {
  return new Set(
    [row.printedCardCode, row.cardId]
      .map((value) => normalizeRequestedId(String(value || "")))
      .filter(Boolean),
  );
}

function rowMatchesRequestedId(
  requestedId: string,
  row: ReadModelPriceRow | ReadModelHistoryRow,
) {
  const normalized = normalizeRequestedId(requestedId);
  const baseId = baseRequestedId(requestedId);
  const aliases = rowAliases(row);
  return aliases.has(normalized) || aliases.has(baseId);
}

function usablePriceRow(row: ReadModelPriceRow | null | undefined): row is ReadModelPriceRow {
  return Boolean(
    row &&
      row.externalProductId &&
      row.mappingApproved &&
      normalizeProductKind(row.productKind) === "raw_card",
  );
}

function rowUpdatedAtMs(row: ReadModelPriceRow) {
  const updatedAt = row.updatedAt || row.fetchedAt;
  return updatedAt ? Date.parse(updatedAt) : Number.NaN;
}

function chooseBestPriceRow(requestedId: string, rows: ReadModelPriceRow[]) {
  const normalized = normalizeRequestedId(requestedId);
  const baseId = baseRequestedId(requestedId);

  const candidates = rows.filter((row) => rowMatchesRequestedId(requestedId, row));
  if (!candidates.length) return null;

  return [...candidates].sort((left, right) => {
    const leftPrinted = normalizeRequestedId(String(left.printedCardCode || ""));
    const rightPrinted = normalizeRequestedId(String(right.printedCardCode || ""));
    const leftExact = leftPrinted === normalized ? 1 : 0;
    const rightExact = rightPrinted === normalized ? 1 : 0;
    if (leftExact !== rightExact) return rightExact - leftExact;

    const leftBase = leftPrinted === baseId ? 1 : 0;
    const rightBase = rightPrinted === baseId ? 1 : 0;
    if (leftBase !== rightBase) return rightBase - leftBase;

    const leftUsable = usablePriceRow(left) ? 1 : 0;
    const rightUsable = usablePriceRow(right) ? 1 : 0;
    if (leftUsable !== rightUsable) return rightUsable - leftUsable;

    return rowUpdatedAtMs(right) - rowUpdatedAtMs(left);
  })[0] || null;
}

function summaryFromRow(row: ReadModelPriceRow, now: number): JustTcgPriceSummary {
  const updatedAt = row.updatedAt || row.fetchedAt || null;
  const updatedAtMs = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const stale = Number.isFinite(updatedAtMs)
    ? now - updatedAtMs > JUSTTCG_STALE_THRESHOLD_MS
    : true;

  return {
    cardId: normalizeRequestedId(String(row.printedCardCode || row.cardId || "")),
    justtcgId: extractJustTcgId(row.externalProductId),
    marketPrice: parseNullableNumber(row.priceNm),
    averagePrice: parseNullableNumber(row.priceNm),
    lowestPrice: null,
    highestPrice: null,
    priceLp: parseNullableNumber(row.priceLp),
    priceChange24h: parseNullableNumber(row.priceChange24h),
    priceChange7d: parseNullableNumber(row.priceChange7d),
    priceChange30d: parseNullableNumber(row.priceChange30d),
    updatedAt,
    fetchedAt: row.fetchedAt || null,
    stale,
    cached: true,
    source: "justtcg",
  };
}

function historyPointFromRow(row: ReadModelHistoryRow): JustTcgHistoryPoint | null {
  const ts = Date.parse(row.recordedAt);
  if (!Number.isFinite(ts)) return null;

  return {
    ts,
    date: new Date(ts).toISOString().slice(0, 10),
    tcgMarket: parseNullableNumber(row.priceNm),
  };
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

async function defaultLoadCurrentRows(requestedIds: string[]): Promise<ReadModelPriceRow[]> {
  const lookupIds = candidateLookupIds(requestedIds);
  if (!lookupIds.length) return [];

  const sql = createPostgresClient();
  const rows = await sql.unsafe(
    `
      select
        cp.id as "cardPrintId",
        cp.printed_card_code as "printedCardCode",
        cards.id as "cardId",
        cp.active_external_product_id as "externalProductId",
        ep.product_kind as "productKind",
        coalesce(link.approved_at is not null and link.mapping_status <> 'rejected', false) as "mappingApproved",
        current_prices.price_market as "priceMarket",
        current_prices.price_nm as "priceNm",
        current_prices.price_lp as "priceLp",
        current_prices.price_change_24h as "priceChange24h",
        current_prices.price_change_7d as "priceChange7d",
        current_prices.price_change_30d as "priceChange30d",
        current_prices.updated_at::text as "updatedAt",
        current_prices.fetched_at::text as "fetchedAt"
      from card_prints cp
      join cards on cards.id = cp.card_id
      left join external_products ep
        on ep.id = cp.active_external_product_id
      left join card_print_market_links link
        on link.card_print_id = cp.id
       and link.external_product_id = cp.active_external_product_id
       and link.approved_at is not null
       and link.mapping_status <> 'rejected'
      left join card_print_price_current current_prices
        on current_prices.card_print_id = cp.id
       and current_prices.external_product_id = cp.active_external_product_id
       and current_prices.source_id = $2
      where cp.is_active = true
        and (
          upper(coalesce(cp.printed_card_code, '')) = any($1::text[])
          or upper(cards.id) = any($1::text[])
        )
    `,
    [lookupIds, JUSTTCG_SOURCE_ID],
  );

  return toPlainRows<ReadModelPriceRow>(rows);
}

async function defaultLoadHistoryRows(params: {
  requestedIds: string[];
  rangeDays: number;
  priceRow: ReadModelPriceRow;
}): Promise<ReadModelHistoryRow[]> {
  if (!usablePriceRow(params.priceRow)) return [];

  const sql = createPostgresClient();
  const fromIso = new Date(Date.now() - Math.max(1, params.rangeDays) * 24 * 60 * 60 * 1000).toISOString();
  const rows = await sql.unsafe(
    `
      select
        history.card_print_id as "cardPrintId",
        cp.printed_card_code as "printedCardCode",
        cards.id as "cardId",
        history.external_product_id as "externalProductId",
        history.recorded_at::text as "recordedAt",
        history.price_nm as "priceNm"
      from card_print_price_history history
      join card_prints cp
        on cp.id = history.card_print_id
      join cards
        on cards.id = cp.card_id
      join card_print_market_links link
        on link.card_print_id = cp.id
       and link.external_product_id = cp.active_external_product_id
       and link.approved_at is not null
       and link.mapping_status <> 'rejected'
      where history.card_print_id = $1
        and history.external_product_id = $2
        and history.source_id = $3
        and history.recorded_at >= $4::timestamptz
      order by history.recorded_at asc
    `,
    [
      params.priceRow.cardPrintId,
      params.priceRow.externalProductId,
      JUSTTCG_SOURCE_ID,
      fromIso,
    ],
  );

  return toPlainRows<ReadModelHistoryRow>(rows);
}

export async function getJustTcgPriceSummaries(
  cardIds: string[],
  options?: JustTcgStoreOptions,
) {
  const loadCurrentRows = options?.loadCurrentRows ?? defaultLoadCurrentRows;
  const now = (options?.now ?? Date.now)();
  const rows = await loadCurrentRows(cardIds.map((cardId) => normalizeRequestedId(cardId)));
  const selected: Record<string, JustTcgPriceSummary> = {};

  for (const cardId of cardIds) {
    const requestedId = normalizeRequestedId(cardId);
    if (!requestedId) continue;

    const row = chooseBestPriceRow(requestedId, rows);
    if (!usablePriceRow(row)) continue;

    const summary = summaryFromRow(row, now);
    selected[requestedId] = summary;

    for (const alias of rowAliases(row)) {
      selected[alias] = summary;
    }
  }

  return selected;
}

export async function getJustTcgPriceDetail(
  cardId: string,
  rangeDays: number,
  options?: JustTcgStoreOptions,
) {
  const requestedId = normalizeRequestedId(cardId);
  const loadCurrentRows = options?.loadCurrentRows ?? defaultLoadCurrentRows;
  const loadHistoryRows = options?.loadHistoryRows ?? defaultLoadHistoryRows;
  const now = (options?.now ?? Date.now)();

  const rows = await loadCurrentRows([requestedId]);
  const row = chooseBestPriceRow(requestedId, rows);

  if (!usablePriceRow(row)) {
    return {
      price: null,
      points: [] as JustTcgHistoryPoint[],
    };
  }

  const historyRows = await loadHistoryRows({
    requestedIds: [requestedId],
    rangeDays,
    priceRow: row,
  });

  const points = historyRows
    .filter((historyRow) => rowMatchesRequestedId(requestedId, historyRow))
    .filter((historyRow) => historyRow.externalProductId === row.externalProductId)
    .map((historyRow) => historyPointFromRow(historyRow))
    .filter((point): point is JustTcgHistoryPoint => Boolean(point))
    .sort((left, right) => left.ts - right.ts);

  return {
    price: summaryFromRow(row, now),
    points,
  };
}

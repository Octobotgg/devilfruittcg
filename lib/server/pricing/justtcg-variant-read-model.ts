import { createRequire } from "node:module";

import type { CardPrintRuntimePrice, UnpricedReason } from "./external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");
const pricingShared = require("./external-products.ts") as typeof import("./external-products");

type VariantPriceRow = {
  cardPrintId: string;
  cardId: string | null;
  printedCardCode: string | null;
  officialName: string | null;
  officialSetCode: string | null;
  officialSetName: string | null;
  externalProductId: string | null;
  productKind: string | null;
  justtcgTitle: string | null;
  justtcgImageUrl: string | null;
  externalVariantId?: string | null;
  activeExternalVariantId?: string | null;
  variantCondition?: string | null;
  variantPrinting?: string | null;
  variantLanguage?: string | null;
  mappingApproved: boolean;
  priceMarket: string | number | null;
  priceNm: string | number | null;
  priceLp: string | number | null;
  priceChange24h: string | number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
};

export type VariantPriceHistoryRow = {
  cardPrintId: string;
  cardId: string | null;
  printedCardCode: string | null;
  externalProductId: string | null;
  externalVariantId: string | null;
  recordedAt: string;
  priceNm: string | number | null;
};

export type VariantRuntimePrice = CardPrintRuntimePrice & {
  externalVariantId?: string | null;
  justtcgVariant?: {
    externalVariantId: string | null;
    condition: string | null;
    printing: string | null;
    language: string | null;
  };
};

export type LoadVariantPriceRows = (cardPrintIds: string[]) => Promise<VariantPriceRow[]>;
export type LoadVariantHistoryRows = (params: {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  rangeDays: number;
}) => Promise<VariantPriceHistoryRow[]>;

const JUSTTCG_SOURCE_ID = "justtcg";
const JUSTTCG_STALE_THRESHOLD_MS = 8 * 24 * 60 * 60 * 1000;

function parseNullableNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRequestedId(cardId: string) {
  return cardId.trim().toUpperCase();
}

function baseRequestedId(cardId: string) {
  const normalized = normalizeRequestedId(cardId);
  const publicPrintMatch = normalized.match(/^([A-Z0-9]+-\d+[A-Z]?)(?:[_-].+)?$/u);
  if (publicPrintMatch?.[1]) return publicPrintMatch[1];
  return normalized.replace(/_[A-Z0-9]+$/u, "");
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

function isNearMintVariant(condition: string | null | undefined) {
  return String(condition || "").trim().toLowerCase() === "near mint";
}

function rowAliases(row: VariantPriceRow | VariantPriceHistoryRow) {
  return new Set(
    [row.printedCardCode, row.cardId]
      .map((value) => normalizeRequestedId(String(value || "")))
      .filter(Boolean),
  );
}

function rowMatchesRequestedId(
  requestedId: string,
  row: VariantPriceRow | VariantPriceHistoryRow,
) {
  const normalized = normalizeRequestedId(requestedId);
  const baseId = baseRequestedId(requestedId);
  const aliases = rowAliases(row);
  return aliases.has(normalized) || aliases.has(baseId);
}

function usablePriceRow(row: VariantPriceRow | null | undefined): row is VariantPriceRow {
  return Boolean(
    row &&
      row.externalProductId &&
      row.externalVariantId &&
      row.activeExternalVariantId &&
      row.mappingApproved &&
      isNearMintVariant(row.variantCondition) &&
      normalizeProductKind(row.productKind) === "raw_card",
  );
}

function rowUpdatedAtMs(row: VariantPriceRow) {
  const updatedAt = row.updatedAt || row.fetchedAt;
  return updatedAt ? Date.parse(updatedAt) : Number.NaN;
}

function chooseBestPriceRow(requestedId: string, rows: VariantPriceRow[]) {
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

function summaryFromRow(row: VariantPriceRow, now: number): VariantRuntimePrice {
  const updatedAt = row.updatedAt || row.fetchedAt || null;
  const updatedAtMs = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const stale = Number.isFinite(updatedAtMs)
    ? now - updatedAtMs > JUSTTCG_STALE_THRESHOLD_MS
    : true;

  return {
    status: "priced",
    kind: "raw_card",
    cardPrintId: row.cardPrintId,
    cardId: row.cardId,
    printedCardCode: row.printedCardCode,
    currency: pricingShared.USD_CURRENCY,
    currentPrice: parseNullableNumber(row.priceNm) as number,
    currentPriceType: "near_mint",
    priceMarket: parseNullableNumber(row.priceMarket),
    priceLp: parseNullableNumber(row.priceLp),
    priceChange24h: parseNullableNumber(row.priceChange24h),
    updatedAt,
    fetchedAt: row.fetchedAt || null,
    externalProductId: String(row.externalProductId),
    externalVariantId: row.externalVariantId,
    justtcg: {
      title: row.justtcgTitle,
      imageUrl: row.justtcgImageUrl,
    },
    official: {
      name: row.officialName,
      setCode: row.officialSetCode,
      setName: row.officialSetName,
    },
    justtcgVariant: {
      externalVariantId: row.externalVariantId,
      condition: row.variantCondition,
      printing: row.variantPrinting,
      language: row.variantLanguage,
    },
    stale,
    cached: true,
    source: "justtcg",
  } as VariantRuntimePrice;
}

function createUnpriced(cardPrintId: string, reason: UnpricedReason): VariantRuntimePrice {
  return {
    status: "unpriced",
    kind: "raw_card",
    cardPrintId,
    reason,
    currency: pricingShared.USD_CURRENCY,
  };
}

function resolveRuntimePrice(cardPrintId: string, row: VariantPriceRow | null | undefined): VariantRuntimePrice {
  if (!row || !row.externalProductId || !row.mappingApproved) {
    return createUnpriced(cardPrintId, "missing_active_approved_mapping");
  }

  if (normalizeProductKind(row.productKind) !== "raw_card") {
    return createUnpriced(cardPrintId, "kind_mismatch");
  }

  if (
    !row.activeExternalVariantId ||
    !row.externalVariantId ||
    row.activeExternalVariantId !== row.externalVariantId ||
    !isNearMintVariant(row.variantCondition)
  ) {
    return createUnpriced(cardPrintId, "missing_active_approved_mapping");
  }

  const currentPrice = parseNullableNumber(row.priceNm);
  if (currentPrice == null) {
    return createUnpriced(cardPrintId, "missing_current_price");
  }

  return summaryFromRow(row, Date.now());
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

async function defaultLoadCurrentRows(requestedIds: string[]): Promise<VariantPriceRow[]> {
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
        cp.active_external_variant_id as "activeExternalVariantId",
        current_prices.external_variant_id as "externalVariantId",
        ep.raw_payload as "externalRawPayload",
        ep.product_kind as "productKind",
        ep.name as "justtcgTitle",
        ep.image_url as "justtcgImageUrl",
        variant.condition as "variantCondition",
        variant.printing as "variantPrinting",
        variant.language as "variantLanguage",
        coalesce(link.approved_at is not null and link.mapping_status = 'exact', false) as "mappingApproved",
        current_prices.price_market as "priceMarket",
        current_prices.price_nm as "priceNm",
        current_prices.price_lp as "priceLp",
        current_prices.price_change_24h as "priceChange24h",
        current_prices.updated_at::text as "updatedAt",
        current_prices.fetched_at::text as "fetchedAt",
        cards.name as "officialName",
        releases.code as "officialSetCode",
        releases.name as "officialSetName"
      from card_prints cp
      join cards on cards.id = cp.card_id
      join releases on releases.id = cp.release_id
      left join external_products ep
        on ep.id = cp.active_external_product_id
      left join external_product_variants variant
        on variant.id = cp.active_external_variant_id
       and variant.external_product_id = cp.active_external_product_id
      left join card_print_market_links link
        on link.card_print_id = cp.id
       and link.external_product_id = cp.active_external_product_id
       and link.approved_at is not null
       and link.mapping_status = 'exact'
      left join card_print_price_current current_prices
        on current_prices.card_print_id = cp.id
       and current_prices.external_product_id = cp.active_external_product_id
       and current_prices.external_variant_id = cp.active_external_variant_id
       and current_prices.source_id = $2
      where cp.is_active = true
        and (
          upper(coalesce(cp.printed_card_code, '')) = any($1::text[])
          or upper(cards.id) = any($1::text[])
        )
    `,
    [lookupIds, JUSTTCG_SOURCE_ID],
  );

  return toPlainRows<VariantPriceRow>(rows);
}

async function defaultLoadHistoryRows(params: {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  rangeDays: number;
}): Promise<VariantPriceHistoryRow[]> {
  const sql = createPostgresClient();
  const fromIso = new Date(Date.now() - Math.max(1, params.rangeDays) * 24 * 60 * 60 * 1000).toISOString();
  const rows = await sql.unsafe(
    `
      select *
      from (
        select
          history.card_print_id as "cardPrintId",
          cp.printed_card_code as "printedCardCode",
          cards.id as "cardId",
          history.external_product_id as "externalProductId",
          history.external_variant_id as "externalVariantId",
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
         and link.mapping_status = 'exact'
        where history.card_print_id = $1
          and history.external_product_id = $2
          and history.external_variant_id = $3
          and history.source_id = $4
          and history.recorded_at >= $5::timestamptz

        union all

        select
          cp.id as "cardPrintId",
          cp.printed_card_code as "printedCardCode",
          cards.id as "cardId",
          snapshots.external_product_id as "externalProductId",
          snapshots.external_variant_id as "externalVariantId",
          snapshots.captured_at::text as "recordedAt",
          snapshots.price_nm as "priceNm"
        from price_snapshots snapshots
        join card_prints cp
          on cp.id = $1
        join cards
          on cards.id = cp.card_id
        where snapshots.external_product_id = $2
          and snapshots.external_variant_id = $3
          and snapshots.captured_at >= $5::timestamptz
      ) history_rows
      order by "recordedAt" asc
    `,
    [
      params.cardPrintId,
      params.externalProductId,
      params.externalVariantId,
      JUSTTCG_SOURCE_ID,
      fromIso,
    ],
  );

  return toPlainRows<VariantPriceHistoryRow>(rows);
}

export function resolveJustTcgVariantRuntimePrice(
  cardPrintId: string,
  row: VariantPriceRow | null | undefined,
): VariantRuntimePrice {
  return resolveRuntimePrice(cardPrintId, row);
}

export async function getCardPrintRuntimePrice(
  cardPrintId: string,
  options?: {
    loadRows?: LoadVariantPriceRows;
  },
): Promise<VariantRuntimePrice> {
  const loadRows = options?.loadRows ?? defaultLoadCurrentRows;
  const rows = await loadRows([cardPrintId]);
  const row = rows.find((candidate) => candidate.cardPrintId === cardPrintId) || null;

  return resolveRuntimePrice(cardPrintId, row);
}

export async function getCardPrintRuntimePrices(
  cardPrintIds: string[],
  options?: {
    loadRows?: LoadVariantPriceRows;
  },
): Promise<Map<string, VariantRuntimePrice>> {
  const loadRows = options?.loadRows ?? defaultLoadCurrentRows;
  const rows = await loadRows(cardPrintIds);
  const indexedRows = new Map<string, VariantPriceRow>();
  for (const row of rows) {
    if (!indexedRows.has(row.cardPrintId)) {
      indexedRows.set(row.cardPrintId, row);
    }
  }

  const results = new Map<string, VariantRuntimePrice>();
  for (const cardPrintId of new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean))) {
    results.set(cardPrintId, resolveRuntimePrice(cardPrintId, indexedRows.get(cardPrintId)));
  }

  return results;
}

export async function getCardPrintRuntimeDetail(
  cardPrintId: string,
  rangeDays: number,
  options?: {
    loadRows?: LoadVariantPriceRows;
    loadHistoryRows?: LoadVariantHistoryRows;
  },
): Promise<{
  price: VariantRuntimePrice | null;
  points: Array<{ ts: number; date: string; tcgMarket: number | null }>;
}> {
  const loadRows = options?.loadRows ?? defaultLoadCurrentRows;
  const loadHistoryRows = options?.loadHistoryRows ?? defaultLoadHistoryRows;
  const rows = await loadRows([cardPrintId]);
  const row = rows.find((candidate) => candidate.cardPrintId === cardPrintId) || null;
  const price = resolveRuntimePrice(cardPrintId, row);

  if (price.status !== "priced" || !row?.externalProductId || !row.externalVariantId) {
    return { price: null, points: [] };
  }

  const historyRows = await loadHistoryRows({
    cardPrintId,
    externalProductId: row.externalProductId,
    externalVariantId: row.externalVariantId,
    rangeDays,
  });

  const points = historyRows
    .filter((historyRow) => rowMatchesRequestedId(cardPrintId, historyRow))
    .filter((historyRow) => !historyRow.externalProductId || historyRow.externalProductId === row.externalProductId)
    .filter((historyRow) => !historyRow.externalVariantId || historyRow.externalVariantId === row.externalVariantId)
    .map((historyRow) => {
      const ts = Date.parse(historyRow.recordedAt);
      if (!Number.isFinite(ts)) return null;
      return {
        ts,
        date: new Date(ts).toISOString().slice(0, 10),
        tcgMarket: parseNullableNumber(historyRow.priceNm),
      };
    })
    .filter((point): point is { ts: number; date: string; tcgMarket: number | null } => Boolean(point))
    .sort((left, right) => left.ts - right.ts);

  return { price, points };
}

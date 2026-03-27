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
  externalVariantId: string | null;
  activeExternalVariantId: string | null;
  externalRawPayload?: Record<string, unknown> | null;
  productKind: string | null;
  variantCondition?: string | null;
  variantPrinting?: string | null;
  variantLanguage?: string | null;
  displayTitle?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
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
  externalVariantId?: string | null;
  recordedAt: string;
  priceNm: string | number | null;
};

type JustTcgVariant = {
  condition?: string | null;
  printing?: string | null;
  language?: string | null;
  priceHistory?: Array<{ p?: number; t?: number }>;
  priceHistory30d?: Array<{ p?: number; t?: number }>;
  priceHistory90d?: Array<{ p?: number; t?: number }>;
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
      row.externalVariantId &&
      row.mappingApproved &&
      isNearMintVariant(row.variantCondition) &&
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

function variantScore(variant: JustTcgVariant) {
  const condition = String(variant.condition || "").toLowerCase();
  const printing = String(variant.printing || "").toLowerCase();
  const language = String(variant.language || "").toLowerCase();

  let score = 0;
  if (language === "english") score += 100;
  if (condition === "near mint") score += 60;
  if (printing === "normal") score += 20;
  if (printing === "foil") score += 10;
  return score;
}

function pickPreferredVariant(rawPayload: Record<string, unknown> | null | undefined) {
  const variants = Array.isArray(rawPayload?.variants) ? (rawPayload.variants as JustTcgVariant[]) : [];
  if (!variants.length) return null;
  return [...variants].sort((left, right) => variantScore(right) - variantScore(left))[0] || null;
}

function historyPointFromRawEntry(entry: { p?: number; t?: number } | null | undefined) {
  if (!entry || typeof entry.t !== "number") return null;

  const ts = entry.t * 1000;
  return {
    ts,
    date: new Date(ts).toISOString().slice(0, 10),
    tcgMarket: typeof entry.p === "number" ? entry.p : null,
  };
}

function supplementalHistoryFromRaw(
  rawPayload: Record<string, unknown> | null | undefined,
  rangeDays: number,
  now: number,
) {
  const variant = pickPreferredVariant(rawPayload);
  if (!variant) return [] as JustTcgHistoryPoint[];

  const source =
    rangeDays > 30
      ? variant.priceHistory90d || variant.priceHistory30d || variant.priceHistory || []
      : rangeDays > 7
        ? variant.priceHistory30d || variant.priceHistory || []
        : variant.priceHistory || [];
  const fromTs = now - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000;

  return source
    .map((entry) => historyPointFromRawEntry(entry))
    .filter((point): point is JustTcgHistoryPoint => point !== null && point.ts >= fromTs);
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

const DEFAULT_LOAD_CURRENT_ROWS_QUERY = `
  select
    cp.id as "cardPrintId",
    cp.printed_card_code as "printedCardCode",
    cards.id as "cardId",
    published.external_product_id as "externalProductId",
    published.external_variant_id as "activeExternalVariantId",
    published.external_variant_id as "externalVariantId",
    ep.raw_payload as "externalRawPayload",
    ep.product_kind as "productKind",
    variant.condition as "variantCondition",
    variant.printing as "variantPrinting",
    variant.language as "variantLanguage",
    display.display_title as "displayTitle",
    display.display_treatment_label as "displayTreatmentLabel",
    display.display_image_url as "displayImageUrl",
    true as "mappingApproved",
    published.price_market as "priceMarket",
    published.price_nm as "priceNm",
    published.price_lp as "priceLp",
    current_prices.price_change_24h as "priceChange24h",
    current_prices.price_change_7d as "priceChange7d",
    current_prices.price_change_30d as "priceChange30d",
    published.updated_at::text as "updatedAt",
    published.published_at::text as "fetchedAt"
  from card_prints cp
  join cards on cards.id = cp.card_id
  left join card_print_price_published published
    on published.card_print_id = cp.id
   and published.source_id = $2
  left join external_products ep
    on ep.id = published.external_product_id
  left join external_product_variants variant
    on variant.id = published.external_variant_id
   and variant.external_product_id = published.external_product_id
  left join card_print_display_published display
    on display.card_print_id = cp.id
  left join card_print_price_current current_prices
    on current_prices.card_print_id = cp.id
   and current_prices.external_product_id = published.external_product_id
   and current_prices.external_variant_id = published.external_variant_id
   and current_prices.source_id = published.source_id
  where cp.is_active = true
    and (
      upper(coalesce(cp.printed_card_code, '')) = any($1::text[])
      or upper(cards.id) = any($1::text[])
    )
`;

export function getJustTcgCurrentPriceQueryForTesting() {
  return DEFAULT_LOAD_CURRENT_ROWS_QUERY;
}

async function defaultLoadCurrentRows(requestedIds: string[]): Promise<ReadModelPriceRow[]> {
  const lookupIds = candidateLookupIds(requestedIds);
  if (!lookupIds.length) return [];

  const sql = createPostgresClient();
  const rows = await sql.unsafe(DEFAULT_LOAD_CURRENT_ROWS_QUERY, [lookupIds, JUSTTCG_SOURCE_ID]);

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
      params.priceRow.cardPrintId,
      params.priceRow.externalProductId,
      params.priceRow.externalVariantId,
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

  const primaryPoints = historyRows
    .filter((historyRow) => rowMatchesRequestedId(requestedId, historyRow))
    .filter((historyRow) => !historyRow.externalProductId || historyRow.externalProductId === row.externalProductId)
    .filter((historyRow) => !historyRow.externalVariantId || historyRow.externalVariantId === row.externalVariantId)
    .map((historyRow) => historyPointFromRow(historyRow))
    .filter((point): point is JustTcgHistoryPoint => Boolean(point))
    .sort((left, right) => left.ts - right.ts);
  const supplementalPoints = supplementalHistoryFromRaw(row.externalRawPayload || null, rangeDays, now);
  const pointsByTs = new Map<number, JustTcgHistoryPoint>();

  for (const point of supplementalPoints) {
    pointsByTs.set(point.ts, point);
  }
  for (const point of primaryPoints) {
    pointsByTs.set(point.ts, point);
  }

  return {
    price: summaryFromRow(row, now),
    points: [...pointsByTs.values()].sort((left, right) => left.ts - right.ts),
  };
}

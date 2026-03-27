import { createRequire } from "node:module";

import type { CardPrintRuntimePrice, UnpricedReason } from "./external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");
const pricingShared = require("./external-products.ts") as typeof import("./external-products");

export type PublishedCardPrintPriceRow = {
  cardPrintId: string;
  cardId?: string | null;
  printedCardCode?: string | null;
  officialName?: string | null;
  officialSetCode?: string | null;
  officialSetName?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  activeExternalVariantId?: string | null;
  productKind?: string | null;
  variantCondition?: string | null;
  variantPrinting?: string | null;
  variantLanguage?: string | null;
  justtcgTitle?: string | null;
  justtcgImageUrl?: string | null;
  displayTitle?: string | null;
  displaySetName?: string | null;
  displaySetCode?: string | null;
  displayRarity?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
  labelStatus?: string | null;
  priceMarket?: string | number | null;
  priceNm?: string | number | null;
  priceLp?: string | number | null;
  verificationStatus?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

export type PublishedCardPrintRuntimePrice = CardPrintRuntimePrice & {
  externalVariantId?: string | null;
  justtcgVariant?: {
    externalVariantId: string | null;
    condition: string | null;
    printing: string | null;
    language: string | null;
  };
};

export type LoadPublishedCardPrintRows = (
  cardPrintIds: string[],
) => Promise<PublishedCardPrintPriceRow[]>;

export type LoadPublishedCardPrintHistoryRows = (params: {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  rangeDays: number;
}) => Promise<
  Array<{
    cardPrintId: string;
    recordedAt: string;
    priceNm: string | number | null;
    externalProductId: string | null;
    externalVariantId: string | null;
  }>
>;

const JUSTTCG_SOURCE_ID = "justtcg";

function normalizeRequestedIds(cardPrintIds: string[]) {
  return Array.from(new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean)));
}

function isNearMintVariant(condition: string | null | undefined) {
  return String(condition || "").trim().toLowerCase() === "near mint";
}

function createUnpriced(cardPrintId: string, reason: UnpricedReason): PublishedCardPrintRuntimePrice {
  return {
    status: "unpriced",
    kind: "raw_card",
    cardPrintId,
    reason,
    currency: pricingShared.USD_CURRENCY,
  };
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

function resolvePublishedRuntimePrice(
  cardPrintId: string,
  row: PublishedCardPrintPriceRow | null | undefined,
): PublishedCardPrintRuntimePrice {
  if (!row) {
    return createUnpriced(cardPrintId, "missing_active_approved_mapping");
  }

  if (pricingShared.normalizeProductKind(row.productKind) !== "raw_card") {
    return createUnpriced(cardPrintId, "kind_mismatch");
  }

  if (!row.externalProductId || !row.externalVariantId) {
    return createUnpriced(cardPrintId, "missing_active_approved_mapping");
  }

  if (!isNearMintVariant(row.variantCondition) || (row.activeExternalVariantId && row.activeExternalVariantId !== row.externalVariantId)) {
    return createUnpriced(cardPrintId, "missing_active_approved_mapping");
  }

  const currentPrice = pricingShared.parseNullableNumber(row.priceNm);
  if (currentPrice == null) {
    return createUnpriced(cardPrintId, "missing_current_price");
  }

  const hasPublishedDisplayFields =
    "displayTitle" in row ||
    "displaySetName" in row ||
    "displaySetCode" in row ||
    "displayRarity" in row ||
    "displayTreatmentLabel" in row ||
    "displayImageUrl" in row;
  const runtimeTitle = hasPublishedDisplayFields
    ? String(row.displayTitle || row.officialName || "").trim() || row.justtcgTitle
    : row.justtcgTitle || String(row.officialName || "").trim() || null;

  return {
    status: "priced",
    kind: "raw_card",
    cardPrintId: row.cardPrintId,
    cardId: row.cardId,
    printedCardCode: row.printedCardCode,
    currency: pricingShared.USD_CURRENCY,
    currentPrice,
    currentPriceType: "near_mint",
    priceMarket: pricingShared.parseNullableNumber(row.priceMarket),
    priceLp: pricingShared.parseNullableNumber(row.priceLp),
    priceChange24h: null,
    updatedAt: row.updatedAt,
    fetchedAt: row.publishedAt,
    externalProductId: row.externalProductId,
    externalVariantId: row.externalVariantId,
    justtcg: {
      title: runtimeTitle,
      imageUrl: String(row.displayImageUrl || "").trim() || row.justtcgImageUrl,
    },
    official: {
      name: row.officialName,
      setCode: row.officialSetCode,
      setName: row.officialSetName,
    },
    justtcgVariant: {
      externalVariantId: row.externalVariantId,
      condition: row.variantCondition || null,
      printing: row.variantPrinting || null,
      language: row.variantLanguage || null,
    },
  } as PublishedCardPrintRuntimePrice;
}

async function defaultLoadRows(cardPrintIds: string[]): Promise<PublishedCardPrintPriceRow[]> {
  const ids = normalizeRequestedIds(cardPrintIds);
  if (!ids.length) return [];

  const sql = createPostgresClient();
  const rows = await sql.unsafe(
    `
      select
        cp.id as "cardPrintId",
        cards.id as "cardId",
        cp.printed_card_code as "printedCardCode",
        cards.name as "officialName",
        releases.code as "officialSetCode",
        releases.name as "officialSetName",
        published.external_product_id as "externalProductId",
        published.external_variant_id as "externalVariantId",
        cp.active_external_variant_id as "activeExternalVariantId",
        ep.product_kind as "productKind",
        variant.condition as "variantCondition",
        variant.printing as "variantPrinting",
        variant.language as "variantLanguage",
        ep.name as "justtcgTitle",
        ep.image_url as "justtcgImageUrl",
        display.display_title as "displayTitle",
        display.display_set_name as "displaySetName",
        display.display_set_code as "displaySetCode",
        display.display_rarity as "displayRarity",
        display.display_treatment_label as "displayTreatmentLabel",
        display.display_image_url as "displayImageUrl",
        display.label_status as "labelStatus",
        published.price_market as "priceMarket",
        published.price_nm as "priceNm",
        published.price_lp as "priceLp",
        published.verification_status as "verificationStatus",
        published.updated_at::text as "updatedAt",
        published.published_at::text as "publishedAt"
      from card_prints cp
      join cards on cards.id = cp.card_id
      join releases on releases.id = cp.release_id
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
      where cp.id = any($1::text[])
    `,
    [ids, JUSTTCG_SOURCE_ID],
  );

  return toPlainRows<PublishedCardPrintPriceRow>(rows);
}

async function defaultLoadHistoryRows(params: {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  rangeDays: number;
}) {
  const sql = createPostgresClient();
  const fromIso = new Date(Date.now() - Math.max(1, params.rangeDays) * 24 * 60 * 60 * 1000).toISOString();
  const rows = await sql.unsafe(
    `
      select
        history.card_print_id as "cardPrintId",
        history.recorded_at::text as "recordedAt",
        history.price_nm as "priceNm",
        history.external_product_id as "externalProductId",
        history.external_variant_id as "externalVariantId"
      from card_print_price_history history
      where history.card_print_id = $1
        and history.source_id = $2
        and history.external_product_id = $3
        and history.external_variant_id = $4
        and history.recorded_at >= $5::timestamptz
      order by history.recorded_at asc
    `,
    [params.cardPrintId, JUSTTCG_SOURCE_ID, params.externalProductId, params.externalVariantId, fromIso],
  );

  return toPlainRows(rows) as Array<{
    cardPrintId: string;
    recordedAt: string;
    priceNm: string | number | null;
    externalProductId: string | null;
    externalVariantId: string | null;
  }>;
}

export async function getCardPrintRuntimePrice(
  cardPrintId: string,
  options?: {
    loadRows?: LoadPublishedCardPrintRows;
  },
): Promise<PublishedCardPrintRuntimePrice> {
  const loadRows = options?.loadRows ?? defaultLoadRows;
  const rows = await loadRows([cardPrintId]);
  const row = rows.find((candidate) => candidate.cardPrintId === cardPrintId) || null;
  return resolvePublishedRuntimePrice(cardPrintId, row);
}

export async function getCardPrintRuntimePrices(
  cardPrintIds: string[],
  options?: {
    loadRows?: LoadPublishedCardPrintRows;
  },
): Promise<Map<string, PublishedCardPrintRuntimePrice>> {
  const ids = normalizeRequestedIds(cardPrintIds);
  const loadRows = options?.loadRows ?? defaultLoadRows;
  const rows = await loadRows(ids);
  const indexed = new Map(rows.map((row) => [row.cardPrintId, row]));
  const results = new Map<string, PublishedCardPrintRuntimePrice>();

  for (const cardPrintId of ids) {
    results.set(cardPrintId, resolvePublishedRuntimePrice(cardPrintId, indexed.get(cardPrintId) || null));
  }

  return results;
}

export async function getCardPrintRuntimeDetail(
  cardPrintId: string,
  rangeDays: number,
  options?: {
    loadRows?: LoadPublishedCardPrintRows;
    loadHistoryRows?: LoadPublishedCardPrintHistoryRows;
  },
): Promise<{
  price: PublishedCardPrintRuntimePrice | null;
  points: Array<{ ts: number; date: string; tcgMarket: number | null }>;
}> {
  const loadRows = options?.loadRows ?? defaultLoadRows;
  const loadHistoryRows = options?.loadHistoryRows ?? defaultLoadHistoryRows;
  const rows = await loadRows([cardPrintId]);
  const row = rows.find((candidate) => candidate.cardPrintId === cardPrintId) || null;
  const price = resolvePublishedRuntimePrice(cardPrintId, row);

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
    .map((historyRow) => {
      const ts = Date.parse(historyRow.recordedAt);
      if (!Number.isFinite(ts)) return null;
      return {
        ts,
        date: new Date(ts).toISOString().slice(0, 10),
        tcgMarket: pricingShared.parseNullableNumber(historyRow.priceNm),
      };
    })
    .filter((point): point is { ts: number; date: string; tcgMarket: number | null } => Boolean(point))
    .sort((left, right) => left.ts - right.ts);

  return { price, points };
}

export function resolvePublishedCardPrintRuntimePrice(
  cardPrintId: string,
  row: PublishedCardPrintPriceRow | null | undefined,
) {
  return resolvePublishedRuntimePrice(cardPrintId, row);
}

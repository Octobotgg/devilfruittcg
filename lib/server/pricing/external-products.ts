import { createRequire } from "node:module";
import type { Sql } from "postgres";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const { createPostgresClient }: typeof import("../../../db/postgres") = require("../../../db/postgres.ts");

export const JUSTTCG_SOURCE_ID = "justtcg";
export const USD_CURRENCY = "USD" as const;

export type SupportedProductKind = "raw_card" | "sealed" | "graded" | "other";
export type UnpricedReason =
  | "missing_active_approved_mapping"
  | "missing_current_price"
  | "kind_mismatch";

export type CardPrintPriceRow = {
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
  mappingApproved: boolean;
  priceMarket: string | number | null;
  priceNm: string | number | null;
  priceLp: string | number | null;
  priceChange24h: string | number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
};

export type SealedProductPriceRow = {
  sealedProductId: string;
  sealedProductName: string | null;
  officialReleaseCode: string | null;
  officialReleaseName: string | null;
  externalProductId: string | null;
  productKind: string | null;
  justtcgTitle: string | null;
  justtcgImageUrl: string | null;
  mappingApproved: boolean;
  priceMarket: string | number | null;
  priceChange24h: string | number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
};

export type CardPrintRuntimePrice =
  | {
      status: "priced";
      kind: "raw_card";
      cardPrintId: string;
      cardId: string | null;
      printedCardCode: string | null;
      currency: typeof USD_CURRENCY;
      currentPrice: number;
      currentPriceType: "near_mint";
      priceMarket: number | null;
      priceLp: number | null;
      priceChange24h: number | null;
      updatedAt: string | null;
      fetchedAt: string | null;
      externalProductId: string;
      justtcg: {
        title: string | null;
        imageUrl: string | null;
      };
      official: {
        name: string | null;
        setCode: string | null;
        setName: string | null;
      };
    }
  | {
      status: "unpriced";
      kind: "raw_card";
      cardPrintId: string;
      reason: UnpricedReason;
      currency: typeof USD_CURRENCY;
    };

export type SealedProductRuntimePrice =
  | {
      status: "priced";
      kind: "sealed";
      sealedProductId: string;
      currency: typeof USD_CURRENCY;
      currentPrice: number;
      currentPriceType: "market";
      priceChange24h: number | null;
      updatedAt: string | null;
      fetchedAt: string | null;
      externalProductId: string;
      justtcg: {
        title: string | null;
        imageUrl: string | null;
      };
      official: {
        name: string | null;
        releaseCode: string | null;
        releaseName: string | null;
      };
    }
  | {
      status: "unpriced";
      kind: "sealed";
      sealedProductId: string;
      reason: UnpricedReason;
      currency: typeof USD_CURRENCY;
    };

let cachedClient: Sql | null = null;

export function getServerPostgresClient(): Sql {
  if (!cachedClient) {
    cachedClient = createPostgresClient();
  }

  return cachedClient;
}

export function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeProductKind(value: string | null | undefined): SupportedProductKind {
  switch (value) {
    case "raw_card":
    case "sealed":
    case "graded":
      return value;
    default:
      return "other";
  }
}

export function createUnpricedCardPrintPrice(
  cardPrintId: string,
  reason: UnpricedReason,
): CardPrintRuntimePrice {
  return {
    status: "unpriced",
    kind: "raw_card",
    cardPrintId,
    reason,
    currency: USD_CURRENCY,
  };
}

export function createUnpricedSealedProductPrice(
  sealedProductId: string,
  reason: UnpricedReason,
): SealedProductRuntimePrice {
  return {
    status: "unpriced",
    kind: "sealed",
    sealedProductId,
    reason,
    currency: USD_CURRENCY,
  };
}

function uniqueTextIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function toPlainRows<T>(rows: Iterable<unknown>): T[] {
  return Array.from(rows, (row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

export async function loadCardPrintPriceRows(
  cardPrintIds: string[],
  sql: Sql = getServerPostgresClient(),
): Promise<CardPrintPriceRow[]> {
  const ids = uniqueTextIds(cardPrintIds);
  if (!ids.length) return [];

  const rows = await sql.unsafe(
    `
      select
        cp.id as "cardPrintId",
        cards.id as "cardId",
        cp.printed_card_code as "printedCardCode",
        cards.name as "officialName",
        releases.code as "officialSetCode",
        releases.name as "officialSetName",
        cp.active_external_product_id as "externalProductId",
        ep.product_kind as "productKind",
        ep.name as "justtcgTitle",
        ep.image_url as "justtcgImageUrl",
        coalesce(link.approved_at is not null and link.mapping_status = 'exact', false) as "mappingApproved",
        current_prices.price_market as "priceMarket",
        current_prices.price_nm as "priceNm",
        current_prices.price_lp as "priceLp",
        current_prices.price_change_24h as "priceChange24h",
        current_prices.updated_at::text as "updatedAt",
        current_prices.fetched_at::text as "fetchedAt"
      from card_prints cp
      join cards on cards.id = cp.card_id
      join releases on releases.id = cp.release_id
      left join external_products ep
        on ep.id = cp.active_external_product_id
      left join card_print_market_links link
        on link.card_print_id = cp.id
       and link.external_product_id = cp.active_external_product_id
      left join card_print_price_current current_prices
        on current_prices.card_print_id = cp.id
       and current_prices.external_product_id = cp.active_external_product_id
       and current_prices.source_id = $2
      where cp.id = any($1::text[])
    `,
    [ids, JUSTTCG_SOURCE_ID],
  );

  return toPlainRows<CardPrintPriceRow>(rows);
}

export async function loadSealedProductPriceRows(
  sealedProductIds: string[],
  sql: Sql = getServerPostgresClient(),
): Promise<SealedProductPriceRow[]> {
  const ids = uniqueTextIds(sealedProductIds);
  if (!ids.length) return [];

  const rows = await sql.unsafe(
    `
      select
        sealed.id as "sealedProductId",
        sealed.name as "sealedProductName",
        releases.code as "officialReleaseCode",
        releases.name as "officialReleaseName",
        sealed.active_external_product_id as "externalProductId",
        ep.product_kind as "productKind",
        ep.name as "justtcgTitle",
        ep.image_url as "justtcgImageUrl",
        coalesce(link.approved_at is not null and link.mapping_status = 'exact', false) as "mappingApproved",
        current_prices.price_market as "priceMarket",
        current_prices.price_change_24h as "priceChange24h",
        current_prices.updated_at::text as "updatedAt",
        current_prices.fetched_at::text as "fetchedAt"
      from sealed_products sealed
      left join releases on releases.id = sealed.release_id
      left join external_products ep
        on ep.id = sealed.active_external_product_id
      left join sealed_product_market_links link
        on link.sealed_product_id = sealed.id
       and link.external_product_id = sealed.active_external_product_id
      left join sealed_product_price_current current_prices
        on current_prices.sealed_product_id = sealed.id
       and current_prices.external_product_id = sealed.active_external_product_id
       and current_prices.source_id = $2
      where sealed.id = any($1::text[])
    `,
    [ids, JUSTTCG_SOURCE_ID],
  );

  return toPlainRows<SealedProductPriceRow>(rows);
}

import { createRequire } from "node:module";

import type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const pricingShared = require("./external-products.ts") as typeof import("./external-products");

export type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";

export type LoadCardPrintPriceRows = (cardPrintIds: string[]) => Promise<CardPrintPriceRow[]>;

function indexRowsByCardPrintId(rows: CardPrintPriceRow[]) {
  const indexed = new Map<string, CardPrintPriceRow>();

  for (const row of rows) {
    if (!indexed.has(row.cardPrintId)) {
      indexed.set(row.cardPrintId, row);
    }
  }

  return indexed;
}

export function resolveCardPrintRuntimePrice(
  cardPrintId: string,
  row: CardPrintPriceRow | null | undefined,
): CardPrintRuntimePrice {
  if (!row || !row.externalProductId || !row.mappingApproved) {
    return pricingShared.createUnpricedCardPrintPrice(
      cardPrintId,
      "missing_active_approved_mapping",
    );
  }

  if (pricingShared.normalizeProductKind(row.productKind) !== "raw_card") {
    return pricingShared.createUnpricedCardPrintPrice(cardPrintId, "kind_mismatch");
  }

  const currentPrice = pricingShared.parseNullableNumber(row.priceNm);
  if (currentPrice == null) {
    return pricingShared.createUnpricedCardPrintPrice(cardPrintId, "missing_current_price");
  }

  return {
    status: "priced",
    kind: "raw_card",
    cardPrintId,
    cardId: row.cardId,
    printedCardCode: row.printedCardCode,
    currency: pricingShared.USD_CURRENCY,
    currentPrice,
    currentPriceType: "near_mint",
    priceMarket: pricingShared.parseNullableNumber(row.priceMarket),
    priceLp: pricingShared.parseNullableNumber(row.priceLp),
    priceChange24h: pricingShared.parseNullableNumber(row.priceChange24h),
    updatedAt: row.updatedAt,
    fetchedAt: row.fetchedAt,
    externalProductId: row.externalProductId,
    justtcg: {
      title: row.justtcgTitle,
      imageUrl: row.justtcgImageUrl,
    },
    official: {
      name: row.officialName,
      setCode: row.officialSetCode,
      setName: row.officialSetName,
    },
  };
}

export async function getCardPrintRuntimePrice(
  cardPrintId: string,
  options?: {
    loadRows?: LoadCardPrintPriceRows;
  },
): Promise<CardPrintRuntimePrice> {
  const loadRows = options?.loadRows ?? pricingShared.loadCardPrintPriceRows;
  const rows = await loadRows([cardPrintId]);
  const row = rows.find((candidate) => candidate.cardPrintId === cardPrintId) || null;

  return resolveCardPrintRuntimePrice(cardPrintId, row);
}

export async function getCardPrintRuntimePrices(
  cardPrintIds: string[],
  options?: {
    loadRows?: LoadCardPrintPriceRows;
  },
): Promise<Map<string, CardPrintRuntimePrice>> {
  const loadRows = options?.loadRows ?? pricingShared.loadCardPrintPriceRows;
  const rows = await loadRows(cardPrintIds);
  const indexedRows = indexRowsByCardPrintId(rows);
  const results = new Map<string, CardPrintRuntimePrice>();

  for (const cardPrintId of new Set(cardPrintIds.map((id) => id.trim()).filter(Boolean))) {
    results.set(cardPrintId, resolveCardPrintRuntimePrice(cardPrintId, indexedRows.get(cardPrintId)));
  }

  return results;
}

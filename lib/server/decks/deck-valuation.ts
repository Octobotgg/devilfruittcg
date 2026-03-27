import { createRequire } from "node:module";

import type { CardPrintRuntimePrice, UnpricedReason } from "../pricing/external-products";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const cardPrintPrices = require("../pricing/justtcg-variant-read-model.ts") as typeof import("../pricing/justtcg-variant-read-model");
const pricingShared = require("../pricing/external-products.ts") as typeof import("../pricing/external-products");

export type DeckValuationItem = {
  cardPrintId: string;
  quantity: number;
};

export type LegacyDeckValuationItem = {
  cardId: string;
  quantity: number;
  variantId?: string | null;
  variantKey?: string | null;
};

export type DeckValuationLineItem =
  | {
      status: "priced";
      cardPrintId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }
  | {
      status: "unpriced";
      cardPrintId: string;
      quantity: number;
      lineTotal: 0;
      reason: UnpricedReason;
    };

export type DeckValuationResult = {
  totalPrice: number;
  currency: typeof pricingShared.USD_CURRENCY;
  pricedItemCount: number;
  unpricedItemCount: number;
  lineItems: DeckValuationLineItem[];
  unpricedItems: Array<{
    cardPrintId: string;
    quantity: number;
    reason: UnpricedReason;
  }>;
};

export type LoadDeckCardPrintPrices = (
  cardPrintIds: string[],
) => Promise<Map<string, CardPrintRuntimePrice> | Record<string, CardPrintRuntimePrice>>;

function normalizeDeckItems(items: DeckValuationItem[]) {
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

function getPriceFromLookup(
  lookup: Map<string, CardPrintRuntimePrice> | Record<string, CardPrintRuntimePrice>,
  cardPrintId: string,
) {
  if (lookup instanceof Map) {
    return lookup.get(cardPrintId);
  }

  return lookup[cardPrintId];
}

export async function valuateDeckByCardPrint(
  items: DeckValuationItem[],
  options?: {
    loadPrices?: LoadDeckCardPrintPrices;
  },
): Promise<DeckValuationResult> {
  const normalizedItems = normalizeDeckItems(items);
  const cardPrintIds = normalizedItems.map((item) => item.cardPrintId);
  const loadPrices =
    options?.loadPrices ??
    (async (ids: string[]) => cardPrintPrices.getCardPrintRuntimePrices(ids));
  const priceLookup = await loadPrices(cardPrintIds);

  let totalPrice = 0;
  let pricedItemCount = 0;
  const lineItems: DeckValuationLineItem[] = [];
  const unpricedItems: DeckValuationResult["unpricedItems"] = [];

  for (const item of normalizedItems) {
    const price = getPriceFromLookup(priceLookup, item.cardPrintId);

    if (!price || price.status === "unpriced") {
      const reason = price?.reason || "missing_active_approved_mapping";
      lineItems.push({
        status: "unpriced",
        cardPrintId: item.cardPrintId,
        quantity: item.quantity,
        lineTotal: 0,
        reason,
      });
      unpricedItems.push({
        cardPrintId: item.cardPrintId,
        quantity: item.quantity,
        reason,
      });
      continue;
    }

    const lineTotal = Number((price.currentPrice * item.quantity).toFixed(2));
    totalPrice += lineTotal;
    pricedItemCount += 1;
    lineItems.push({
      status: "priced",
      cardPrintId: item.cardPrintId,
      quantity: item.quantity,
      unitPrice: price.currentPrice,
      lineTotal,
    });
  }

  return {
    totalPrice: Number(totalPrice.toFixed(2)),
    currency: pricingShared.USD_CURRENCY,
    pricedItemCount,
    unpricedItemCount: unpricedItems.length,
    lineItems,
    unpricedItems,
  };
}

export async function translateLegacyDeckItems(
  items: LegacyDeckValuationItem[],
  resolveCardPrintId: (item: LegacyDeckValuationItem) => Promise<string | null>,
): Promise<DeckValuationItem[]> {
  const translated: DeckValuationItem[] = [];

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

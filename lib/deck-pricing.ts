import { getBaseCardId } from "./card-variants.ts";
import type { Deck } from "./cloud/types.ts";
import type { CardPriceQuote } from "./card-price-quotes.ts";

export type DeckPricingLineItem = {
  role: "leader" | "main";
  baseCardId: string;
  pricingId: string;
  quantity: number;
};

function normalizeDeckPricingVariantId(cardId: string, variantId?: string | null) {
  const baseId = getBaseCardId(String(cardId || "").trim().toUpperCase());
  const nextVariantId = String(variantId || "").trim().toUpperCase();
  if (!nextVariantId || nextVariantId === baseId) return null;
  return nextVariantId;
}

export function resolveDeckPricingId(cardId: string, variantId?: string | null) {
  const baseId = getBaseCardId(String(cardId || "").trim().toUpperCase());
  return normalizeDeckPricingVariantId(baseId, variantId) || baseId;
}

export function buildDeckPricingLineItems(deck: Deck): DeckPricingLineItem[] {
  const items: DeckPricingLineItem[] = [];

  if (deck.leaderId) {
    const baseLeaderId = getBaseCardId(deck.leaderId.toUpperCase());
    items.push({
      role: "leader",
      baseCardId: baseLeaderId,
      pricingId: resolveDeckPricingId(baseLeaderId, deck.leaderVariantId),
      quantity: 1,
    });
  }

  for (const entry of deck.cards) {
    const baseCardId = getBaseCardId(entry.cardId.toUpperCase());
    items.push({
      role: "main",
      baseCardId,
      pricingId: resolveDeckPricingId(baseCardId, entry.variantId),
      quantity: entry.quantity,
    });
  }

  return items;
}

export function summarizeDeckPricing(
  lineItems: DeckPricingLineItem[],
  quotes: Map<string, CardPriceQuote>,
) {
  let total = 0;
  let pricedEntries = 0;
  let missingEntries = 0;
  let staleEntries = 0;

  const seen = new Set<string>();

  for (const item of lineItems) {
    const normalizedPricingId = item.pricingId.toUpperCase();
    const quote = quotes.get(normalizedPricingId);

    if (quote?.priced && typeof quote.marketPrice === "number") {
      total += quote.marketPrice * item.quantity;
    }

    if (seen.has(normalizedPricingId)) continue;
    seen.add(normalizedPricingId);

    if (quote?.priced && typeof quote.marketPrice === "number") {
      pricedEntries += 1;
      if (quote.stale) staleEntries += 1;
      continue;
    }

    missingEntries += 1;
  }

  return {
    total,
    pricedEntries,
    missingEntries,
    staleEntries,
  };
}

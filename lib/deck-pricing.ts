import { getBaseCardId } from "./card-variants.ts";
import type { Deck } from "./cloud/types.ts";
import type { CardPriceQuote } from "./card-price-quotes.ts";

export type DeckPricingLineItem = {
  role: "leader" | "main";
  baseCardId: string;
  pricingId: string;
  quantity: number;
};

export function normalizePricingLookupId(cardId: string) {
  const trimmedId = String(cardId || "").trim();
  if (!trimmedId) return "";

  const baseId = getBaseCardId(trimmedId.toUpperCase());
  const suffixMatch = /(_[A-Za-z0-9]+)$/.exec(trimmedId);

  if (!suffixMatch) return baseId;
  return `${baseId}${suffixMatch[1].toLowerCase()}`;
}

function normalizeDeckPricingVariantId(cardId: string, variantId?: string | null) {
  const baseId = normalizePricingLookupId(cardId);
  const nextVariantId = normalizePricingLookupId(String(variantId || "").trim());
  if (!nextVariantId || nextVariantId === baseId) return null;
  return nextVariantId;
}

export function resolveDeckPricingId(cardId: string, variantId?: string | null) {
  const baseId = normalizePricingLookupId(cardId);
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
  let pricedUnique = 0;
  let missingUnique = 0;
  let pricedCopies = 0;
  let missingCopies = 0;
  let staleEntries = 0;

  const seen = new Set<string>();

  for (const item of lineItems) {
    const normalizedPricingId = item.pricingId.toUpperCase();
    const quote = quotes.get(normalizedPricingId);

    if (quote?.priced && typeof quote.marketPrice === "number") {
      total += quote.marketPrice * item.quantity;
      pricedCopies += item.quantity;
    } else {
      missingCopies += item.quantity;
    }

    if (seen.has(normalizedPricingId)) continue;
    seen.add(normalizedPricingId);

    if (quote?.priced && typeof quote.marketPrice === "number") {
      pricedUnique += 1;
      if (quote.stale) staleEntries += 1;
      continue;
    }

    missingUnique += 1;
  }

  return {
    total,
    pricedUnique,
    missingUnique,
    pricedCopies,
    missingCopies,
    staleEntries,
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import type { Deck } from "../lib/cloud/types.ts";
import type { CardPriceQuote } from "../lib/card-price-quotes.ts";
import { buildDeckPricingLineItems, resolveDeckPricingId, summarizeDeckPricing } from "../lib/deck-pricing.ts";

const SAMPLE_DECK: Deck = {
  id: "deck-1",
  name: "Sample Deck",
  leaderId: "OP01-001",
  leaderVariantId: "OP01-001_p1",
  cards: [
    { cardId: "OP02-005", quantity: 4, variantId: "OP02-005_p2" },
    { cardId: "OP03-010", quantity: 2 },
  ],
  createdAt: "2026-04-08T00:00:00.000Z",
  updatedAt: "2026-04-08T00:00:00.000Z",
};

function createQuote(
  cardId: string,
  overrides: Partial<CardPriceQuote> = {},
): CardPriceQuote {
  return {
    cardId,
    marketPrice: 10,
    estimatedPrice: 10,
    source: "published",
    stale: false,
    updatedAt: "2026-04-08T18:52:21.000Z",
    priced: true,
    missingReason: null,
    priceType: "market",
    ...overrides,
  };
}

test("resolveDeckPricingId preserves uppercase base ids and normalizes variant suffixes to canonical lowercase", () => {
  assert.equal(resolveDeckPricingId("OP14-020", "OP14-020_P1"), "OP14-020_p1");
  assert.equal(resolveDeckPricingId("op14-020", "op14-020_p1"), "OP14-020_p1");
  assert.equal(resolveDeckPricingId("OP14-039"), "OP14-039");
});

test("buildDeckPricingLineItems uses canonical print ids when a deck has explicit variants", () => {
  const items = buildDeckPricingLineItems(SAMPLE_DECK);

  assert.deepEqual(
    items.map((item) => ({
      role: item.role,
      baseCardId: item.baseCardId,
      pricingId: item.pricingId,
      quantity: item.quantity,
    })),
    [
      { role: "leader", baseCardId: "OP01-001", pricingId: "OP01-001_p1", quantity: 1 },
      { role: "main", baseCardId: "OP02-005", pricingId: "OP02-005_p2", quantity: 4 },
      { role: "main", baseCardId: "OP03-010", pricingId: "OP03-010", quantity: 2 },
    ],
  );
});

test("summarizeDeckPricing reports both unique and copy-aware pricing coverage", () => {
  const items = buildDeckPricingLineItems(SAMPLE_DECK);
  const quotes = new Map<string, CardPriceQuote>([
    ["OP01-001_P1", createQuote("OP01-001_P1", { marketPrice: 25, estimatedPrice: 25 })],
    ["OP02-005_P2", createQuote("OP02-005_P2", { marketPrice: 3.5, estimatedPrice: 3.5 })],
    ["OP03-010", createQuote("OP03-010", { marketPrice: null, estimatedPrice: 0, priced: false, source: "unpriced", updatedAt: null, missingReason: "missing_active_approved_mapping", priceType: null })],
  ]);

  const summary = summarizeDeckPricing(items, quotes);

  assert.equal(summary.total, 39);
  assert.equal(summary.pricedUnique, 2);
  assert.equal(summary.missingUnique, 1);
  assert.equal(summary.pricedCopies, 5);
  assert.equal(summary.missingCopies, 2);
  assert.equal(summary.pricedCopies + summary.missingCopies, 7);
  assert.equal(summary.staleEntries, 0);
});

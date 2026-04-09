import assert from "node:assert/strict";
import test from "node:test";

import type { CardPrintRuntimePrice } from "../lib/server/pricing/external-products.ts";
import { toCardPriceQuote } from "../lib/card-price-quotes.ts";

function createPricedRuntimePrice(
  overrides: Partial<Extract<CardPrintRuntimePrice, { status: "priced" }>> = {},
): Extract<CardPrintRuntimePrice, { status: "priced" }> {
  return {
    status: "priced",
    kind: "raw_card",
    cardPrintId: "OP01-001",
    cardId: "OP01-001",
    printedCardCode: "OP01-001",
    currency: "USD",
    currentPrice: 12.5,
    currentPriceType: "near_mint",
    priceMarket: 14.25,
    priceLp: 10.25,
    priceChange24h: null,
    updatedAt: "2026-04-08T18:52:21.000Z",
    fetchedAt: "2026-04-08T18:52:30.000Z",
    externalProductId: "product-1",
    justtcg: {
      title: "Monkey D. Luffy",
      imageUrl: null,
    },
    official: {
      name: "Monkey D. Luffy",
      setCode: "OP01",
      setName: "Romance Dawn",
    },
    ...overrides,
  };
}

test("toCardPriceQuote uses the published market price when available", () => {
  const result = toCardPriceQuote("OP01-001", createPricedRuntimePrice());

  assert.deepEqual(result, {
    cardId: "OP01-001",
    marketPrice: 14.25,
    estimatedPrice: 14.25,
    source: "published",
    stale: false,
    updatedAt: "2026-04-08T18:52:21.000Z",
    priced: true,
    missingReason: null,
    priceType: "market",
  });
});

test("toCardPriceQuote falls back to the Near Mint price when market price is unavailable", () => {
  const result = toCardPriceQuote(
    "ST13-011_p1",
    createPricedRuntimePrice({
      cardPrintId: "ST13-011_p1",
      cardId: "ST13-011_p1",
      printedCardCode: "ST13-011",
      priceMarket: null,
      currentPrice: 11.2,
    }),
  );

  assert.equal(result.marketPrice, 11.2);
  assert.equal(result.estimatedPrice, 11.2);
  assert.equal(result.priceType, "near_mint");
  assert.equal(result.priced, true);
});

test("toCardPriceQuote returns an unpriced quote without inventing placeholder values", () => {
  const result = toCardPriceQuote("OP15-999_p1", {
    status: "unpriced",
    kind: "raw_card",
    cardPrintId: "OP15-999_p1",
    reason: "missing_active_approved_mapping",
    currency: "USD",
  });

  assert.deepEqual(result, {
    cardId: "OP15-999_P1",
    marketPrice: null,
    estimatedPrice: 0,
    source: "unpriced",
    stale: false,
    updatedAt: null,
    priced: false,
    missingReason: "missing_active_approved_mapping",
    priceType: null,
  });
});

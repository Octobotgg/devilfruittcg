import assert from "node:assert/strict";
import test from "node:test";

import type { Card } from "../lib/cards.ts";
import type { Collection, Deck } from "../lib/cloud/types.ts";
import { buildDeckCollectionCoverage } from "../lib/decks/deck-collection-coverage.ts";

const SAMPLE_DECK: Deck = {
  id: "deck-coverage",
  name: "Coverage Test",
  leaderId: "OP01-001",
  cards: [
    { cardId: "OP02-005", quantity: 4, variantId: "OP02-005_p2" },
    { cardId: "OP03-010", quantity: 3 },
    { cardId: "OP04-020", quantity: 2 },
  ],
  createdAt: "2026-04-13T00:00:00.000Z",
  updatedAt: "2026-04-13T00:00:00.000Z",
};

const CARD_MAP = new Map<string, Card>([
  ["OP02-005", { id: "OP02-005", name: "Searcher", set: "Set", setCode: "OP02", number: "005", type: "Character", color: "Red", rarity: "R" }],
  ["OP03-010", { id: "OP03-010", name: "Guard Point", set: "Set", setCode: "OP03", number: "010", type: "Event", color: "Red", rarity: "C" }],
  ["OP04-020", { id: "OP04-020", name: "Blocker", set: "Set", setCode: "OP04", number: "020", type: "Character", color: "Blue", rarity: "UC" }],
]);

test("buildDeckCollectionCoverage counts owned and missing copies across the main deck only", () => {
  const collection: Collection = {
    "OP02-005": { cardId: "OP02-005", quantity: 2 },
    "OP03-010": { cardId: "OP03-010", quantity: 3 },
    "OP04-020": { cardId: "OP04-020", quantity: 1 },
  };

  const summary = buildDeckCollectionCoverage(SAMPLE_DECK, collection, CARD_MAP);

  assert.equal(summary.totalCopies, 9);
  assert.equal(summary.ownedCopies, 6);
  assert.equal(summary.missingCopies, 3);
  assert.deepEqual(summary.missingCards, [
    {
      cardId: "OP02-005",
      cardName: "Searcher",
      needed: 2,
      owned: 2,
      quantity: 4,
    },
    {
      cardId: "OP04-020",
      cardName: "Blocker",
      needed: 1,
      owned: 1,
      quantity: 2,
    },
  ]);
});

test("buildDeckCollectionCoverage ignores the leader and treats fully owned decks as fully covered", () => {
  const collection: Collection = {
    "OP02-005": { cardId: "OP02-005", quantity: 4 },
    "OP03-010": { cardId: "OP03-010", quantity: 4 },
    "OP04-020": { cardId: "OP04-020", quantity: 2 },
  };

  const summary = buildDeckCollectionCoverage(SAMPLE_DECK, collection, CARD_MAP);

  assert.equal(summary.totalCopies, 9);
  assert.equal(summary.ownedCopies, 9);
  assert.equal(summary.missingCopies, 0);
  assert.deepEqual(summary.missingCards, []);
});


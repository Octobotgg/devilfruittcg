import assert from "node:assert/strict";
import test from "node:test";

import type { Card } from "../lib/cards.ts";
import { buildDeckAnalytics } from "../lib/decks/deck-modal-analytics.ts";

const sampleEntries: Array<{ card: Card; quantity: number }> = [
  { card: { id: "OP01-001", name: "Leader", set: "Set", setCode: "OP01", number: "001", type: "Leader", color: "Red", rarity: "L", cost: 0, counter: null }, quantity: 1 },
  { card: { id: "OP01-005", name: "Searcher", set: "Set", setCode: "OP01", number: "005", type: "Character", color: "Red", rarity: "R", cost: 1, counter: 1000 }, quantity: 4 },
  { card: { id: "OP01-010", name: "Blocker", set: "Set", setCode: "OP01", number: "010", type: "Character", color: "Blue", rarity: "UC", cost: 2, counter: 2000 }, quantity: 3 },
  { card: { id: "OP01-020", name: "Event", set: "Set", setCode: "OP01", number: "020", type: "Event", color: "Blue", rarity: "C", cost: 3, counter: null }, quantity: 2 },
  { card: { id: "OP01-099", name: "Boss", set: "Set", setCode: "OP01", number: "099", type: "Character", color: "Purple", rarity: "SR", cost: 10, counter: 0 }, quantity: 2 },
];

test("buildDeckAnalytics bins cost curve into 0-9 and 10+", () => {
  const summary = buildDeckAnalytics(sampleEntries);

  assert.deepEqual(
    summary.costCurve.filter((bucket) => bucket.count > 0),
    [
      { label: "1", count: 4 },
      { label: "2", count: 3 },
      { label: "3", count: 2 },
      { label: "10+", count: 2 },
    ],
  );
});

test("buildDeckAnalytics counts copy-weighted counter buckets across the main deck only", () => {
  const summary = buildDeckAnalytics(sampleEntries);

  assert.deepEqual(summary.counterBreakdown, {
    plus2000: 3,
    plus1000: 4,
    zero: 4,
  });
});

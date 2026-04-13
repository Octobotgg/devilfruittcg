import assert from "node:assert/strict";
import test from "node:test";

import type { Deck } from "../lib/cloud/types.ts";
import { buildDeckSimExportLines } from "../lib/decks/deck-sim-export.ts";

const deck: Deck = {
  id: "deck-export",
  name: "Export Test",
  leaderId: "OP01-001",
  leaderVariantId: "OP01-001_p1",
  cards: [
    { cardId: "OP01-025", quantity: 4, variantId: "OP01-025_p2" },
    { cardId: "OP03-040", quantity: 3 },
  ],
  createdAt: "2026-04-13T00:00:00.000Z",
  updatedAt: "2026-04-13T00:00:00.000Z",
};

test("buildDeckSimExportLines emits base card ids and marks the leader", () => {
  assert.deepEqual(buildDeckSimExportLines(deck), [
    "1x OP01-001 (Leader)",
    "4x OP01-025",
    "3x OP03-040",
  ]);
});

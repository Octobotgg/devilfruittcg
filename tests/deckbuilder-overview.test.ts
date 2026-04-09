import assert from "node:assert/strict";
import test from "node:test";

import { buildDeckOverviewSummary } from "../lib/deckbuilder-overview.ts";

test("buildDeckOverviewSummary returns compact leader-first summary cards", () => {
  const summary = buildDeckOverviewSummary({
    mainDeckCount: 38,
    leaderName: "Monkey.D.Luffy",
    leaderSubtitle: "Red/Purple",
    deckValue: 124.53,
    deckValueStatus: "3 priced · 1 missing",
    legal: false,
  });

  assert.deepEqual(summary, [
    {
      key: "deck_value",
      label: "Deck Value",
      value: "$124.53",
      detail: "3 priced · 1 missing",
      tone: "gold",
    },
    {
      key: "deck_size",
      label: "Deck Size",
      value: "38/50",
      detail: "Leader counted separately",
      tone: "navy",
    },
    {
      key: "status",
      label: "Status",
      value: "Needs tuning",
      detail: "Monkey.D.Luffy · Red/Purple",
      tone: "amber",
    },
  ]);
});

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

test("buildDeckOverviewSummary falls back when the leader name is missing", () => {
  const summary = buildDeckOverviewSummary({
    mainDeckCount: 50,
    leaderName: null,
    leaderSubtitle: "Red/Purple",
    deckValue: 0,
    deckValueStatus: "No priced cards",
    legal: false,
  });

  assert.equal(summary[2]?.detail, "Pick a leader to anchor the build");
});

test("buildDeckOverviewSummary falls back when the leader subtitle is missing", () => {
  const summary = buildDeckOverviewSummary({
    mainDeckCount: 50,
    leaderName: "Monkey.D.Luffy",
    leaderSubtitle: null,
    deckValue: 0,
    deckValueStatus: "No priced cards",
    legal: false,
  });

  assert.equal(summary[2]?.detail, "Monkey.D.Luffy · Leader set");
});

test("buildDeckOverviewSummary marks legal decks with emerald tone", () => {
  const summary = buildDeckOverviewSummary({
    mainDeckCount: 50,
    leaderName: "Monkey.D.Luffy",
    leaderSubtitle: "Red/Purple",
    deckValue: 124.53,
    deckValueStatus: "3 priced · 1 missing",
    legal: true,
  });

  assert.deepEqual(summary[2], {
    key: "status",
    label: "Status",
    value: "Deck Legal",
    detail: "Monkey.D.Luffy · Red/Purple",
    tone: "emerald",
  });
});

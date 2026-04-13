import assert from "node:assert/strict";
import test from "node:test";

import type { MetaDeck } from "../lib/meta-decks.ts";
import { buildDeckMatchupSnapshot } from "../lib/decks/deck-modal-matchups.ts";

const DECKS: MetaDeck[] = [
  {
    id: "mihawk",
    name: "Mihawk",
    leader: "Dracule Mihawk",
    cardId: "OP14-020",
    color: "Green",
    tier: "A",
    metaShare: 9.2,
    winRate: 53.1,
    trend: "up",
    matchups: {
      "mihawk": 50,
      "rebecca": 57,
      "luffy": 46,
      "teach": 42,
      "zoro": 61,
    },
  },
  {
    id: "rebecca",
    name: "Rebecca",
    leader: "Rebecca",
    cardId: "OP10-003",
    color: "Blue",
    tier: "S",
    metaShare: 13.8,
    winRate: 55.8,
    trend: "stable",
    matchups: {},
  },
  {
    id: "luffy",
    name: "Luffy",
    leader: "Monkey D. Luffy",
    cardId: "ST14-001",
    color: "Red/Purple",
    tier: "S",
    metaShare: 11.3,
    winRate: 54.2,
    trend: "up",
    matchups: {},
  },
  {
    id: "teach",
    name: "Blackbeard",
    leader: "Marshall D. Teach",
    cardId: "OP09-001",
    color: "Black/Purple",
    tier: "A",
    metaShare: 10.1,
    winRate: 52.0,
    trend: "stable",
    matchups: {},
  },
  {
    id: "zoro",
    name: "Zoro",
    leader: "Roronoa Zoro",
    cardId: "OP01-001",
    color: "Red",
    tier: "A",
    metaShare: 8.4,
    winRate: 51.4,
    trend: "down",
    matchups: {},
  },
  {
    id: "smoker",
    name: "Smoker",
    leader: "Smoker",
    cardId: "OP02-093",
    color: "Black",
    tier: "B",
    metaShare: 5.5,
    winRate: 49.8,
    trend: "stable",
    matchups: {},
  },
];

test("buildDeckMatchupSnapshot returns the top meta leaders with heat buckets", () => {
  const rows = buildDeckMatchupSnapshot("OP14-020", DECKS, 4);

  assert.deepEqual(
    rows.map((row) => ({
      opponentCardId: row.opponentCardId,
      opponentName: row.opponentName,
      metaShare: row.metaShare,
      winRate: row.winRate,
      tone: row.tone,
    })),
    [
      { opponentCardId: "OP10-003", opponentName: "Rebecca", metaShare: 13.8, winRate: 57, tone: "favored" },
      { opponentCardId: "ST14-001", opponentName: "Monkey D. Luffy", metaShare: 11.3, winRate: 46, tone: "even" },
      { opponentCardId: "OP09-001", opponentName: "Marshall D. Teach", metaShare: 10.1, winRate: 42, tone: "unfavored" },
      { opponentCardId: "OP01-001", opponentName: "Roronoa Zoro", metaShare: 8.4, winRate: 61, tone: "favored" },
    ],
  );
});

test("buildDeckMatchupSnapshot returns an empty list when leader data is unavailable", () => {
  assert.deepEqual(buildDeckMatchupSnapshot("OP99-999", DECKS, 6), []);
});

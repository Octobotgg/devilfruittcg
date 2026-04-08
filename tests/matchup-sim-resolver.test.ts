import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.join(process.cwd(), "lib/matchup-sim-resolver.ts")).href;
const {
  applySimMatchupsToDecks,
  resolveSimHeadToHead,
  selectLatestSnapshotDateInWindow,
} = await import(moduleUrl);

const snapshot = {
  snapshotDate: "2026-04-08",
  period: "lw",
  leaders: [],
  matchups: [
    {
      snapshot_date: "2026-04-08",
      period: "lw",
      leader_id: "OP11-041",
      opponent_id: "OP08-098",
      wins: 790,
      total_games: 1190,
      matchup_win_rate: 0.663866,
      first_wins: 438,
      first_games: 585,
      first_win_rate: 0.748718,
      second_wins: 352,
      second_games: 605,
      second_win_rate: 0.581818,
      created_at: "2026-04-08T00:00:00.000Z",
    },
    {
      snapshot_date: "2026-04-08",
      period: "lw",
      leader_id: "OP08-098",
      opponent_id: "OP11-041",
      wins: 400,
      total_games: 1190,
      matchup_win_rate: 0.336134,
      first_wins: 253,
      first_games: 605,
      first_win_rate: 0.418182,
      second_wins: 147,
      second_games: 585,
      second_win_rate: 0.251282,
      created_at: "2026-04-08T00:00:00.000Z",
    },
  ],
} as const;

test("resolveSimHeadToHead returns the exact snapshot pair for both sides", () => {
  const result = resolveSimHeadToHead(snapshot, "OP11-041", "OP08-098");

  assert.equal(result.winRate, 66.39);
  assert.equal(result.matches, 1190);
  assert.equal(result.firstWinRate, 74.87);
  assert.equal(result.firstGames, 585);
  assert.equal(result.secondWinRate, 58.18);
  assert.equal(result.secondGames, 605);

  assert.equal(result.reverseWinRate, 33.61);
  assert.equal(result.reverseMatches, 1190);
  assert.equal(result.reverseFirstWinRate, 41.82);
  assert.equal(result.reverseFirstGames, 605);
  assert.equal(result.reverseSecondWinRate, 25.13);
  assert.equal(result.reverseSecondGames, 585);
});

test("resolveSimHeadToHead falls back to a neutral 50 when the pair is missing", () => {
  const result = resolveSimHeadToHead(snapshot, "OP11-041", "OP15-058");

  assert.equal(result.winRate, 50);
  assert.equal(result.matches, 0);
  assert.equal(result.reverseWinRate, 50);
  assert.equal(result.reverseMatches, 0);
});

test("applySimMatchupsToDecks uses the same snapshot pair values as head-to-head", () => {
  const decks = applySimMatchupsToDecks(
    [
      {
        id: "nami-op11-041",
        name: "Nami",
        leader: "Nami",
        cardId: "OP11-041",
        color: "Blue",
        tier: "S",
        metaShare: 8.7,
        winRate: 53.1,
        trend: "up",
        matchups: {},
      },
      {
        id: "kalgara-op08-098",
        name: "Kalgara",
        leader: "Kalgara",
        cardId: "OP08-098",
        color: "Yellow",
        tier: "A",
        metaShare: 4.4,
        winRate: 51.6,
        trend: "stable",
        matchups: {},
      },
    ],
    snapshot,
  );

  assert.equal(decks[0]?.matchups["kalgara-op08-098"], 66.39);
  assert.equal(decks[1]?.matchups["nami-op11-041"], 33.61);
});

test("selectLatestSnapshotDateInWindow picks the most recent snapshot inside the format window", () => {
  const picked = selectLatestSnapshotDateInWindow(
    ["2026-04-08", "2026-04-07", "2026-04-06", "2026-04-05"],
    "2026-04-01",
    "2026-04-07",
  );

  assert.equal(picked, "2026-04-07");
});

import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.join(process.cwd(), "lib/matchup-relevance-ranking.ts")).href;
const {
  MATCHUP_CONFIDENCE_MINIMUM,
  selectGumgumDrivenMatchupLeaders,
  selectRelevantMatchupLeaders,
} = await import(moduleUrl);

test("relevance ranking prefers format presence over raw confidence when both leaders are eligible", () => {
  const ranked = selectRelevantMatchupLeaders(
    [
      { cardId: "OLD-001", presence: 3, performance: 49, confidence: 5000 },
      { cardId: "NEW-001", presence: 12, performance: 54, confidence: 350 },
      { cardId: "MID-001", presence: 9, performance: 51, confidence: 900 },
    ],
    3,
  );

  assert.deepEqual(
    ranked.map((row) => row.cardId),
    ["NEW-001", "MID-001", "OLD-001"],
  );
});

test("relevance ranking applies the hard confidence gate before sorting", () => {
  const ranked = selectRelevantMatchupLeaders(
    [
      { cardId: "SAFE-001", presence: 10, performance: 52, confidence: MATCHUP_CONFIDENCE_MINIMUM },
      { cardId: "THIN-001", presence: 50, performance: 60, confidence: MATCHUP_CONFIDENCE_MINIMUM - 1 },
    ],
    12,
  );

  assert.deepEqual(ranked.map((row) => row.cardId), ["SAFE-001"]);
});

test("gumgum-driven leader selection follows GumGum sample order for the current format", () => {
  const ranked = selectGumgumDrivenMatchupLeaders(
    [
      { cardId: "OP15-058", sampleGames: 1900, metaShare: 19 },
      { cardId: "OP15-002", sampleGames: 1200, metaShare: 12 },
      { cardId: "OP11-041", sampleGames: 1300, metaShare: 8 },
      { cardId: "OP14-020", sampleGames: 600, metaShare: 6 },
    ],
    3,
  );

  assert.deepEqual(ranked, ["OP15-058", "OP11-041", "OP15-002"]);
});

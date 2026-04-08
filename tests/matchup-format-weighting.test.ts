import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.join(process.cwd(), "lib/matchup-format-windows.ts")).href;
const { mergeWeightedMatchupRate } = await import(moduleUrl);

test("weighted matchup merge combines correlated samples by match count", () => {
  const merged = mergeWeightedMatchupRate([
    { winRate: 60, matches: 100, priority: 0 },
    { winRate: 40, matches: 50, priority: 1 },
  ]);

  assert.equal(merged.matches, 150);
  assert.equal(merged.winRate, 53.33);
});

test("weighted matchup merge falls back to the highest-priority source when counts are missing", () => {
  const merged = mergeWeightedMatchupRate([
    { winRate: 60, matches: 100, priority: 0 },
    { winRate: 40, matches: null, priority: 1 },
  ]);

  assert.equal(merged.matches, 100);
  assert.equal(merged.winRate, 60);
});

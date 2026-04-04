import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

const SAMPLE_OPTIONS = [
  { value: "OP15", label: "OP15 · Legacy of the Master", count: 121 },
  { value: "EB03", label: "EB03 · Extra Booster Memorial Collection", count: 61 },
  { value: "OP14", label: "OP14 · Royal Blood", count: 121 },
  { value: "ST21", label: "ST21 · Starter Deck Ex Gear 5", count: 17 },
  { value: "ST10", label: "ST10 · The Three Captains", count: 17 },
  { value: "P", label: "P · Promotional Cards", count: 150 },
  { value: "CHAMPIONSHIP_25_26_FINALS_SEASON_1", label: "Championship 25-26 Finals Season 1", count: 4 },
] as const;

test("buildMarketSetFilterGroups classifies exact sets into boosters, starter decks, and promos", async () => {
  const groups =
    await importModule<typeof import("../lib/market-set-groups")>("lib/market-set-groups.ts");

  const result = groups.buildMarketSetFilterGroups(SAMPLE_OPTIONS.map((option) => ({ ...option })));

  assert.deepEqual(
    result.map((group) => ({ key: group.key, values: group.options.map((option) => option.value) })),
    [
      { key: "boosters", values: ["EB03", "OP14", "OP15"] },
      { key: "starterDecks", values: ["ST10", "ST21"] },
      { key: "promos", values: ["CHAMPIONSHIP_25_26_FINALS_SEASON_1", "P"] },
    ],
  );
});

test("searchMarketSetOptions returns exact promo matches even when promos are hidden in the default view", async () => {
  const groups =
    await importModule<typeof import("../lib/market-set-groups")>("lib/market-set-groups.ts");

  const results = groups.searchMarketSetOptions(SAMPLE_OPTIONS.map((option) => ({ ...option })), "finals");

  assert.deepEqual(results.map((option) => option.value), ["CHAMPIONSHIP_25_26_FINALS_SEASON_1"]);
});

test("searchMarketSetOptions prefers exact set code matches", async () => {
  const groups =
    await importModule<typeof import("../lib/market-set-groups")>("lib/market-set-groups.ts");

  const results = groups.searchMarketSetOptions(SAMPLE_OPTIONS.map((option) => ({ ...option })), "op15");

  assert.equal(results[0]?.value, "OP15");
});

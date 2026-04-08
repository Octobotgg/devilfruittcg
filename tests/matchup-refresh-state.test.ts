import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("matchup refresh copy describes the incoming period, format, and deck depth", async () => {
  const refreshState =
    await importModule<typeof import("../lib/matchup-refresh-state")>("lib/matchup-refresh-state.ts");

  assert.equal(refreshState.getMatchupPeriodLabel("west_p"), "West (Private)");
  assert.equal(refreshState.getMatchupPeriodLabel("east_lw_p"), "East · Last Week (Private)");
  assert.equal(
    refreshState.getMatchupRefreshTargetLabel({
      period: "west_p",
      formatCode: "OP15",
      deckLimit: 18,
    }),
    "West (Private) · OP15 · Top 18",
  );
  assert.deepEqual(
    refreshState.getMatchupRefreshCopy({
      period: "lw",
      formatCode: "OP12",
      deckLimit: 24,
    }),
    {
      title: "Refreshing matchup matrix",
      subtitle: "Charting Last Week (All) · OP12 · Top 24",
      ariaLabel: "Refreshing matchup matrix for Last Week (All), OP12, Top 24",
    },
  );
});

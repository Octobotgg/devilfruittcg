import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

Object.assign(process.env as Record<string, string | undefined>, { NODE_ENV: "test" });

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    q: "",
    sets: [],
    types: [],
    colors: [],
    rarities: [],
    counters: [],
    attributes: [],
    costMin: "",
    costMax: "",
    lifeMin: "",
    lifeMax: "",
    powerMin: "",
    powerMax: "",
    priceMin: "",
    priceMax: "",
    sort: "newest",
    page: 1,
    pageSize: 24,
    view: "grid",
    ...overrides,
  };
}

test("market snapshot policy does not trust empty snapshots for narrowed set filters", async () => {
  const { shouldUseMarketSnapshotResult } =
    await importModule<typeof import("../lib/market-snapshot-policy")>("lib/market-snapshot-policy.ts");

  assert.equal(shouldUseMarketSnapshotResult(buildState({ sets: ["OP16"] }), 0), false);
  assert.equal(shouldUseMarketSnapshotResult(buildState({ sets: ["OP16"] }), 2), true);
});

test("market snapshot policy still trusts empty snapshots for broad unfiltered browsing", async () => {
  const { shouldUseMarketSnapshotResult } =
    await importModule<typeof import("../lib/market-snapshot-policy")>("lib/market-snapshot-policy.ts");

  assert.equal(shouldUseMarketSnapshotResult(buildState(), 0), true);
});

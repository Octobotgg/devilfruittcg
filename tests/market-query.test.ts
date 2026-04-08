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

test("market query helpers round-trip url state for catalog requests", async () => {
  const {
    parseMarketUrlState,
    applyMarketStateToParams,
    buildMarketCatalogApiQuery,
  } = await importModule<typeof import("../lib/market-query")>("lib/market-query.ts");

  const params = new URLSearchParams([
    ["q", "teach"],
    ["set", "OP09"],
    ["set", "PRB01"],
    ["type", "Character"],
    ["color", "Black"],
    ["rarity", "SR"],
    ["counter", "1000"],
    ["attribute", "Special"],
    ["costMin", "5"],
    ["powerMax", "12000"],
    ["priceMin", "20"],
    ["sort", "price_desc"],
    ["page", "2"],
    ["pageSize", "48"],
    ["view", "list"],
  ]);

  const state = parseMarketUrlState(params);
  const serialized = applyMarketStateToParams(state).toString();

  assert.equal(buildMarketCatalogApiQuery(state), serialized);
  assert.equal(serialized, params.toString());
});

test("market query helpers normalize missing values to defaults", async () => {
  const { parseMarketUrlState } = await importModule<typeof import("../lib/market-query")>("lib/market-query.ts");

  const state = parseMarketUrlState(new URLSearchParams("q=luffy"));

  assert.equal(state.q, "luffy");
  assert.equal(state.sort, "relevance");
  assert.equal(state.page, 1);
  assert.equal(state.pageSize, 24);
  assert.equal(state.view, "grid");
  assert.deepEqual(state.sets, []);
});

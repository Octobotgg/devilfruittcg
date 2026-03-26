import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("initial market filter sections are hydration-safe and deterministic", async () => {
  const filters =
    await importModule<typeof import("../lib/market-filters")>("lib/market-filters.ts");

  assert.deepEqual(filters.getInitialMarketOpenSections(), {
    sets: true,
    types: true,
    colors: true,
    rarities: true,
    costLife: true,
    power: true,
    counter: true,
    attribute: true,
    price: true,
  });
});

test("desktop market filter sections collapse when no matching filters are active", async () => {
  const filters =
    await importModule<typeof import("../lib/market-filters")>("lib/market-filters.ts");

  assert.deepEqual(
    filters.getDesktopMarketOpenSections({
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
    }),
    {
      sets: false,
      types: false,
      colors: false,
      rarities: false,
      costLife: false,
      power: false,
      counter: false,
      attribute: false,
      price: false,
    },
  );
});

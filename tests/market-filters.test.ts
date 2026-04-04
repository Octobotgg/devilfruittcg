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

test("desktop market sidebar uses one sticky scroll container", async () => {
  const filters =
    await importModule<typeof import("../lib/market-filters")>("lib/market-filters.ts");

  const frameClassName = filters.getDesktopMarketSidebarClassName();
  const utilityClassName = filters.getDesktopMarketSidebarUtilityClassName();
  const bodyClassName = filters.getDesktopMarketSidebarBodyClassName();

  assert.match(frameClassName, /\bsticky\b/);
  assert.match(frameClassName, /\btop-24\b/);
  assert.match(frameClassName, /\bflex\b/);
  assert.match(frameClassName, /\bflex-col\b/);
  assert.match(frameClassName, /\boverflow-hidden\b/);
  assert.ok(frameClassName.includes("max-h-[calc(100vh-7rem)]"));

  assert.match(utilityClassName, /\bshrink-0\b/);

  assert.match(bodyClassName, /\bmin-h-0\b/);
  assert.match(bodyClassName, /\bflex-1\b/);
  assert.match(bodyClassName, /\boverflow-y-auto\b/);
  assert.match(bodyClassName, /\boverscroll-contain\b/);
});

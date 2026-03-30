import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("resolveCardDetailPricingState keeps cards unpriced when JustTCG resolves to null", async () => {
  const pricing =
    await importModule<typeof import("../lib/market-detail-pricing")>("lib/market-detail-pricing.ts");

  const state = pricing.resolveCardDetailPricingState({
    market: {
      ebay: {
        averagePrice: 138.65,
      },
      tcgplayer: {
        market: 131.72,
      },
    },
    tcgPrice: null,
    hasResolvedTcgPrice: true,
  });

  assert.deepEqual(state, {
    mode: "unpriced",
    headlinePrice: null,
    usesJustTcgPrice: false,
  });
});

test("resolveCardDetailPricingState prefers JustTCG market price when available", async () => {
  const pricing =
    await importModule<typeof import("../lib/market-detail-pricing")>("lib/market-detail-pricing.ts");

  const state = pricing.resolveCardDetailPricingState({
    market: {
      ebay: {
        averagePrice: 52.25,
      },
      tcgplayer: {
        market: 49.99,
      },
    },
    tcgPrice: {
      marketPrice: 4749.97,
    },
    hasResolvedTcgPrice: true,
  });

  assert.deepEqual(state, {
    mode: "priced",
    headlinePrice: 4749.97,
    usesJustTcgPrice: true,
  });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("CardDetailMarketPanel uses exact-print-only history tabs and removes weekly fallback copy", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "components/market/CardDetailMarketPanel.tsx"),
    "utf8",
  );

  assert.match(source, /3M/u);
  assert.match(source, /MARKET_HISTORY_RANGES/u);
  assert.match(source, /buildMarketHistoryState/u);
  assert.match(source, /FULL_HISTORY_API_RANGE = "365d"/u);
  assert.equal(source.includes("1W"), false);
  assert.equal(source.includes('"7d"'), false);
  assert.equal(source.includes("Price tracking started — history building."), false);
  assert.equal(source.includes('dataKey="ebayAvg"'), false);
  assert.equal(source.includes("HISTORY_RANGES = ["), false);
});

test("buildMarketHistoryState marks the chart ready only when two usable exact-print points exist", async () => {
  const history =
    await importModule<typeof import("../lib/market-history")>("lib/market-history.ts");

  assert.deepEqual(history.MARKET_HISTORY_RANGES, {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
  });

  const ready = history.buildMarketHistoryState({
    rangeId: "3M",
    now: Date.parse("2026-04-08T00:00:00.000Z"),
    points: [
      { ts: "2026-03-01T00:00:00.000Z", tcgMarket: "12.50" },
      { ts: "2026-04-01T00:00:00.000Z", tcgMarket: 14.25 },
    ],
  });

  assert.equal(ready.mode, "ready");
  assert.equal(ready.rangeId, "3M");
  assert.equal(ready.rangeDays, 90);
  assert.deepEqual(ready.points, [
    { ts: Date.parse("2026-03-01T00:00:00.000Z"), date: "2026-03-01", tcgMarket: 12.5 },
    { ts: Date.parse("2026-04-01T00:00:00.000Z"), date: "2026-04-01", tcgMarket: 14.25 },
  ]);

  const sparse = history.buildMarketHistoryState({
    rangeId: "3M",
    now: Date.parse("2026-04-08T00:00:00.000Z"),
    points: [{ ts: "2026-04-01T00:00:00.000Z", tcgMarket: 14.25 }],
  });

  assert.equal(sparse.mode, "sparse");
  assert.equal(sparse.points.length, 1);
});

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

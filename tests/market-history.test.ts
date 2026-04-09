import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("normalizeMarketHistoryPoints ignores invalid points, collapses duplicate timestamps, and sorts ascending", async () => {
  const history = await importModule<typeof import("../lib/market-history")>("lib/market-history.ts");

  const points = history.normalizeMarketHistoryPoints([
    { ts: Date.parse("2026-04-01T00:00:00.000Z"), date: "2026-04-01", tcgMarket: null },
    { ts: Date.parse("2026-04-02T00:00:00.000Z"), date: "2026-04-02", tcgMarket: 4.25 },
    { ts: Date.parse("2026-04-02T00:00:00.000Z"), date: "2026-04-02", tcgMarket: 4.5 },
    { ts: Date.parse("2026-04-03T00:00:00.000Z"), date: "2026-04-03", tcgMarket: 5.75 },
    { ts: Number.NaN, date: "2026-04-04", tcgMarket: 9.5 },
  ]);

  assert.deepEqual(points, [
    {
      ts: Date.parse("2026-04-02T00:00:00.000Z"),
      date: "2026-04-02",
      tcgMarket: 4.5,
    },
    {
      ts: Date.parse("2026-04-03T00:00:00.000Z"),
      date: "2026-04-03",
      tcgMarket: 5.75,
    },
  ]);
});

test("buildMarketHistoryState trims points by range and marks sparse windows below two usable points", async () => {
  const history = await importModule<typeof import("../lib/market-history")>("lib/market-history.ts");
  const now = Date.parse("2026-04-08T00:00:00.000Z");
  const day = 24 * 60 * 60 * 1000;

  const points = history.normalizeMarketHistoryPoints([
    { ts: now - 10 * day, date: "2026-03-29", tcgMarket: 1.1 },
    { ts: now - 40 * day, date: "2026-02-27", tcgMarket: 2.2 },
    { ts: now - 100 * day, date: "2026-01-29", tcgMarket: 3.3 },
    { ts: now - 400 * day, date: "2025-03-05", tcgMarket: 4.4 },
  ]);

  assert.deepEqual(history.MARKET_HISTORY_RANGES, {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
  });
  assert.deepEqual(history.MARKET_HISTORY_RANGE_DAYS, {
    30: "1M",
    90: "3M",
    180: "6M",
    365: "1Y",
  });

  assert.deepEqual(history.buildMarketHistoryState({ points, rangeId: "1M", now }), {
    rangeId: "1M",
    rangeDays: 30,
    mode: "sparse",
    points: [
      {
        ts: now - 10 * day,
        date: "2026-03-29",
        tcgMarket: 1.1,
      },
    ],
  });

  assert.deepEqual(history.buildMarketHistoryState({ points, rangeId: "3M", now }), {
    rangeId: "3M",
    rangeDays: 90,
    mode: "ready",
    points: [
      {
        ts: now - 40 * day,
        date: "2026-02-27",
        tcgMarket: 2.2,
      },
      {
        ts: now - 10 * day,
        date: "2026-03-29",
        tcgMarket: 1.1,
      },
    ],
  });

  assert.deepEqual(history.buildMarketHistoryState({ points, rangeId: "6M", now }), {
    rangeId: "6M",
    rangeDays: 180,
    mode: "ready",
    points: [
      {
        ts: now - 100 * day,
        date: "2025-12-29",
        tcgMarket: 3.3,
      },
      {
        ts: now - 40 * day,
        date: "2026-02-27",
        tcgMarket: 2.2,
      },
      {
        ts: now - 10 * day,
        date: "2026-03-29",
        tcgMarket: 1.1,
      },
    ],
  });

  assert.deepEqual(history.buildMarketHistoryState({ points, rangeId: "1Y", now }), {
    rangeId: "1Y",
    rangeDays: 365,
    mode: "ready",
    points: [
      {
        ts: now - 100 * day,
        date: "2025-12-29",
        tcgMarket: 3.3,
      },
      {
        ts: now - 40 * day,
        date: "2026-02-27",
        tcgMarket: 2.2,
      },
      {
        ts: now - 10 * day,
        date: "2026-03-29",
        tcgMarket: 1.1,
      },
    ],
  });
});

test("filterMarketHistoryPoints supports arbitrary day windows and formatMarketHistoryDateLabel keeps UTC dates stable", async () => {
  const history = await importModule<typeof import("../lib/market-history")>("lib/market-history.ts");
  const now = Date.parse("2026-03-25T12:00:00.000Z");

  const filtered = history.filterMarketHistoryPoints(
    [
      { ts: "2026-03-01T00:00:00.000Z", tcgMarket: 10.5 },
      { ts: "2026-03-20T00:00:00.000Z", tcgMarket: 11.25 },
      { ts: "2026-03-24T00:00:00.000Z", tcgMarket: 12.5 },
    ],
    7,
    now,
  );

  assert.deepEqual(filtered, [
    {
      ts: Date.parse("2026-03-20T00:00:00.000Z"),
      date: "2026-03-20",
      tcgMarket: 11.25,
    },
    {
      ts: Date.parse("2026-03-24T00:00:00.000Z"),
      date: "2026-03-24",
      tcgMarket: 12.5,
    },
  ]);

  assert.equal(
    history.formatMarketHistoryDateLabel("2026-03-01", {
      locale: "en-US",
      year: true,
    }),
    "Mar 1, 2026",
  );
});

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");
const DAY_MS = 24 * 60 * 60 * 1000;

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("insertChartGapBreaks inserts a null point only across long gaps", async () => {
  const helpers = await importModule<typeof import("../components/market/card-detail-market-chart-helpers")>(
    "components/market/card-detail-market-chart-helpers.ts",
  );
  const base = Date.parse("2026-04-01T00:00:00.000Z");

  assert.deepEqual(helpers.insertChartGapBreaks([]), []);
  assert.deepEqual(helpers.insertChartGapBreaks([{ ts: base, date: "2026-04-01", tcgMarket: 1 }]), [
    { ts: base, t: base, date: "2026-04-01", tcgMarket: 1 },
  ]);

  assert.deepEqual(
    helpers.insertChartGapBreaks([
      { ts: base, date: "2026-04-01", tcgMarket: 1 },
      { ts: base + 3 * DAY_MS, date: "2026-04-04", tcgMarket: 2 },
    ]),
    [
      { ts: base, t: base, date: "2026-04-01", tcgMarket: 1 },
      { ts: base + 3 * DAY_MS, t: base + 3 * DAY_MS, date: "2026-04-04", tcgMarket: 2 },
    ],
  );

  const withGap = helpers.insertChartGapBreaks([
    { ts: base, date: "2026-04-01", tcgMarket: 1 },
    { ts: base + 10 * DAY_MS, date: "2026-04-11", tcgMarket: 2 },
  ]);

  assert.equal(withGap.length, 3);
  assert.equal(withGap[1].tcgMarket, null);
  assert.equal(withGap[1].t, base + 5 * DAY_MS);
});

test("buildAccumulatingHistoryNote uses full available history, not selected visible range", async () => {
  const helpers = await importModule<typeof import("../components/market/card-detail-market-chart-helpers")>(
    "components/market/card-detail-market-chart-helpers.ts",
  );
  const newest = Date.parse("2026-04-10T00:00:00.000Z");
  const pointsWith40Days = [
    { ts: newest - 40 * DAY_MS, date: "2026-03-01", tcgMarket: 1 },
    { ts: newest, date: "2026-04-10", tcgMarket: 2 },
  ];
  const pointsWith365Days = [
    { ts: newest - 365 * DAY_MS, date: "2025-04-10", tcgMarket: 1 },
    { ts: newest, date: "2026-04-10", tcgMarket: 2 },
  ];

  assert.equal(
    helpers.buildAccumulatingHistoryNote(pointsWith40Days, "3M"),
    "40 days of history available — more accumulating daily.",
  );
  assert.equal(helpers.buildAccumulatingHistoryNote(pointsWith40Days, "1M"), null);
  assert.equal(helpers.buildAccumulatingHistoryNote(pointsWith365Days, "1M"), null);
});

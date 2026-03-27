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

function normalizeSql(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

test("applySeed backfills active NM variants into current prices and history rows", async () => {
  const { applySeed, buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: {
        cards: [
          {
            id: "oden-backfill",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            tcgplayerId: "544523",
            variants: [
              {
                variantId: "oden-backfill-lp",
                condition: "Lightly Played",
                printing: "Normal",
                language: "English",
                price: 0.18,
                lastUpdated: "2026-03-19T12:50:00.000Z",
              },
              {
                variantId: "oden-backfill-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 0.22,
                lastUpdated: "2026-03-19T12:54:12.000Z",
              },
            ],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-19T13:00:00.000Z",
        results: [
          {
            cardId: "EB01-001",
            confidence: "0.9800",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "oden-backfill",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
              lastUpdated: "2026-03-19T12:54:12.000Z",
            },
            cardPrintContext: {
              setName: "Extra Booster: Memorial Collection [EB-01]",
              releaseCode: "EB01",
              canonicalId: "EB01-001",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-19T13:00:00.000Z",
        fetchedAt: "2026-03-19T13:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "EB01-001",
            justtcg_id: "oden-backfill",
            price_nm: 0.45,
            price_lp: 0.18,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-19T12:54:12.000Z",
            fetched_at: "2026-03-19T13:00:00.000Z",
            raw_response: {
              id: "oden-backfill",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
            },
          },
        ],
        historyRows: [
          {
            devilfruit_id: "EB01-001",
            price_nm: 0.22,
            price_lp: 0.18,
            price_market: 0.22,
            recorded_at: "2026-03-18T13:00:00.000Z",
          },
        ],
        missing: [],
      },
    },
    {
      apply: false,
      includeTcgplayerSource: true,
      catalog: "unused",
      mappingReport: "unused",
      priceData: "unused",
      seedOut: null,
      chunkSize: 250,
    },
  );

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "EB01-001",
      active_external_product_id: "justtcg:oden-backfill",
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "EB01-001",
      active_external_variant_id: "justtcg:oden-backfill-nm",
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "EB01-001",
      source_id: "justtcg",
      external_product_id: "justtcg:oden-backfill",
      external_variant_id: "justtcg:oden-backfill-nm",
      price_market: 0.22,
      price_nm: 0.22,
      price_lp: 0.18,
      price_change_24h: 0,
      price_change_7d: null,
      price_change_30d: null,
      updated_at: "2026-03-19T12:54:12.000Z",
      fetched_at: "2026-03-19T13:00:00.000Z",
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceHistory, [
    {
      card_print_id: "EB01-001",
      source_id: "justtcg",
      external_product_id: "justtcg:oden-backfill",
      external_variant_id: "justtcg:oden-backfill-nm",
      recorded_at: "2026-03-18T13:00:00.000Z",
      price_nm: 0.22,
      price_lp: 0.18,
      price_market: 0.22,
    },
  ]);
  assert.deepEqual(seed.priceSnapshots, [
    {
      external_product_id: "justtcg:oden-backfill",
      external_variant_id: "justtcg:oden-backfill-nm",
      captured_at: "2026-03-19T13:00:00.000Z",
      price_market: 0.22,
      price_low: null,
      price_mid: null,
      price_high: null,
      price_nm: 0.22,
      price_lp: 0.18,
      currency: "USD",
      availability: null,
      raw_payload: {
        id: "oden-backfill",
        name: "Kouzuki Oden",
        set: "Extra Booster: Memorial Collection",
      },
    },
  ]);

  const queries: Array<{ text: string; params: unknown[] }> = [];
  const fakeSql = {
    unsafe: async (text: string, params: unknown[] = []) => {
      queries.push({ text: normalizeSql(text), params });
      return [];
    },
    end: async () => {},
  };

  await applySeed(seed, { chunkSize: 50, sql: fakeSql });

  const cardPrintsUpdate = queries.find((entry) => entry.text.startsWith('update "card_prints"'));
  const currentPriceInsert = queries.find((entry) => entry.text.includes('insert into "card_print_price_current"'));
  const historyInsert = queries.find((entry) => entry.text.includes('insert into "card_print_price_history"'));
  const snapshotInsert = queries.find((entry) => entry.text.includes('insert into "price_snapshots"'));

  assert.ok(cardPrintsUpdate, "card_prints should be updated");
  assert.ok(currentPriceInsert, "card_print_price_current should be written");
  assert.ok(historyInsert, "card_print_price_history should be written");
  assert.ok(snapshotInsert, "price_snapshots should be written");
  assert.match(cardPrintsUpdate!.text, /"active_external_variant_id"/);
  assert.equal(currentPriceInsert!.params.includes("justtcg:oden-backfill-nm"), true);
  assert.equal(historyInsert!.params.includes("justtcg:oden-backfill-nm"), true);
  assert.equal(snapshotInsert!.params.includes("justtcg:oden-backfill-nm"), true);
});

test("buildSeed leaves exact approved raw cards unpriced when no English Near Mint variant exists", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: {
        cards: [
          {
            id: "oden-no-nm",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            tcgplayerId: "544523",
            variants: [
              {
                variantId: "oden-no-nm-lp",
                condition: "Lightly Played",
                printing: "Normal",
                language: "English",
                price: 0.18,
                lastUpdated: "2026-03-19T12:50:00.000Z",
              },
            ],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-19T13:00:00.000Z",
        results: [
          {
            cardId: "EB01-001",
            confidence: "0.9800",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "oden-no-nm",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
              lastUpdated: "2026-03-19T12:50:00.000Z",
            },
            cardPrintContext: {
              setName: "Extra Booster: Memorial Collection [EB-01]",
              releaseCode: "EB01",
              canonicalId: "EB01-001",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-19T13:00:00.000Z",
        fetchedAt: "2026-03-19T13:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "EB01-001",
            justtcg_id: "oden-no-nm",
            price_nm: 0.45,
            price_lp: 0.18,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-19T12:54:12.000Z",
            fetched_at: "2026-03-19T13:00:00.000Z",
            raw_response: {
              id: "oden-no-nm",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
            },
          },
        ],
        historyRows: [
          {
            devilfruit_id: "EB01-001",
            price_nm: 0.22,
            price_lp: 0.18,
            price_market: 0.22,
            recorded_at: "2026-03-18T13:00:00.000Z",
          },
        ],
        missing: [],
      },
    },
    {
      apply: false,
      includeTcgplayerSource: true,
      catalog: "unused",
      mappingReport: "unused",
      priceData: "unused",
      seedOut: null,
      chunkSize: 250,
    },
  );

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "EB01-001",
      active_external_product_id: "justtcg:oden-no-nm",
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, []);
  assert.deepEqual(seed.cardPrintPriceCurrent, []);
  assert.deepEqual(seed.cardPrintPriceHistory, []);
  assert.deepEqual(seed.priceSnapshots, []);
});

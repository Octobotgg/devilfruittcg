import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

function normalizeSql(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

test("payload backfill query handles non-array JSON payloads safely", () => {
  const source = readFileSync(path.join(REPO_ROOT, "scripts/backfill-price-history-from-payloads.mjs"), "utf8");

  assert.match(
    normalizeSql(source),
    /case when jsonb_typeof\(variant\.price_history_payload\) = 'array' then jsonb_array_length\(variant\.price_history_payload\) else 0 end >= 2/,
    "jsonb_array_length must be guarded by CASE because Postgres can reorder AND predicates",
  );
});

test("applySeed upserts variants first, writes active variant ids, and dedupes snapshots by variant", async () => {
  const { applySeed, buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: {
        cards: [
          {
            id: "ace-nm-order",
            name: "Portgas.D.Ace",
            set: "One Piece Promotion Cards",
            number: "OP10-033",
            tcgplayerId: "999999",
            variants: [
              {
                variantId: "z-ace-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 810,
                lastUpdated: "2026-03-25T00:00:00.000Z",
              },
              {
                variantId: "a-ace-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 850,
                lastUpdated: "2026-03-25T00:00:00.000Z",
              },
            ],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        results: [
          {
            cardId: "OP10-033_p2",
            confidence: "0.9800",
            status: "auto_approved",
            searchMethod: "tcgplayer_verified",
            notes: null,
            confidenceReasons: ["tcgplayer_verified", "exact_number_match", "exact_product_match"],
            bestCandidate: {
              id: "ace-nm-order",
              name: "Portgas.D.Ace",
              set: "One Piece Promotion Cards",
              lastUpdated: "2026-03-25T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "CS 25-26 Finalist Card Set 1",
              releaseCode: "PRIZE",
              canonicalId: "OP10-033_cs_25_26_finalist_card_set_1",
              variantSlug: "cs_25_26_finalist_card_set_1",
              variantLabel: "CS 25-26 Finalist Card Set 1",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP10-033_p2",
            justtcg_id: "ace-nm-order",
            price_nm: 850,
            price_lp: 590,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "ace-nm-order",
              name: "Portgas.D.Ace",
              set: "One Piece Promotion Cards",
            },
          },
        ],
        historyRows: [],
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

  const canonicalSnapshot = seed.priceSnapshots[0];
  seed.priceSnapshots = [
    canonicalSnapshot,
    {
      ...canonicalSnapshot,
      external_variant_id: "justtcg:z-ace-nm",
    },
  ];
  seed.cardPrintPriceHistory = [
    {
      card_print_id: "OP10-033_p2",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-nm-order",
      external_variant_id: "justtcg:a-ace-nm",
      recorded_at: "2026-03-24T00:05:00.000Z",
      price_nm: 810,
      price_lp: 590,
      price_market: 810,
    },
    {
      card_print_id: "OP10-033_p2",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-nm-order",
      external_variant_id: "justtcg:z-ace-nm",
      recorded_at: "2026-03-24T00:05:00.000Z",
      price_nm: 799,
      price_lp: 580,
      price_market: 799,
    },
  ];

  const queries: Array<{ text: string; params: unknown[] }> = [];
  const fakeSql = {
    unsafe: async (text: string, params: unknown[] = []) => {
      const normalized = normalizeSql(text);
      queries.push({ text: normalized, params });

      if (normalized.includes('select card_prints.id')) {
        return [{ id: "OP10-033_p2" }];
      }

      if (normalized.includes("from price_snapshots")) {
        return [
          {
            external_product_id: canonicalSnapshot.external_product_id,
            external_variant_id: canonicalSnapshot.external_variant_id,
            captured_at: canonicalSnapshot.captured_at,
          },
        ];
      }

      if (normalized.includes('from card_print_price_history')) {
        return [
          {
            card_print_id: "OP10-033_p2",
            source_id: "justtcg",
            external_product_id: "justtcg:ace-nm-order",
            external_variant_id: "justtcg:a-ace-nm",
            recorded_at: "2026-03-24T00:05:00.000Z",
          },
        ];
      }

      return [];
    },
    end: async () => {},
  };

  await applySeed(seed, { chunkSize: 50, sql: fakeSql });

  const variantUpsertIndex = queries.findIndex((entry) => entry.text.includes('insert into "external_product_variants"'));
  const cardPrintsUpdateIndex = queries.findIndex((entry) => entry.text.startsWith('update "card_prints"'));
  const currentPriceUpsertIndex = queries.findIndex((entry) => entry.text.includes('insert into "card_print_price_current"'));
  const historyInsertIndex = queries.findIndex((entry) => entry.text.includes('insert into "card_print_price_history"'));
  const snapshotSelect = queries.find((entry) => entry.text.includes("from price_snapshots"));
  const snapshotInsert = queries.find((entry) => entry.text.includes('insert into "price_snapshots"'));

  assert.ok(variantUpsertIndex >= 0, "external_product_variants should be written");
  assert.ok(cardPrintsUpdateIndex >= 0, "card_prints should be updated");
  assert.ok(currentPriceUpsertIndex >= 0, "card_print_price_current should be written");
  assert.ok(historyInsertIndex >= 0, "card_print_price_history should be written");
  assert.ok(snapshotSelect, "snapshot de-dupe query should run");
  assert.ok(snapshotInsert, "price_snapshots should be written");

  assert.ok(
    queries[cardPrintsUpdateIndex].text.includes('"active_external_variant_id"'),
    "card_prints update should persist active_external_variant_id",
  );
  assert.ok(variantUpsertIndex < cardPrintsUpdateIndex, "variants should be upserted before card_prints updates");
  assert.ok(variantUpsertIndex < currentPriceUpsertIndex, "variants should be upserted before current price writes");
  assert.match(
    snapshotSelect!.text,
    /coalesce\(external_variant_id, ''\)/,
    "snapshot lookup should include external_variant_id in the natural key",
  );
  assert.equal(
    snapshotInsert!.params.includes("justtcg:a-ace-nm"),
    false,
    "existing canonical variant snapshot should be filtered out",
  );
  assert.equal(
    snapshotInsert!.params.includes("justtcg:z-ace-nm"),
    true,
    "different variants with the same product and timestamp should not be deduped together",
  );
  assert.equal(
    queries[historyInsertIndex].params.includes("justtcg:z-ace-nm"),
    true,
    "history writes should keep variant-specific rows that are not already present",
  );
  assert.match(
    queries[historyInsertIndex].text,
    /on conflict \("card_print_id", "source_id", "external_product_id", "external_variant_id", "recorded_at"\) do nothing/,
    "history writes should be protected by the natural-key conflict target",
  );
  assert.equal(
    queries[historyInsertIndex].params.includes("justtcg:a-ace-nm"),
    false,
    "history writes should skip rows already present by natural key",
  );
});

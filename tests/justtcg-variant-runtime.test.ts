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
                lastUpdated: 1773924600,
              },
              {
                variantId: "oden-backfill-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 0.22,
                lastUpdated: 1773924852,
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
            price_market: 9.99,
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
            price_nm: 9.99,
            price_lp: 8.88,
            price_market: 7.77,
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
                lastUpdated: 1773924600,
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
            price_market: 9.99,
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

test("bootstrapPublishedPricing can seed published rows from current candidate-priced runtime rows", async () => {
  const { bootstrapPublishedPricing } =
    await importModule<typeof import("../scripts/bootstrap-published-pricing.mjs")>(
      "scripts/bootstrap-published-pricing.mjs",
    );

  const state = {
    publishedPrices: new Map(),
    publishedDisplays: new Map(),
    runs: new Map(),
  };

  const adapter = {
    async transaction(work: () => Promise<unknown>) {
      return work();
    },
    async upsertPublishedPrices(rows: Array<Record<string, unknown>>) {
      for (const row of rows) {
        state.publishedPrices.set(`${row.cardPrintId}:${row.sourceId}`, row);
      }
    },
    async upsertPublishedDisplays(rows: Array<Record<string, unknown>>) {
      for (const row of rows) {
        state.publishedDisplays.set(row.cardPrintId, row);
      }
    },
    async recordConflicts() {},
    async markRunCompleted(verificationRunId: number, finishedAt: string) {
      state.runs.set(verificationRunId, { status: "completed", finishedAt });
    },
    async markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null) {
      state.runs.set(verificationRunId, { status: "failed", finishedAt, notes });
    },
    async createVerificationRun() {
      return 500;
    },
    async listPublishedCoverage() {
      return {
        priceCardPrintIds: new Set(["EB01-001"]),
        displayCardPrintIds: new Set(["EB01-001"]),
      };
    },
  };

  const result = await bootstrapPublishedPricing({
    candidates: [
      {
        cardPrintId: "EB01-001",
        sourceId: "justtcg",
        externalProductId: "justtcg:oden-backfill",
        externalVariantId: "justtcg:oden-backfill-nm",
        verificationStatus: "verified",
        conflictTypes: [],
        priceMarket: 0.22,
        priceNm: 0.22,
        priceLp: 0.18,
        updatedAt: "2026-03-19T12:54:12.000Z",
        displaySetName: "Extra Booster: Memorial Collection",
        displaySetCode: "EB01",
        displayRarity: "SR",
        displayTitle: "Kouzuki Oden",
        displayTreatmentLabel: null,
        displayImageUrl: "https://img.example/oden.jpg",
        labelStatus: "verified",
        officialName: "Kouzuki Oden",
        officialSetName: "Extra Booster: Memorial Collection",
        officialSetCode: "EB01",
        officialRarity: "SR",
      },
    ],
    adapter,
    now: () => "2026-03-27T12:20:00.000Z",
  });

  assert.equal(result.verificationRunId, 500);
  assert.equal(state.publishedPrices.size, 1);
  assert.equal(state.publishedDisplays.size, 1);
  assert.equal(state.runs.get(500)?.status, "completed");
});

test("verifyPricingRefresh records blocked statuses without publishing live rows", async () => {
  const { verifyPricingRefresh } =
    await importModule<typeof import("../scripts/run-pricing-verification.mjs")>(
      "scripts/run-pricing-verification.mjs",
    );

  const state = {
    runs: new Map<number, { status: string; startedAt: string | null; finishedAt: string | null; notes: string | null }>(),
    results: [] as Array<Record<string, unknown>>,
    conflicts: [] as Array<Record<string, unknown>>,
    publishedPrices: new Map<string, Record<string, unknown>>(),
  };

  const adapter = {
    async createVerificationRun(source: string, notes: string | null, startedAt: string) {
      state.runs.set(700, {
        status: "running",
        startedAt,
        finishedAt: null,
        notes: notes ?? source,
      });
      return 700;
    },
    async upsertVerificationResults(rows: Array<Record<string, unknown>>) {
      state.results.push(...rows);
    },
    async recordConflicts(
      verificationRunId: number,
      rows: Array<{ cardPrintId: string; conflictType: string }>,
    ) {
      state.conflicts.push(...rows.map((row) => ({ verificationRunId, ...row })));
    },
    async markRunCompleted(verificationRunId: number, finishedAt: string) {
      const existing = state.runs.get(verificationRunId);
      if (existing) {
        existing.status = "completed";
        existing.finishedAt = finishedAt;
      }
    },
    async markRunFailed(verificationRunId: number, finishedAt: string, notes: string | null) {
      const existing = state.runs.get(verificationRunId);
      if (existing) {
        existing.status = "failed";
        existing.finishedAt = finishedAt;
        existing.notes = notes;
      }
    },
  };

  await verifyPricingRefresh({
    candidates: [
      {
        cardPrintId: "cp-safe",
        sourceId: "justtcg",
        externalProductId: "product-safe",
        externalVariantId: "variant-safe",
        tcgplayerProductId: "123",
        priceMarket: 12.5,
        priceNm: 12.5,
        priceLp: 10.2,
        updatedAt: "2026-03-27T12:00:00.000Z",
        cardPrint: {
          id: "cp-safe",
          number: "OP01-001",
          setCode: "OP01",
          setName: "Romance Dawn [OP01]",
          releaseCode: "OP01",
          title: "Monkey D. Luffy",
          rarity: "SR",
          treatmentLabel: null,
          imageUrl: null,
        },
        provider: {
          externalProductId: "product-safe",
          externalVariantId: "variant-safe",
          tcgplayerProductId: "123",
          productName: "Monkey D. Luffy OP01-001",
          productUrlName: "monkey-d-luffy-op01-001",
          setName: "Romance Dawn",
          number: "OP01-001",
          treatment: null,
          imageUrl: null,
        },
        publishedDisplay: null,
        publishedPriceNmBefore: 12.45,
      },
      {
        cardPrintId: "cp-blocked",
        sourceId: "justtcg",
        externalProductId: "product-blocked",
        externalVariantId: "variant-blocked",
        tcgplayerProductId: "456",
        priceMarket: 999,
        priceNm: 999,
        priceLp: null,
        updatedAt: "2026-03-27T12:00:00.000Z",
        cardPrint: {
          id: "cp-blocked",
          number: "OP01-002",
          setCode: "OP01",
          setName: "Romance Dawn [OP01]",
          releaseCode: "OP01",
          title: "Roronoa Zoro",
          rarity: "SR",
          treatmentLabel: "Jolly Roger Foil",
          imageUrl: null,
        },
        provider: {
          externalProductId: "product-blocked",
          externalVariantId: "variant-blocked",
          tcgplayerProductId: "456",
          productName: "Roronoa Zoro OP01-002",
          productUrlName: "roronoa-zoro-op01-002",
          setName: "Romance Dawn",
          number: "OP01-002",
          treatment: "Parallel",
          imageUrl: null,
        },
        publishedDisplay: {
          displayTreatmentLabel: "Jolly Roger Foil",
          labelStatus: "verified",
        },
        publishedPriceNmBefore: 850,
      },
    ],
    adapter,
    fetchTcgplayerDetail: async ({ productId }: { productId: string }) => ({
      productId,
      marketPrice: productId === "123" ? 12.5 : 999,
    }),
    now: () => "2026-03-27T12:30:00.000Z",
  });

  assert.equal(state.runs.get(700)?.status, "completed");
  assert.equal(state.results.length, 2);
  assert.deepEqual(
    state.results.map((row) => row.verificationStatus),
    ["verified", "mapping_conflict"],
  );
  assert.deepEqual(
    state.conflicts.map((row) => row.conflictType),
    ["treatment_mismatch"],
  );
  assert.equal(state.publishedPrices.size, 0);
});

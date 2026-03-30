import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getTableConfig } from "drizzle-orm/pg-core";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importSchema() {
  return import(pathToFileURL(path.join(REPO_ROOT, "db/schema.ts")).href);
}

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((index) => index.config.name);
}

function foreignKeyNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).foreignKeys.map((foreignKey) => foreignKey.getName());
}

function migrationSql() {
  return readdirSync(path.join(REPO_ROOT, "db/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(REPO_ROOT, "db/migrations", file), "utf8"))
    .join("\n");
}

function normalizeSql(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createStatefulSql(initialState?: {
  cardPrints?: Array<{ id: string; active_external_product_id: string | null; active_external_variant_id: string | null }>;
  cardPrintPriceCurrent?: Array<Record<string, unknown>>;
}) {
  const queries: Array<{ text: string; params: unknown[] }> = [];
  const state = {
    cardPrints: new Map(
      (initialState?.cardPrints || []).map((row) => [row.id, clone(row)] as const),
    ),
    cardPrintPriceCurrent: new Map(
      (initialState?.cardPrintPriceCurrent || []).map((row) => [
        `${String(row.card_print_id)}::${String(row.source_id)}`,
        clone(row),
      ] as const),
    ),
  };

  return {
    queries,
    state,
    unsafe: async (text: string, params: unknown[] = []) => {
      const normalized = normalizeSql(text);
      queries.push({ text: normalized, params: [...params] });

      if (normalized.startsWith('update "card_prints"')) {
        for (let index = 0; index < params.length; index += 3) {
          const cardPrintId = String(params[index] || "");
          const activeExternalProductId = (params[index + 1] ?? null) as string | null;
          const activeExternalVariantId = (params[index + 2] ?? null) as string | null;
          const existing = state.cardPrints.get(cardPrintId) || {
            id: cardPrintId,
            active_external_product_id: null,
            active_external_variant_id: null,
          };
          existing.active_external_product_id = activeExternalProductId;
          existing.active_external_variant_id = activeExternalVariantId;
          state.cardPrints.set(cardPrintId, existing);
        }
        return [];
      }

      if (normalized.startsWith('insert into "card_print_price_current"')) {
        for (let index = 0; index < params.length; index += 12) {
          const row = {
            card_print_id: String(params[index] || ""),
            source_id: String(params[index + 1] || ""),
            external_product_id: String(params[index + 2] || ""),
            external_variant_id: (params[index + 3] ?? null) as string | null,
            price_market: params[index + 4] ?? null,
            price_nm: params[index + 5] ?? null,
            price_lp: params[index + 6] ?? null,
            price_change_24h: params[index + 7] ?? null,
            price_change_7d: params[index + 8] ?? null,
            price_change_30d: params[index + 9] ?? null,
            updated_at: params[index + 10] ?? null,
            fetched_at: params[index + 11] ?? null,
          };
          state.cardPrintPriceCurrent.set(`${row.card_print_id}::${row.source_id}`, row);
        }
        return [];
      }

      if (normalized.startsWith('delete from "card_print_price_current"')) {
        const sourceId = String(params[0] || "");
        for (let index = 1; index < params.length; index += 1) {
          const cardPrintId = String(params[index] || "");
          state.cardPrintPriceCurrent.delete(`${cardPrintId}::${sourceId}`);
        }
        return [];
      }

      return [];
    },
    end: async () => {},
  };
}

test("JustTCG variant schema includes the new variant layer", async () => {
  const schema = await importSchema();

  assert.ok(schema.externalProductVariants, "external_product_variants should exist");

  assert.ok(columnNames(schema.externalProductVariants).includes("source_id"), "source_id should exist");
  assert.ok(columnNames(schema.externalProductVariants).includes("provider_variant_id"), "provider_variant_id should exist");
  assert.ok(columnNames(schema.externalProductVariants).includes("last_updated_at"), "last_updated_at should exist");

  assert.ok(
    indexNames(schema.externalProductVariants).includes("external_product_variants_provider_variant_id_unique"),
    "provider_variant_id should be unique",
  );
  assert.ok(
    indexNames(schema.externalProductVariants).includes("external_product_variants_external_product_id_id_unique"),
    "external_product_id and id should form a supporting unique key for variant-to-product references",
  );
  assert.ok(
    indexNames(schema.cardPrints).includes("card_prints_active_external_variant_unique"),
    "card_prints.active_external_variant_id should be uniquely protected",
  );
  assert.ok(
    indexNames(schema.externalProductVariants).includes("external_product_variants_external_product_id_idx"),
    "external_product_id should be indexed",
  );
  assert.ok(
    indexNames(schema.externalProductVariants).includes("external_product_variants_condition_printing_idx"),
    "(condition, printing) should be indexed",
  );
  assert.ok(
    indexNames(schema.externalProductVariants).includes("external_product_variants_last_updated_at_idx"),
    "last_updated_at should be indexed",
  );

  assert.ok(
    foreignKeyNames(schema.externalProductVariants).includes("external_product_variants_product_source_fk"),
    "variant product/source relationship should be enforced",
  );
  assert.ok(
    foreignKeyNames(schema.cardPrints).includes("card_prints_active_external_product_variant_fk"),
    "active product and variant should stay aligned on card_prints",
  );
  assert.ok(
    foreignKeyNames(schema.cardPrintPriceCurrent).includes("card_print_price_current_product_source_variant_fk"),
    "current price rows should be tied to the exact product/source/variant identity",
  );
  assert.ok(
    foreignKeyNames(schema.cardPrintPriceHistory).includes("card_print_price_history_product_source_variant_fk"),
    "history rows should be tied to the exact product/source/variant identity",
  );
  assert.ok(
    foreignKeyNames(schema.priceSnapshots).includes("price_snapshots_product_variant_fk"),
    "price snapshots should be tied to the exact product/variant identity",
  );

  assert.ok(
    columnNames(schema.cardPrints).includes("active_external_variant_id"),
    "card_prints.active_external_variant_id should exist",
  );
  assert.ok(
    columnNames(schema.cardPrintPriceCurrent).includes("external_variant_id"),
    "card_print_price_current.external_variant_id should exist",
  );
  assert.ok(
    columnNames(schema.cardPrintPriceHistory).includes("external_variant_id"),
    "card_print_price_history.external_variant_id should exist",
  );
  assert.ok(
    columnNames(schema.priceSnapshots).includes("external_variant_id"),
    "price_snapshots.external_variant_id should exist",
  );

  const sql = migrationSql();
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "card_prints_active_external_variant_unique" ON "card_prints" USING btree \("active_external_variant_id"\) WHERE "card_prints"\."active_external_variant_id" is not null;/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \("external_product_id","source_id"\) REFERENCES "public"\."external_products"\("id","source_id"\) ON DELETE cascade ON UPDATE no action;/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \("external_product_id","source_id","external_variant_id"\) REFERENCES "public"\."external_product_variants"\("external_product_id","source_id","id"\) ON DELETE no action ON UPDATE no action;/,
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX "external_product_variants_external_product_id_id_unique" ON "external_product_variants" USING btree \("external_product_id","id"\);/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \("active_external_product_id","active_external_variant_id"\) REFERENCES "public"\."external_product_variants"\("external_product_id","id"\) ON DELETE set null ON UPDATE no action;/,
  );
  assert.match(
    sql,
    /FOREIGN KEY \("external_product_id","external_variant_id"\) REFERENCES "public"\."external_product_variants"\("external_product_id","id"\) ON DELETE no action ON UPDATE no action;/,
  );
});

test("buildSeed imports a JustTCG card row separately from its variants", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: {
        cards: [
          {
            id: "ace-finalist-pack",
            name: "Portgas.D.Ace",
            set: "One Piece Promotion Cards",
            number: "OP10-033",
            tcgplayerId: "999999",
            variants: [
              {
                variantId: "ace-finalist-pack-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 850,
                lastUpdated: 1774396800,
                priceHistory: [{ price: 825, recordedAt: "2026-03-24T00:00:00.000Z" }],
              },
              {
                variantId: "ace-finalist-pack-lp",
                condition: "Lightly Played",
                printing: "Normal",
                language: "English",
                price: 600,
                lastUpdated: 1774396800,
                priceHistory: [{ price: 610, recordedAt: "2026-03-24T00:00:00.000Z" }],
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
            confidence: "0.9000",
            status: "auto_approved",
            searchMethod: "tcgplayer_verified",
            notes: null,
            confidenceReasons: ["tcgplayer_verified", "exact_number_match", "exact_product_match"],
            bestCandidate: {
              id: "ace-finalist-pack",
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
            justtcg_id: "ace-finalist-pack",
            price_nm: 999,
            price_lp: 600,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "ace-finalist-pack",
              name: "Portgas.D.Ace",
              set: "One Piece Promotion Cards",
            },
          },
        ],
        historyRows: [
          {
            devilfruit_id: "OP10-033_p2",
            price_nm: 810,
            price_lp: 590,
            recorded_at: "2026-03-24T00:05:00.000Z",
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

  const product = seed.externalProducts.find((entry) => entry.id === "justtcg:ace-finalist-pack");
  assert.ok(product);
  assert.equal(product?.source_id, "justtcg");
  assert.equal(product?.external_product_id, "ace-finalist-pack");
  assert.equal(product?.product_kind, "raw_card");
  assert.equal(product?.condition_model, "condition_variant");

  const variants = seed.externalProductVariants ?? [];
  const nmVariant = variants.find(
    (entry) => entry.provider_variant_id === "ace-finalist-pack-nm",
  );
  const lpVariant = variants.find(
    (entry) => entry.provider_variant_id === "ace-finalist-pack-lp",
  );

  assert.ok(nmVariant);
  assert.ok(lpVariant);
  assert.equal(variants.length, 2);
  assert.equal(nmVariant?.external_product_id, "justtcg:ace-finalist-pack");
  assert.equal(nmVariant?.source_id, "justtcg");
  assert.equal(nmVariant?.condition, "Near Mint");
  assert.equal(nmVariant?.printing, "Normal");
  assert.equal(nmVariant?.language, "English");
  assert.equal(nmVariant?.price, 850);
  assert.equal(nmVariant?.last_updated_at, "2026-03-25T00:00:00.000Z");
  assert.equal(lpVariant?.condition, "Lightly Played");
  assert.equal(lpVariant?.price, 600);
  assert.equal(lpVariant?.last_updated_at, "2026-03-25T00:00:00.000Z");

  assert.deepEqual(seed.cardPrintPriceHistory, [
    {
      card_print_id: "OP10-033_p2",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-finalist-pack",
      external_variant_id: "justtcg:ace-finalist-pack-nm",
      recorded_at: "2026-03-24T00:05:00.000Z",
      price_nm: 850,
      price_lp: 600,
      price_market: 850,
    },
  ]);
});

test("buildSeed deterministically picks the lexicographically smallest English NM variant", async () => {
  const { buildSeed } =
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
                lastUpdated: 1774396800,
              },
              {
                variantId: "a-ace-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 850,
                lastUpdated: 1774396800,
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

  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "OP10-033_p2",
      active_external_variant_id: "justtcg:a-ace-nm",
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "OP10-033_p2",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-nm-order",
      external_variant_id: "justtcg:a-ace-nm",
      price_market: 850,
      price_nm: 850,
      price_lp: null,
      price_change_24h: null,
      price_change_7d: null,
      price_change_30d: null,
      updated_at: "2026-03-25T00:00:00.000Z",
      fetched_at: "2026-03-25T00:05:00.000Z",
    },
  ]);
});

test("fetchJusttcgCatalogSince requests updated_after without fuzzy search", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl: string | null = null;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        data: [],
        meta: { total: 0 },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  try {
    const { fetchJusttcgCatalogSince } =
      await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
        "scripts/import-justtcg-to-drizzle.mjs",
      );

    const snapshot = await fetchJusttcgCatalogSince({
      apiKey: "test-api-key",
      updatedAfter: 1774483200,
    });

    assert.ok(requestedUrl);
    assert.match(requestedUrl || "", /updated_after=1774483200/);
    assert.match(requestedUrl || "", /limit=20/);
    assert.match(requestedUrl || "", /game=one-piece-card-game/);
    assert.doesNotMatch(requestedUrl || "", /[?&]q=/);
    assert.equal(snapshot.cardCount, 0);
    assert.equal(snapshot.pageCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseArgs rejects an empty --updated-after value", async () => {
  const { parseArgs } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  assert.throws(
    () => parseArgs(["--updated-after", ""]),
    /--updated-after requires a numeric unix timestamp/,
  );
});

test("import script documents import, verify, and publish as separate explicit steps", async () => {
  const module =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  assert.deepEqual(module.describeRefreshPipeline(), [
    {
      step: "import",
      command: "node scripts/import-justtcg-to-drizzle.mjs --apply",
      liveWrites: false,
    },
    {
      step: "verify",
      command: "node scripts/run-pricing-verification.mjs",
      liveWrites: false,
    },
    {
      step: "publish",
      command: "node scripts/publish-verified-prices.mjs",
      liveWrites: true,
    },
  ]);
});

test("applySeed incremental refresh updates an existing variant-backed current price row without full remap", async () => {
  const { applySeed, buildIncrementalSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildIncrementalSeed(
    {
      catalog: {
        cards: [
          {
            id: "oden-refresh",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            tcgplayerId: "544523",
            variants: [
              {
                variantId: "oden-refresh-nm",
                condition: "Near Mint",
                printing: "Normal",
                language: "English",
                price: 0.3,
                lastUpdated: 1774483200,
              },
            ],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        results: [
          {
            cardId: "EB01-001",
            confidence: "0.9800",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "oden-refresh",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
              lastUpdated: "2026-03-26T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "Extra Booster: Memorial Collection [EB-01]",
              releaseCode: "EB01",
              canonicalId: "EB01-001",
            },
          },
        ],
      },
      priceData: null,
    },
    {
      apply: false,
      includeTcgplayerSource: true,
      catalog: "unused",
      mappingReport: "unused",
      priceData: "unused",
      seedOut: null,
      chunkSize: 250,
      updatedAfter: 1774483200,
    },
  );

  const sql = createStatefulSql({
    cardPrints: [
      {
        id: "EB01-001",
        active_external_product_id: "justtcg:oden-refresh",
        active_external_variant_id: "justtcg:oden-refresh-nm",
      },
    ],
    cardPrintPriceCurrent: [
      {
        card_print_id: "EB01-001",
        source_id: "justtcg",
        external_product_id: "justtcg:oden-refresh",
        external_variant_id: "justtcg:oden-refresh-nm",
        price_market: 0.12,
        price_nm: 0.12,
        price_lp: 0.08,
        price_change_24h: 0,
        price_change_7d: null,
        price_change_30d: null,
        updated_at: "2026-03-25T00:00:00.000Z",
        fetched_at: "2026-03-25T00:00:00.000Z",
      },
    ],
  });
  const beforeRow = clone(sql.state.cardPrintPriceCurrent.get("EB01-001::justtcg"));

  await applySeed(seed, { chunkSize: 50, sql });

  const afterRow = sql.state.cardPrintPriceCurrent.get("EB01-001::justtcg");
  assert.ok(afterRow, "incremental refresh should keep the existing current price row");
  assert.equal(afterRow?.external_variant_id, "justtcg:oden-refresh-nm");
  assert.equal(afterRow?.price_nm, 0.3);
  assert.equal(afterRow?.price_lp, null);
  assert.equal(sql.state.cardPrints.get("EB01-001")?.active_external_variant_id, beforeRow?.external_variant_id);
  assert.ok(
    sql.queries.some((query) => query.text.startsWith('insert into "card_print_price_current"')),
    "incremental refresh should update the current price row in place",
  );
  assert.equal(
    sql.queries.some((query) => query.text.startsWith('delete from "card_print_price_current"')),
    false,
    "incremental refresh should not delete canonical current price rows",
  );
  assert.equal(
    sql.queries.some((query) => query.text.startsWith('update "card_prints"')),
    false,
    "incremental refresh should not clear or reassign card_prints",
  );
  assert.equal(seed.meta?.syncMode, "incremental");
  assert.equal(seed.meta?.updatedAfter, 1774483200);
});

test("applySeed incremental LP-only refresh preserves the canonical NM current price row", async () => {
  const { applySeed, buildIncrementalSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildIncrementalSeed(
    {
      catalog: {
        cards: [
          {
            id: "oden-refresh",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            tcgplayerId: "544523",
            variants: [
              {
                variantId: "oden-refresh-lp",
                condition: "Lightly Played",
                printing: "Normal",
                language: "English",
                price: 0.18,
                lastUpdated: 1774483200,
              },
            ],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        results: [
          {
            cardId: "EB01-001",
            confidence: "0.9800",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "oden-refresh",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
              lastUpdated: "2026-03-26T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "Extra Booster: Memorial Collection [EB-01]",
              releaseCode: "EB01",
              canonicalId: "EB01-001",
            },
          },
        ],
      },
      priceData: null,
    },
    {
      apply: false,
      includeTcgplayerSource: true,
      catalog: "unused",
      mappingReport: "unused",
      priceData: "unused",
      seedOut: null,
      chunkSize: 250,
      updatedAfter: 1774483200,
    },
  );

  const sql = createStatefulSql({
    cardPrints: [
      {
        id: "EB01-001",
        active_external_product_id: "justtcg:oden-refresh",
        active_external_variant_id: "justtcg:oden-refresh-nm",
      },
    ],
    cardPrintPriceCurrent: [
      {
        card_print_id: "EB01-001",
        source_id: "justtcg",
        external_product_id: "justtcg:oden-refresh",
        external_variant_id: "justtcg:oden-refresh-nm",
        price_market: 0.22,
        price_nm: 0.22,
        price_lp: 0.18,
        price_change_24h: 0,
        price_change_7d: null,
        price_change_30d: null,
        updated_at: "2026-03-25T00:00:00.000Z",
        fetched_at: "2026-03-25T00:00:00.000Z",
      },
    ],
  });
  const beforeRow = clone(sql.state.cardPrintPriceCurrent.get("EB01-001::justtcg"));

  await applySeed(seed, { chunkSize: 50, sql });

  const afterRow = sql.state.cardPrintPriceCurrent.get("EB01-001::justtcg");
  assert.deepEqual(afterRow, beforeRow);
  assert.equal(sql.state.cardPrints.get("EB01-001")?.active_external_variant_id, "justtcg:oden-refresh-nm");
  assert.equal(
    sql.queries.some((query) => query.text.startsWith('insert into "card_print_price_current"')),
    false,
    "LP-only refresh should not rewrite the canonical current price row",
  );
  assert.equal(
    sql.queries.some((query) => query.text.startsWith('delete from "card_print_price_current"')),
    false,
    "LP-only refresh should not delete the canonical current price row",
  );
  assert.equal(
    sql.queries.some((query) => query.text.startsWith('update "card_prints"')),
    false,
    "LP-only refresh should not clear or reassign card_prints",
  );
  assert.equal(seed.meta?.syncMode, "incremental");
  assert.equal(seed.externalProductVariants.length, 1);
  assert.equal(seed.externalProductVariants[0]?.condition, "Lightly Played");
});

test("manual history apply skips rows that already exist by natural key", async () => {
  const { buildHistoryRowKey, filterPendingHistoryRows } =
    await importModule<typeof import("../scripts/manual-apply-justtcg-seed.mjs")>(
      "scripts/manual-apply-justtcg-seed.mjs",
    );

  const historyRow = {
    card_print_id: "OP10-033_p2",
    source_id: "justtcg",
    external_product_id: "justtcg:ace-nm-order",
    external_variant_id: "justtcg:a-ace-nm",
    recorded_at: "2026-03-25T00:05:00.000Z",
    price_nm: 850,
    price_lp: 590,
    price_market: 850,
  };

  const existingKeys = new Set([buildHistoryRowKey(historyRow)]);
  const pending = filterPendingHistoryRows([historyRow], existingKeys);

  assert.equal(pending.length, 0);
});

test("applySeed wraps full refresh writes in one transaction when begin() is available", async () => {
  const { applySeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const operations: string[] = [];
  type TransactionSql = {
    begin<T>(work: (transaction: TransactionSql) => Promise<T>): Promise<T>;
    unsafe(text: string): Promise<unknown[]>;
    end(): Promise<void>;
  };

  const fakeSql: TransactionSql = {
    async begin<T>(work: (transaction: TransactionSql) => Promise<T>) {
      operations.push("begin");
      const result = await work(fakeSql);
      operations.push("commit");
      return result;
    },
    async unsafe(text: string) {
      const normalized = normalizeSql(text);
      if (normalized.startsWith("select card_prints.id")) {
        return [];
      }
      operations.push(normalized);
      return [];
    },
    async end() {},
  };

  await applySeed(
    {
      externalSources: [],
      externalProducts: [],
      externalProductVariants: [],
      sealedProducts: [],
      cardPrintMarketLinks: [],
      sealedProductMarketLinks: [],
      activeCardPrintAssignments: [{ card_print_id: "OP01-001", active_external_product_id: "justtcg:luffy" }],
      activeCardPrintVariantAssignments: [
        { card_print_id: "OP01-001", active_external_variant_id: "justtcg:luffy-nm" },
      ],
      cardPrintPriceCurrent: [],
      cardPrintPriceHistory: [],
      sealedProductPriceCurrent: [],
      priceSnapshots: [],
      meta: { syncMode: "full" },
    },
    { chunkSize: 50, sql: fakeSql },
  );

  assert.equal(operations[0], "begin");
  assert.equal(operations.at(-1), "commit");
});

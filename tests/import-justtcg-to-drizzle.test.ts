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

test("extractHistoryRowsFromPayload maps JustTCG payload points into card print history rows", async () => {
  const { extractHistoryRowsFromPayload } =
    await importModule<typeof import("../scripts/justtcg-price-history-payload.mjs")>(
      "scripts/justtcg-price-history-payload.mjs",
    );

  const warnings: string[] = [];
  const rows = extractHistoryRowsFromPayload({
    cardPrintId: "OP13-119_p3",
    externalProductId: "justtcg:ace-current",
    externalVariantId: "justtcg:ace-current_near-mint_foil",
    sourceId: "justtcg",
    payload: [
      { p: 4420.37, t: 1775952000 },
      { p: "4421.25", t: "1776038400" },
      { p: null, t: 1776124800 },
      { p: 4422, t: "not-a-timestamp" },
    ],
    logSkipped: (message: string) => warnings.push(message),
  });

  assert.deepEqual(rows, [
    {
      card_print_id: "OP13-119_p3",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-current",
      external_variant_id: "justtcg:ace-current_near-mint_foil",
      recorded_at: "2026-04-12T00:00:00.000Z",
      price_nm: 4420.37,
      price_lp: null,
      price_market: null,
    },
    {
      card_print_id: "OP13-119_p3",
      source_id: "justtcg",
      external_product_id: "justtcg:ace-current",
      external_variant_id: "justtcg:ace-current_near-mint_foil",
      recorded_at: "2026-04-13T00:00:00.000Z",
      price_nm: 4421.25,
      price_lp: null,
      price_market: null,
    },
  ]);
  assert.deepEqual(warnings, ["Skipped 2 malformed JustTCG history payload points"]);
  assert.deepEqual(
    extractHistoryRowsFromPayload({
      cardPrintId: "OP13-119_p3",
      externalProductId: "justtcg:ace-current",
      externalVariantId: "justtcg:ace-current_near-mint_foil",
      sourceId: "justtcg",
      payload: null,
    }),
    [],
  );
});

test("extractHistoryRowsFromPayload maps a 30-day payload without truncation", async () => {
  const { extractHistoryRowsFromPayload } =
    await importModule<typeof import("../scripts/justtcg-price-history-payload.mjs")>(
      "scripts/justtcg-price-history-payload.mjs",
    );
  const start = Date.parse("2026-03-01T00:00:00.000Z") / 1000;
  const payload = Array.from({ length: 30 }, (_, index) => ({
    p: 1 + index / 100,
    t: start + index * 24 * 60 * 60,
  }));

  const rows = extractHistoryRowsFromPayload({
    cardPrintId: "EB01-001",
    externalProductId: "justtcg:oden",
    externalVariantId: "justtcg:oden_near-mint",
    sourceId: "justtcg",
    payload,
  });

  assert.equal(rows.length, 30);
  assert.equal(rows[0].recorded_at, "2026-03-01T00:00:00.000Z");
  assert.equal(rows.at(-1)?.recorded_at, "2026-03-30T00:00:00.000Z");
});

test("parseArgs accepts --set and --fetch-page-size", async () => {
  const { parseArgs } = await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
    "scripts/import-justtcg-to-drizzle.mjs",
  );

  const args = parseArgs(["--set", "OP-13", "--fetch-page-size", "75"]);

  assert.equal(args.set, "OP-13");
  assert.equal(args.fetchPageSize, 75);
});

test("buildJusttcgCardsUrl includes the cards query params", async () => {
  type ImportModule = {
    buildJusttcgCardsUrl: (options: {
      game?: string;
      limit?: number;
      offset?: number;
      updatedAfter?: number;
      set?: string;
      includeNullPrices?: boolean;
      includePriceHistory?: boolean;
      priceHistoryDuration?: string;
    }) => string;
  };
  const { buildJusttcgCardsUrl } =
    await importModule<ImportModule>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const url = buildJusttcgCardsUrl({
    game: "one-piece-card-game",
    limit: 42,
    updatedAfter: 1710000000,
    set: "OP-13",
    includeNullPrices: true,
  });

  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://api.justtcg.com/v1/cards");
  assert.equal(parsed.searchParams.get("game"), "one-piece-card-game");
  assert.equal(parsed.searchParams.get("limit"), "42");
  assert.equal(parsed.searchParams.get("updated_after"), "1710000000");
  assert.equal(parsed.searchParams.get("set"), "OP-13");
  assert.equal(parsed.searchParams.get("include_null_prices"), "true");
  assert.equal(parsed.searchParams.get("include_price_history"), "true");
  assert.equal(parsed.searchParams.get("priceHistoryDuration"), "30d");
});

test("buildSeed keeps one active approved mapping when one JustTCG product is duplicated across prints", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        results: [
          {
            cardId: "OP07-029_p1",
            confidence: "medium",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "shared-product",
              name: "Basil Hawkins (Parallel)",
              set: "500 Years in the Future",
              lastUpdated: "2026-03-25T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "500 YEARS IN THE FUTURE [OP-07]",
              releaseCode: "OP07",
              canonicalId: "OP07-029_parallel_op07",
            },
          },
          {
            cardId: "OP07-029_r1",
            confidence: "medium",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: "Review pass auto-approved: single_set_matched_premium_after_review",
            bestCandidate: {
              id: "shared-product",
              name: "Basil Hawkins (Parallel)",
              set: "500 Years in the Future",
              lastUpdated: "2026-03-25T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "ONE PIECE CARD THE BEST vol.2 [PRB-02]",
              releaseCode: "PRB02",
              canonicalId: "OP07-029_reprint_prb02",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP07-029_p1",
            justtcg_id: "shared-product",
            price_nm: 9.5,
            price_lp: 8.75,
            price_change_24h: 0.5,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "shared-product",
              name: "Basil Hawkins (Parallel)",
              set: "500 Years in the Future",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP07-029_p1",
      active_external_product_id: "justtcg:shared-product",
    },
    {
      card_print_id: "OP07-029_r1",
      active_external_product_id: null,
    },
  ]);

  const keptLink = seed.cardPrintMarketLinks.find((link) => link.card_print_id === "OP07-029_p1");
  const demotedLink = seed.cardPrintMarketLinks.find((link) => link.card_print_id === "OP07-029_r1");

  assert.equal(keptLink?.mapping_status, "exact");
  assert.equal(keptLink?.approved_by, "auto_approval");
  assert.equal(demotedLink?.mapping_status, "manual_review");
  assert.equal(demotedLink?.approved_by, null);
  assert.match(demotedLink?.review_notes || "", /Demoted during import/i);
});

test("buildSeed keeps probable raw-card mappings out of active runtime pricing", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        results: [
          {
            cardId: "OP13-120_p2",
            confidence: "0.8300",
            status: "auto_approved",
            searchMethod: "number_exact",
            notes: null,
            bestCandidate: {
              id: "sabo-red-super-aa",
              name: "Sabo (120) (Red Super Alternate Art)",
              set: "Carrying On His Will",
              lastUpdated: "2026-03-25T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "Carrying On His Will [OP-13]",
              releaseCode: "OP13",
              canonicalId: "OP13-120_red_super_alt_art",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP13-120_p2",
            justtcg_id: "sabo-red-super-aa",
            price_nm: 4749.97,
            price_lp: 3549.95,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "sabo-red-super-aa",
              name: "Sabo (120) (Red Super Alternate Art)",
              set: "Carrying On His Will",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP13-120_p2",
      active_external_product_id: null,
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, []);

  const probableLink = seed.cardPrintMarketLinks.find((link) => link.card_print_id === "OP13-120_p2");
  assert.equal(probableLink?.mapping_status, "probable");
  assert.equal(probableLink?.approved_by, null);
  assert.equal(probableLink?.approved_at, null);
});

test("buildSeed promotes clean single-candidate base mappings into active runtime pricing", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        results: [
          {
            cardId: "EB02-001",
            confidence: "0.9000",
            status: "auto_approved",
            searchMethod: "number_exact",
            confidenceReasons: ["single_plain_base_candidate"],
            notes: null,
            bestCandidate: {
              id: "karoo-eb02-base",
              name: "Karoo",
              set: "Extra Booster: Anime 25th Collection",
              lastUpdated: "2026-03-26T00:00:00.000Z",
              variants: [
                {
                  variantId: "karoo-eb02-base-nm",
                  condition: "Near Mint",
                  printing: "Normal",
                  language: "English",
                  price: 0.12,
                  lastUpdated: 1774483200,
                },
                {
                  variantId: "karoo-eb02-base-lp",
                  condition: "Lightly Played",
                  printing: "Normal",
                  language: "English",
                  price: 0.08,
                  lastUpdated: 1774483200,
                },
              ],
            },
            cardPrintContext: {
              setName: "Anime 25th Collection [EB-02]",
              releaseCode: "EB02",
              canonicalId: null,
              variantSlug: "base",
              variantLabel: "Base",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        fetchedAt: "2026-03-26T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "EB02-001",
            justtcg_id: "karoo-eb02-base",
            price_nm: 0.12,
            price_lp: 0.08,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-26T00:00:00.000Z",
            fetched_at: "2026-03-26T00:05:00.000Z",
            raw_response: {
              id: "karoo-eb02-base",
              name: "Karoo",
              set: "Extra Booster: Anime 25th Collection",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "EB02-001",
      active_external_product_id: "justtcg:karoo-eb02-base",
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "EB02-001",
      active_external_variant_id: "justtcg:karoo-eb02-base-nm",
    },
  ]);

  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "EB02-001",
      source_id: "justtcg",
      external_product_id: "justtcg:karoo-eb02-base",
      external_variant_id: "justtcg:karoo-eb02-base-nm",
      price_market: 0.12,
      price_nm: 0.12,
      price_lp: 0.08,
      price_change_24h: 0,
      price_change_7d: null,
      price_change_30d: null,
      updated_at: "2026-03-26T00:00:00.000Z",
      fetched_at: "2026-03-26T00:05:00.000Z",
    },
  ]);
  assert.deepEqual(seed.priceSnapshots, [
    {
      external_product_id: "justtcg:karoo-eb02-base",
      external_variant_id: "justtcg:karoo-eb02-base-nm",
      captured_at: "2026-03-26T00:05:00.000Z",
      price_market: 0.12,
      price_low: null,
      price_mid: null,
      price_high: null,
      price_nm: 0.12,
      price_lp: 0.08,
      currency: "USD",
      availability: null,
      raw_payload: {
        id: "karoo-eb02-base",
        name: "Karoo",
        set: "Extra Booster: Anime 25th Collection",
      },
    },
  ]);

  const exactLink = seed.cardPrintMarketLinks.find((link) => link.card_print_id === "EB02-001");
  assert.equal(exactLink?.mapping_status, "exact");
  assert.equal(exactLink?.approved_by, "auto_approval");
  assert.equal(exactLink?.approved_at, "2026-03-26T00:00:00.000Z");
});

test("buildSeed promotes reviewed clear base winners into active runtime pricing", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        results: [
          {
            cardId: "OP10-006",
            confidence: "0.9000",
            status: "auto_approved",
            searchMethod: "number_exact",
            confidenceReasons: [
              "review_pass_auto_approved",
              "clear_best_candidate",
              "single_set_matched_base_after_review",
              "multiple_candidates",
            ],
            notes: "Review pass auto-approved: single_set_matched_base_after_review",
            bestCandidate: {
              id: "caesar-clown-op10-base",
              name: "Caesar Clown (006)",
              set: "Royal Blood",
              lastUpdated: "2026-03-26T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "Royal Blood [OP-10]",
              releaseCode: "OP10",
              canonicalId: null,
              variantSlug: "base",
              variantLabel: "Base",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-26T00:00:00.000Z",
        fetchedAt: "2026-03-26T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP10-006",
            justtcg_id: "caesar-clown-op10-base",
            price_nm: 0.05,
            price_lp: 0.03,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-26T00:00:00.000Z",
            fetched_at: "2026-03-26T00:05:00.000Z",
            raw_response: {
              id: "caesar-clown-op10-base",
              name: "Caesar Clown (006)",
              set: "Royal Blood",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP10-006",
      active_external_product_id: "justtcg:caesar-clown-op10-base",
    },
  ]);

  const exactLink = seed.cardPrintMarketLinks.find((link) => link.card_print_id === "OP10-006");
  assert.equal(exactLink?.mapping_status, "exact");
  assert.equal(exactLink?.approved_by, "auto_approval");
  assert.equal(exactLink?.approved_at, "2026-03-26T00:00:00.000Z");
});

test("buildSeed preserves inferred product kind for price-data rows with raw responses", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        results: [],
      },
      priceData: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP13-120_p2",
            justtcg_id: "sabo-red-super-aa",
            price_nm: 4749.97,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "sabo-red-super-aa",
              name: "Sabo (120) (Red Super Alternate Art)",
              set: "Carrying On His Will",
              number: "OP13-120",
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

  const product = seed.externalProducts.find((entry) => entry.id === "justtcg:sabo-red-super-aa");
  assert.ok(product);
  assert.equal(product?.product_kind, "raw_card");
});

test("buildSeed leaves a mapped raw card unpriced when no Near Mint variant exists", async () => {
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
            last_updated_justtcg: "2026-03-19T12:54:12.000Z",
            fetched_at: "2026-03-19T13:00:00.000Z",
            raw_response: {
              id: "oden-no-nm",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
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

test("buildSeed trusts tcgplayer-verified exact product event mappings even below 0.95 confidence", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
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
              id: "nami-finalist-pack",
              name: "Nami (CS 25-26 Finalist Card Set 1)",
              set: "One Piece Promotion Cards",
              lastUpdated: "2026-03-25T00:00:00.000Z",
              variants: [
                {
                  variantId: "nami-finalist-pack-nm",
                  condition: "Near Mint",
                  printing: "Normal",
                  language: "English",
                  price: 850,
                  lastUpdated: "2026-03-25T00:00:00.000Z",
                },
              ],
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
        fetchedAt: "2026-03-25T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP10-033_p2",
            justtcg_id: "nami-finalist-pack",
            price_nm: 850,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "nami-finalist-pack",
              name: "Nami (CS 25-26 Finalist Card Set 1)",
              set: "One Piece Promotion Cards",
              number: "OP10-033",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP10-033_p2",
      active_external_product_id: "justtcg:nami-finalist-pack",
    },
  ]);
  assert.equal(seed.cardPrintPriceCurrent.length, 1);

  const link = seed.cardPrintMarketLinks.find((entry) => entry.card_print_id === "OP10-033_p2");
  assert.equal(link?.mapping_status, "exact");
  assert.equal(link?.approved_by, "auto_approval");
});

test("buildSeed trusts official event verified mappings even below 0.95 confidence", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        results: [
          {
            cardId: "OP05-076_p4",
            confidence: "0.9000",
            status: "auto_approved",
            searchMethod: "official_event_verified",
            notes: null,
            confidenceReasons: [
              "number_exact_match",
              "name_exact_match",
              "event_label_match",
              "official_event_verified",
              "tcgplayer_verified",
            ],
            bestCandidate: {
              id: "pirates-league-finals-textured-foil",
              name: "When You're at Sea You Fight against Pirates!! (2025 Pirates League Finals Textured Foil)",
              set: "One Piece Promotion Cards",
              lastUpdated: "2026-03-25T00:00:00.000Z",
              variants: [
                {
                  variantId: "pirates-league-finals-textured-foil-nm",
                  condition: "Near Mint",
                  printing: "Foil",
                  language: "English",
                  price: 1392.24,
                  lastUpdated: "2026-03-25T00:00:00.000Z",
                },
              ],
            },
            cardPrintContext: {
              setName: "Pirates League Three Captains Battle & Support Crew Battle",
              releaseCode: "PRIZE",
              canonicalId: "OP05-076_pirates_league_finals_textured_foil",
              variantSlug: "pirates_league_finals_textured_foil",
              variantLabel: "Pirates League Finals Textured Foil",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP05-076_p4",
            justtcg_id: "pirates-league-finals-textured-foil",
            price_nm: 1392.24,
            last_updated_justtcg: "2026-03-25T00:00:00.000Z",
            fetched_at: "2026-03-25T00:05:00.000Z",
            raw_response: {
              id: "pirates-league-finals-textured-foil",
              name: "When You're at Sea You Fight against Pirates!! (2025 Pirates League Finals Textured Foil)",
              set: "One Piece Promotion Cards",
              number: "OP05-076",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP05-076_p4",
      active_external_product_id: "justtcg:pirates-league-finals-textured-foil",
    },
  ]);
  assert.equal(seed.cardPrintPriceCurrent.length, 1);

  const link = seed.cardPrintMarketLinks.find((entry) => entry.card_print_id === "OP05-076_p4");
  assert.equal(link?.mapping_status, "exact");
  assert.equal(link?.approved_by, "auto_approval");
});

test("buildSeed trusts reviewed premium exact-set winners into active runtime pricing", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const productId = "one-piece-card-game-carrying-on-his-will-portgas-d-ace-119-red-super-alternate-art-secret-rare";
  const variantId = `${productId}_near-mint_foil`;

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        results: [
          {
            cardId: "OP13-119_p3",
            confidence: "medium",
            status: "auto_approved",
            searchMethod: "number_exact",
            confidenceReasons: [
              "review_pass_auto_approved",
              "premium_exact_set_match",
              "single_set_matched_premium_after_review",
              "final_aggressive_review_pass",
              "premium_lane",
              "multiple_premium_candidates_correct_set",
              "multiple_candidates",
              "premium_hint_mismatch",
            ],
            notes: "Review pass auto-approved: single_set_matched_premium_after_review",
            bestCandidate: {
              id: productId,
              name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
              set: "Carrying On His Will",
              tcgplayerId: "657406",
              exactNumber: true,
              exactName: true,
              setMatches: true,
              variants: [
                {
                  variantId,
                  condition: "Near Mint",
                  printing: "Foil",
                  language: "English",
                  price: 4420.37,
                  lastUpdated: "2026-03-29T00:00:00.000Z",
                },
              ],
              lastUpdated: "2026-03-29T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "CARRYING ON HIS WILL [OP-13]",
              releaseCode: "OP13",
              canonicalId: "OP13-119_red_super_alternate_art_op13_print_3",
              variantSlug: "red_super_alternate_art_op13_print_3",
              variantLabel: "Red Super Alternate Art",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        fetchedAt: "2026-03-29T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP13-119_p3",
            justtcg_id: productId,
            price_nm: 4420.37,
            price_lp: 3315.28,
            last_updated_justtcg: "2026-03-29T00:00:00.000Z",
            fetched_at: "2026-03-29T00:05:00.000Z",
            raw_response: {
              id: productId,
              name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
              set: "Carrying On His Will",
              number: "OP13-119",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP13-119_p3",
      active_external_product_id: `justtcg:${productId}`,
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "OP13-119_p3",
      active_external_variant_id: `justtcg:${variantId}`,
    },
  ]);
  assert.equal(seed.cardPrintPriceCurrent.length, 1);

  const link = seed.cardPrintMarketLinks.find((entry) => entry.card_print_id === "OP13-119_p3");
  assert.equal(link?.mapping_status, "exact");
  assert.equal(link?.approved_by, "auto_approval");
});

test("buildSeed synthesizes stable variant IDs when JustTCG omits variantId for a priced card", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const productId = "one-piece-card-game-carrying-on-his-will-portgas-d-ace-002-leader";
  const synthesizedVariantId = `${productId}_near-mint_normal`;

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        results: [
          {
            cardId: "OP13-002",
            confidence: "0.99",
            status: "auto_approved",
            searchMethod: "number_exact",
            confidenceReasons: [
              "live_justtcg_exact_print_match",
              "leader_recovery_batch",
            ],
            notes: "Leader recovery batch from live JustTCG + set/variant matching",
            bestCandidate: {
              id: productId,
              name: "Portgas.D.Ace (002)",
              set: "Carrying On His Will",
              tcgplayerId: "657252",
              variants: [
                {
                  variantId: null,
                  condition: "Near Mint",
                  printing: "Normal",
                  language: "English",
                  price: 0.13,
                  lastUpdated: 1774800184,
                },
                {
                  variantId: null,
                  condition: "Lightly Played",
                  printing: "Normal",
                  language: "English",
                  price: 0.14,
                  lastUpdated: 1774800184,
                },
              ],
              lastUpdated: "2026-03-29T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "CARRYING ON HIS WILL [OP-13]",
              releaseCode: "OP13",
              canonicalId: null,
              variantSlug: "base",
              variantLabel: "Base",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        fetchedAt: "2026-03-29T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP13-002",
            justtcg_id: productId,
            price_nm: 0.13,
            price_lp: 0.14,
            last_updated_justtcg: "2026-03-29T00:00:00.000Z",
            fetched_at: "2026-03-29T00:05:00.000Z",
            raw_response: {
              id: productId,
              name: "Portgas.D.Ace (002)",
              set: "Carrying On His Will",
              number: "OP13-002",
              variants: [
                {
                  variantId: null,
                  condition: "Near Mint",
                  printing: "Normal",
                  language: "English",
                  price: 0.13,
                  lastUpdated: 1774800184,
                },
              ],
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "OP13-002",
      active_external_product_id: `justtcg:${productId}`,
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "OP13-002",
      active_external_variant_id: `justtcg:${synthesizedVariantId}`,
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "OP13-002",
      source_id: "justtcg",
      external_product_id: `justtcg:${productId}`,
      external_variant_id: `justtcg:${synthesizedVariantId}`,
      price_market: 0.13,
      price_nm: 0.13,
      price_lp: 0.14,
      price_change_24h: null,
      price_change_7d: null,
      price_change_30d: null,
      updated_at: "2026-03-29T00:00:00.000Z",
      fetched_at: "2026-03-29T00:05:00.000Z",
    },
  ]);
});

test("buildSeed appends canonical variant payload history rows for approved mappings", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const payloadVariant = {
    variantId: "payload-oden_near-mint_foil",
    condition: "Near Mint",
    printing: "Foil",
    language: "English",
    price: 46.18,
    lastUpdated: "2026-04-18T09:00:00.000Z",
    priceHistory: [
      { p: 49.48, t: 1775952000 },
      { p: 46.18, t: 1776470400 },
    ],
  };

  const seed = buildSeed(
    {
      catalog: {
        fetchedAt: "2026-04-18T09:00:00.000Z",
        cards: [
          {
            id: "payload-oden",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            lastUpdated: "2026-04-18T09:00:00.000Z",
            variants: [payloadVariant],
          },
        ],
      },
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-04-18T09:00:00.000Z",
        results: [
          {
            cardId: "EB01-001_p1",
            confidence: "high",
            status: "auto_approved",
            searchMethod: "number_exact",
            bestCandidate: {
              id: "payload-oden",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
              lastUpdated: "2026-04-18T09:00:00.000Z",
              variants: [payloadVariant],
            },
            cardPrintContext: {
              setName: "Extra Booster: Memorial Collection",
              releaseCode: "EB01",
              canonicalId: "EB01-001_p1",
            },
          },
        ],
      },
      priceData: null,
    },
    { includeTcgplayerSource: false },
  );

  assert.deepEqual(seed.cardPrintPriceHistory, [
    {
      card_print_id: "EB01-001_p1",
      source_id: "justtcg",
      external_product_id: "justtcg:payload-oden",
      external_variant_id: "justtcg:payload-oden_near-mint_foil",
      recorded_at: "2026-04-12T00:00:00.000Z",
      price_nm: 49.48,
      price_lp: null,
      price_market: null,
    },
    {
      card_print_id: "EB01-001_p1",
      source_id: "justtcg",
      external_product_id: "justtcg:payload-oden",
      external_variant_id: "justtcg:payload-oden_near-mint_foil",
      recorded_at: "2026-04-18T00:00:00.000Z",
      price_nm: 46.18,
      price_lp: null,
      price_market: null,
    },
  ]);
});

test("buildSeed synthesizes variant rows from flat JustTCG price sync data when variants are missing", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const productId = "one-piece-card-game-carrying-on-his-will-portgas-d-ace-002-leader";
  const synthesizedVariantId = `${productId}_near-mint_normal`;

  const seed = buildSeed(
    {
      catalog: null,
      officialReleases: [],
      mappingReport: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        results: [
          {
            cardId: "OP13-002",
            confidence: "0.99",
            status: "auto_approved",
            searchMethod: "live_number_lookup",
            confidenceReasons: ["live_justtcg_exact_print_match", "leader_recovery_batch"],
            notes: "Leader recovery batch from live JustTCG + set/variant matching",
            bestCandidate: {
              id: productId,
              name: "Portgas.D.Ace (002)",
              set: "Carrying On His Will",
              tcgplayerId: "657252",
              lastUpdated: "2026-03-29T00:00:00.000Z",
            },
            cardPrintContext: {
              setName: "CARRYING ON HIS WILL [OP-13]",
              releaseCode: "OP13",
              canonicalId: null,
              variantSlug: "base",
              variantLabel: "Base",
            },
          },
        ],
      },
      priceData: {
        generatedAt: "2026-03-29T00:00:00.000Z",
        fetchedAt: "2026-03-29T00:00:00.000Z",
        priceRows: [
          {
            devilfruit_id: "OP13-002",
            justtcg_id: productId,
            price_nm: 0.12,
            price_lp: 0.14,
            last_updated_justtcg: "2026-03-29T00:00:00.000Z",
            fetched_at: "2026-03-29T00:05:00.000Z",
            raw_response: {
              id: productId,
              name: "Portgas.D.Ace (002)",
              set: "Carrying On His Will",
              tcgplayerId: "657252",
              image: null,
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
      card_print_id: "OP13-002",
      active_external_variant_id: `justtcg:${synthesizedVariantId}`,
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "OP13-002",
      source_id: "justtcg",
      external_product_id: `justtcg:${productId}`,
      external_variant_id: `justtcg:${synthesizedVariantId}`,
      price_market: 0.12,
      price_nm: 0.12,
      price_lp: 0.14,
      price_change_24h: null,
      price_change_7d: null,
      price_change_30d: null,
      updated_at: "2026-03-29T00:00:00.000Z",
      fetched_at: "2026-03-29T00:05:00.000Z",
    },
  ]);
});

test("buildSeed uses the Near Mint JustTCG variant as the canonical runtime price source", async () => {
  const { buildSeed } =
    await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
      "scripts/import-justtcg-to-drizzle.mjs",
    );

  const seed = buildSeed(
    {
      catalog: {
        cards: [
          {
            id: "oden-neo-openings",
            name: "Kouzuki Oden",
            set: "Extra Booster: Memorial Collection",
            tcgplayerId: "544523",
            variants: [
                {
                  variantId: "oden-neo-openings-lp",
                  condition: "Lightly Played",
                  printing: "Normal",
                  language: "English",
                  price: 0.18,
                  lastUpdated: 1742388600,
                  priceHistory: [{ price: 0.21, recordedAt: "2026-03-18T12:50:00.000Z" }],
                },
                {
                  variantId: "oden-neo-openings-nm",
                  condition: "Near Mint",
                  printing: "Normal",
                  language: "English",
                  price: 0.22,
                  lastUpdated: 1742388852,
                  priceHistory: [{ price: 0.23, recordedAt: "2026-03-18T12:54:12.000Z" }],
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
              id: "oden-neo-openings",
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
            justtcg_id: "oden-neo-openings",
            price_market: 7.77,
            price_nm: 0.45,
            price_lp: 0.18,
            price_change_24h: 0,
            last_updated_justtcg: "2026-03-19T12:54:12.000Z",
            fetched_at: "2026-03-19T13:00:00.000Z",
            raw_response: {
              id: "oden-neo-openings",
              name: "Kouzuki Oden",
              set: "Extra Booster: Memorial Collection",
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

  assert.deepEqual(seed.activeCardPrintAssignments, [
    {
      card_print_id: "EB01-001",
      active_external_product_id: "justtcg:oden-neo-openings",
    },
  ]);
  assert.deepEqual(seed.activeCardPrintVariantAssignments, [
    {
      card_print_id: "EB01-001",
      active_external_variant_id: "justtcg:oden-neo-openings-nm",
    },
  ]);
  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "EB01-001",
      source_id: "justtcg",
      external_product_id: "justtcg:oden-neo-openings",
      external_variant_id: "justtcg:oden-neo-openings-nm",
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
      external_product_id: "justtcg:oden-neo-openings",
      external_variant_id: "justtcg:oden-neo-openings-nm",
      recorded_at: "2026-03-19T12:54:12.000Z",
      price_nm: 0.22,
      price_lp: 0.18,
      price_market: 0.22,
    },
  ]);
  assert.deepEqual(seed.priceSnapshots, [
    {
      external_product_id: "justtcg:oden-neo-openings",
      external_variant_id: "justtcg:oden-neo-openings-nm",
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
        id: "oden-neo-openings",
        name: "Kouzuki Oden",
        set: "Extra Booster: Memorial Collection",
      },
    },
  ]);
});

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

  assert.deepEqual(seed.cardPrintPriceCurrent, [
    {
      card_print_id: "EB02-001",
      source_id: "justtcg",
      external_product_id: "justtcg:karoo-eb02-base",
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

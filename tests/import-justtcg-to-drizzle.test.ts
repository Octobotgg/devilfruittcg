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

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("runBackfill requests paginated 1y GET pages and skips DB writes on dry-run", async () => {
  type BackfillModule = {
    runBackfill: (options: {
      args: {
        dryRun: boolean;
        limitPages: number;
        batchSize: number;
        fetchDelayMs: number;
      };
      sql: { unsafe: (text: string, params?: unknown[]) => Promise<unknown[]> };
      apiKey: string;
      fetchPage: (options: Record<string, unknown>) => Promise<{
        cards: Array<{
          id: string;
          variants: Array<{
            id: string;
            priceHistory: Array<{ p: number; t: number }>;
          }>;
        }>;
        meta: { total: number };
      }>;
      insertRows: (rows: unknown[]) => Promise<{ inserted: number; skippedDueToConflict: number }>;
      sleepImpl: () => Promise<void>;
      log: () => void;
    }) => Promise<{
      rowsExtracted: number;
      rowsPendingInsert: number;
      estimatedPages: number | null;
    }>;
  };
  const backfill = await importModule<BackfillModule>("scripts/backfill-price-history-1y.mjs");
  const fetchPageCalls: Array<Record<string, unknown>> = [];
  const insertCalls: unknown[] = [];
  const sql = {
    unsafe: async (text: string) => {
      if (text.includes("from card_print_price_published")) {
        return [
          {
            card_print_id: "EB01-001",
            source_id: "justtcg",
            external_product_id: "justtcg:oden",
            external_variant_id: "justtcg:oden_near-mint",
          },
        ];
      }
      if (text.includes("from card_print_price_history")) return [];
      return [];
    },
  };

  const summary = await backfill.runBackfill({
    args: {
      dryRun: true,
      limitPages: 1,
      batchSize: 1000,
      fetchDelayMs: 1300,
    },
    sql,
    apiKey: "test-key",
    fetchPage: async (options: Record<string, unknown>) => {
      fetchPageCalls.push(options);
      return {
        cards: [
          {
            id: "oden",
            variants: [
              {
                id: "oden_near-mint",
                priceHistory: [
                  { p: 0.2, t: 1775952000 },
                  { p: 0.21, t: 1776038400 },
                ],
              },
            ],
          },
        ],
        meta: { total: 4197 },
      };
    },
    insertRows: async (rows: unknown[]) => {
      insertCalls.push(rows);
      return { inserted: rows.length, skippedDueToConflict: 0 };
    },
    sleepImpl: async () => {},
    log: () => {},
  });

  assert.equal(fetchPageCalls.length, 1);
  assert.equal(fetchPageCalls[0].priceHistoryDuration, "1y");
  assert.equal(fetchPageCalls[0].includePriceHistory, true);
  assert.equal(fetchPageCalls[0].includeNullPrices, true);
  assert.equal(fetchPageCalls[0].limit, 100);
  assert.equal(fetchPageCalls[0].offset, 0);
  assert.equal(insertCalls.length, 0);
  assert.equal(summary.rowsExtracted, 2);
  assert.equal(summary.rowsPendingInsert, 2);
  assert.equal(summary.estimatedPages, 42);
});

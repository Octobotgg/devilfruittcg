#!/usr/bin/env node

import postgres from "postgres";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extractHistoryRowsFromPayload } from "./justtcg-price-history-payload.mjs";
import { fetchJusttcgCatalogPage } from "./import-justtcg-to-drizzle.mjs";

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_FETCH_DELAY_MS = 1300;
const DEFAULT_PAGE_SIZE = 100;
const GAME_ID = "one-piece-card-game";
const JUSTTCG_SOURCE_ID = "justtcg";
const ONE_YEAR_PRICE_HISTORY_DURATION = "1y";

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limitPages: null,
    batchSize: DEFAULT_BATCH_SIZE,
    fetchDelayMs: DEFAULT_FETCH_DELAY_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--limit-pages") {
      args.limitPages = parsePositiveInteger(argv[++index], null);
      continue;
    }
    if (arg === "--batch-size") {
      args.batchSize = parsePositiveInteger(argv[++index], DEFAULT_BATCH_SIZE);
      continue;
    }
    if (arg === "--fetch-delay-ms") {
      const parsed = Number.parseInt(String(argv[++index] || ""), 10);
      args.fetchDelayMs = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_FETCH_DELAY_MS;
    }
  }

  return args;
}

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
  if (!raw) throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  return raw;
}

function getJusttcgApiKey() {
  const raw = String(process.env.JUSTTCG_API_KEY || "").trim();
  if (!raw) throw new Error("Missing JUSTTCG_API_KEY");
  return raw;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizeParamValue(column, value) {
  if (value == null) return null;
  if (column.endsWith("_at")) return new Date(value).toISOString();
  return value;
}

function buildHistoryRowKey(row) {
  return [
    row.card_print_id,
    row.source_id,
    row.external_product_id,
    row.external_variant_id,
    new Date(row.recorded_at).toISOString(),
  ].join("::");
}

async function fetchPublishedRows(sql) {
  return sql.unsafe(
    `
      select card_print_id, source_id, external_product_id, external_variant_id
      from card_print_price_published
      where source_id = $1
        and external_product_id is not null
        and external_variant_id is not null
    `,
    [JUSTTCG_SOURCE_ID],
  );
}

function buildPublishedVariantLookup(rows) {
  const lookup = new Map();

  for (const row of rows || []) {
    const externalProductId = String(row.external_product_id || "").trim();
    const externalVariantId = String(row.external_variant_id || "").trim();
    if (!externalProductId || !externalVariantId) continue;

    const key = `${externalProductId}::${externalVariantId}`;
    const list = lookup.get(key) || [];
    list.push(row);
    lookup.set(key, list);
  }

  return lookup;
}

function getVariantHistoryPayload(variant) {
  return variant?.priceHistory || variant?.price_history || null;
}

function isValidHistoryPayloadPoint(point) {
  const timestampSeconds = typeof point?.t === "number" ? point.t : Number(point?.t);
  const priceNm = typeof point?.p === "number" ? point.p : Number(point?.p);
  return Number.isFinite(timestampSeconds) && Number.isFinite(priceNm);
}

function countInvalidHistoryPayloadPoints(payload) {
  if (!Array.isArray(payload)) return 0;
  return payload.reduce((count, point) => count + (isValidHistoryPayloadPoint(point) ? 0 : 1), 0);
}

function incrementSkipReason(skipReasons, reason, count = 1) {
  if (!count) return;
  skipReasons[reason] = (skipReasons[reason] || 0) + count;
}

function formatSkipReasons(skipReasons) {
  const entries = Object.entries(skipReasons || {}).sort((left, right) => right[1] - left[1]);
  if (!entries.length) return "Skip reasons:\n  none: 0";
  return ["Skip reasons:", ...entries.map(([reason, count]) => `  ${reason}: ${count}`)].join("\n");
}

function extractBackfillHistoryRowsFromCards(cards, publishedVariantLookup) {
  const rows = [];
  let matchedVariants = 0;
  let skippedUnmappedPoints = 0;
  const skipReasons = {};

  for (const card of cards || []) {
    const externalProductId = card?.id ? `justtcg:${card.id}` : "";
    if (!Array.isArray(card?.variants)) continue;

    for (const variant of card.variants) {
      const externalVariantId = variant?.id ? `justtcg:${variant.id}` : "";
      const payload = getVariantHistoryPayload(variant);
      if (!externalVariantId || !Array.isArray(payload) || !payload.length) continue;
      if (!externalProductId) {
        incrementSkipReason(skipReasons, "missing_external_product_id", payload.length);
        continue;
      }

      const matches = publishedVariantLookup.get(`${externalProductId}::${externalVariantId}`) || [];
      if (!matches.length) {
        skippedUnmappedPoints += payload.length;
        incrementSkipReason(skipReasons, "no_card_print_mapping", payload.length);
        continue;
      }

      matchedVariants += 1;
      for (const match of matches) {
        incrementSkipReason(skipReasons, "invalid_payload_point", countInvalidHistoryPayloadPoints(payload));
        rows.push(
          ...extractHistoryRowsFromPayload({
            cardPrintId: match.card_print_id,
            externalProductId: match.external_product_id,
            externalVariantId: match.external_variant_id,
            sourceId: match.source_id,
            payload,
            logSkipped: () => {},
          }),
        );
      }
    }
  }

  return { rows, matchedVariants, skippedUnmappedPoints, skipReasons };
}

async function fetchExistingHistoryKeys(sql, historyRows, batchSize) {
  const keys = new Set();
  if (!historyRows.length) return keys;

  for (const group of chunk(historyRows, batchSize)) {
    const params = [];
    const tuples = group
      .map((row) => {
        params.push(
          row.card_print_id,
          row.source_id,
          row.external_product_id,
          row.external_variant_id,
          row.recorded_at,
        );
        return `($${params.length - 4}, $${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const rows = await sql.unsafe(
      `
        select card_print_id, source_id, external_product_id, external_variant_id, recorded_at
        from card_print_price_history
        where (card_print_id, source_id, external_product_id, external_variant_id, recorded_at) in (${tuples})
      `,
      params,
    );

    for (const row of rows) {
      keys.add(buildHistoryRowKey(row));
    }
  }

  return keys;
}

async function insertHistoryRows(sql, historyRows, batchSize) {
  let inserted = 0;
  let skippedDueToConflict = 0;
  const columns = [
    "card_print_id",
    "source_id",
    "external_product_id",
    "external_variant_id",
    "recorded_at",
    "price_nm",
    "price_lp",
    "price_market",
  ];

  for (const group of chunk(historyRows, batchSize)) {
    const params = [];
    let paramIndex = 1;
    const valuesSql = group
      .map((row) => {
        const placeholders = columns.map((column) => {
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}`;
          paramIndex += 1;
          return token;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const sqlText = [
      `insert into ${quoteIdentifier("card_print_price_history")} (${columns.map(quoteIdentifier).join(", ")})`,
      `values ${valuesSql}`,
      `on conflict (${[
        "card_print_id",
        "source_id",
        "external_product_id",
        "external_variant_id",
        "recorded_at",
      ].map(quoteIdentifier).join(", ")}) do nothing`,
      "returning 1",
    ].join(" ");

    const result = await sql.unsafe(sqlText, params);
    inserted += result.length;
    skippedDueToConflict += group.length - result.length;
  }

  return { inserted, skippedDueToConflict };
}

async function runBackfill({
  args = parseArgs([]),
  sql,
  apiKey,
  fetchPage = fetchJusttcgCatalogPage,
  insertRows = insertHistoryRows,
  sleepImpl = sleep,
  log = console.log,
}) {
  const publishedRows = await fetchPublishedRows(sql);
  const publishedVariantLookup = buildPublishedVariantLookup(publishedRows);
  const summary = {
    dryRun: Boolean(args.dryRun),
    pagesFetched: 0,
    cardsProcessed: 0,
    variantsMatched: 0,
    rowsExtracted: 0,
    rowsAlreadyExisting: 0,
    rowsPendingInsert: 0,
    rowsInserted: 0,
    rowsSkippedDueToConflict: 0,
    rowsSkippedUnmappedPoints: 0,
    skipReasons: {},
    totalReported: null,
    estimatedPages: null,
    estimatedRowsExtractedFullRun: null,
    estimatedRowsPendingFullRun: null,
  };

  let offset = 0;

  while (true) {
    const page = await fetchPage({
      apiKey,
      game: GAME_ID,
      limit: DEFAULT_PAGE_SIZE,
      offset,
      includeNullPrices: true,
      includePriceHistory: true,
      priceHistoryDuration: ONE_YEAR_PRICE_HISTORY_DURATION,
    });

    const cards = Array.isArray(page?.cards) ? page.cards : [];
    const totalReported = Number(page?.meta?.total);
    if (Number.isFinite(totalReported) && totalReported > 0) {
      summary.totalReported = totalReported;
      summary.estimatedPages = Math.ceil(totalReported / DEFAULT_PAGE_SIZE);
    }

    const extracted = extractBackfillHistoryRowsFromCards(cards, publishedVariantLookup);
    const existingKeys = await fetchExistingHistoryKeys(sql, extracted.rows, args.batchSize);
    const pendingRows = extracted.rows.filter((row) => !existingKeys.has(buildHistoryRowKey(row)));

    let writeSummary = { inserted: 0, skippedDueToConflict: 0 };
    if (!args.dryRun) {
      writeSummary =
        insertRows === insertHistoryRows
          ? await insertRows(sql, pendingRows, args.batchSize)
          : await insertRows(pendingRows, args.batchSize);
    }

    summary.pagesFetched += 1;
    summary.cardsProcessed += cards.length;
    summary.variantsMatched += extracted.matchedVariants;
    summary.rowsExtracted += extracted.rows.length;
    summary.rowsAlreadyExisting += extracted.rows.length - pendingRows.length;
    summary.rowsPendingInsert += pendingRows.length;
    summary.rowsInserted += writeSummary.inserted;
    summary.rowsSkippedDueToConflict += writeSummary.skippedDueToConflict;
    summary.rowsSkippedUnmappedPoints += extracted.skippedUnmappedPoints;
    for (const [reason, count] of Object.entries(extracted.skipReasons)) {
      incrementSkipReason(summary.skipReasons, reason, count);
    }

    log(
      `Page ${summary.pagesFetched}: cards=${cards.length}, extracted=${extracted.rows.length}, pending=${pendingRows.length}, inserted=${writeSummary.inserted}, conflicts=${writeSummary.skippedDueToConflict}`,
    );

    const reachedLimit = args.limitPages != null && summary.pagesFetched >= args.limitPages;
    if (cards.length < DEFAULT_PAGE_SIZE || reachedLimit) break;

    offset += DEFAULT_PAGE_SIZE;
    if (args.fetchDelayMs) await sleepImpl(args.fetchDelayMs);
  }

  if (summary.estimatedPages == null) {
    summary.estimatedPages = summary.pagesFetched;
  }

  if (summary.pagesFetched > 0 && summary.estimatedPages != null) {
    const scale = summary.estimatedPages / summary.pagesFetched;
    summary.estimatedRowsExtractedFullRun = Math.round(summary.rowsExtracted * scale);
    summary.estimatedRowsPendingFullRun = Math.round(summary.rowsPendingInsert * scale);
  }

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    const summary = await runBackfill({
      args,
      sql,
      apiKey: getJusttcgApiKey(),
    });
    console.log(JSON.stringify(summary, null, 2));
    console.log(formatSkipReasons(summary.skipReasons));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

export {
  buildPublishedVariantLookup,
  extractBackfillHistoryRowsFromCards,
  formatSkipReasons,
  parseArgs,
  runBackfill,
};

#!/usr/bin/env node

import postgres from "postgres";
import { extractHistoryRowsFromPayload } from "./justtcg-price-history-payload.mjs";

const DEFAULT_BATCH_SIZE = 1000;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--batch-size") {
      args.batchSize = Number.parseInt(argv[++index] || "", 10);
    }
  }

  if (!Number.isFinite(args.batchSize) || args.batchSize <= 0) {
    throw new Error("--batch-size must be a positive integer");
  }

  return args;
}

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();
  if (!raw) throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  return raw;
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
    row.external_product_id ?? "",
    row.external_variant_id ?? "",
    new Date(row.recorded_at).toISOString(),
  ].join("::");
}

async function fetchPayloadVariants(sql) {
  return sql`
    select
      published.card_print_id,
      published.external_product_id,
      published.source_id,
      variant.id as external_variant_id,
      variant.price_history_payload
    from external_product_variants variant
    join card_print_price_published published
      on published.external_variant_id = variant.id
     and published.external_product_id = variant.external_product_id
     and published.source_id = variant.source_id
    where variant.price_history_payload is not null
      and case
        when jsonb_typeof(variant.price_history_payload) = 'array'
          then jsonb_array_length(variant.price_history_payload)
        else 0
      end >= 2
    order by published.card_print_id, variant.id
  `;
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
    console.log(`Inserted ${inserted} rows so far (${skippedDueToConflict} skipped due to conflict)`);
  }

  return { inserted, skippedDueToConflict };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    const variants = await fetchPayloadVariants(sql);
    const extractedRows = [];
    let skippedUnresolved = 0;

    for (const variant of variants) {
      if (!variant.card_print_id || !variant.external_product_id || !variant.external_variant_id || !variant.source_id) {
        skippedUnresolved += Array.isArray(variant.price_history_payload) ? variant.price_history_payload.length : 0;
        continue;
      }

      extractedRows.push(
        ...extractHistoryRowsFromPayload({
          cardPrintId: variant.card_print_id,
          externalProductId: variant.external_product_id,
          externalVariantId: variant.external_variant_id,
          sourceId: variant.source_id,
          payload: variant.price_history_payload,
        }),
      );
    }

    const existingKeys = await fetchExistingHistoryKeys(sql, extractedRows, args.batchSize);
    const pendingRows = extractedRows.filter((row) => !existingKeys.has(buildHistoryRowKey(row)));

    console.log(
      JSON.stringify(
        {
          dryRun: args.dryRun,
          variantsProcessed: variants.length,
          rowsExtracted: extractedRows.length,
          rowsAlreadyExisting: extractedRows.length - pendingRows.length,
          rowsPendingInsert: pendingRows.length,
          rowsSkippedUnresolvedIdentity: skippedUnresolved,
        },
        null,
        2,
      ),
    );

    if (args.dryRun) return;

    const writeSummary = await insertHistoryRows(sql, pendingRows, args.batchSize);
    console.log(
      JSON.stringify(
        {
          variantsProcessed: variants.length,
          rowsExtracted: extractedRows.length,
          rowsInserted: writeSummary.inserted,
          rowsSkippedDueToConflict: writeSummary.skippedDueToConflict + (extractedRows.length - pendingRows.length),
          rowsSkippedUnresolvedIdentity: skippedUnresolved,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MAPPING_REPORT_PATH = path.join(ROOT, ".cache", "justtcg", "released-mapping-report.json");
const DEFAULT_PRICE_DATA_PATH = path.join(ROOT, ".cache", "justtcg", "approved-price-sync-data.json");
const OFFICIAL_RELEASES_PATH = path.join(ROOT, "data", "bandai-en-official-releases.json");

function parseArgs(argv) {
  const args = {
    mappingReport: DEFAULT_MAPPING_REPORT_PATH,
    priceData: DEFAULT_PRICE_DATA_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mapping-report") {
      args.mappingReport = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.mappingReport;
      index += 1;
      continue;
    }
    if (value === "--price-data") {
      args.priceData = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.priceData;
      index += 1;
    }
  }

  return args;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function normalizeParamValue(column, value) {
  if (value === undefined) return null;
  if (column === "raw_payload" || column === "metadata") return value == null ? null : JSON.stringify(value);
  return value;
}

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "")
    .replace(/\\n/g, "")
    .trim();
  if (!raw) throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  return raw;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function importSeedBuilder() {
  return import(pathToFileURL(path.join(ROOT, "scripts/import-justtcg-to-drizzle.mjs")).href);
}

async function upsertRow(sql, tableName, row, conflictColumns) {
  const columns = Object.keys(row);
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
  const params = columns.map((column) => normalizeParamValue(column, row[column]));
  const valuesSql = columns
    .map((column, index) => `$${index + 1}${column === "raw_payload" || column === "metadata" ? "::jsonb" : ""}`)
    .join(", ");
  const updateSql = updateColumns
    .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
    .join(", ");

  const sqlText = [
    `insert into ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})`,
    `values (${valuesSql})`,
    `on conflict (${conflictColumns.map(quoteIdentifier).join(", ")}) do update set ${updateSql}`,
  ].join(" ");

  await sql.unsafe(sqlText, params);
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function upsertRows(sql, tableName, rows, conflictColumns, chunkSize, label) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

  const groups = chunk(rows, chunkSize);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const params = [];
    let paramIndex = 1;
    const valuesSql = group
      .map((row) => {
        const placeholders = columns.map((column) => {
          const cast = column === "raw_payload" || column === "metadata" ? "::jsonb" : "";
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}${cast}`;
          paramIndex += 1;
          return token;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");
    const updateSql = updateColumns
      .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
      .join(", ");
    const sqlText = [
      `insert into ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})`,
      `values ${valuesSql}`,
      `on conflict (${conflictColumns.map(quoteIdentifier).join(", ")}) do update set ${updateSql}`,
    ].join(" ");
    await sql.unsafe(sqlText, params);
    await logProgress(label, Math.min((groupIndex + 1) * chunkSize, rows.length), rows.length);
  }
}

async function insertSnapshot(sql, row) {
  const columns = Object.keys(row);
  const params = columns.map((column) => normalizeParamValue(column, row[column]));
  const valuesSql = columns
    .map((column, index) => `$${index + 1}${column === "raw_payload" ? "::jsonb" : ""}`)
    .join(", ");
  const sqlText = `insert into "price_snapshots" (${columns.map(quoteIdentifier).join(", ")}) values (${valuesSql})`;
  await sql.unsafe(sqlText, params);
}

async function insertSnapshots(sql, rows, chunkSize, label) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const groups = chunk(rows, chunkSize);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const params = [];
    let paramIndex = 1;
    const valuesSql = group
      .map((row) => {
        const placeholders = columns.map((column) => {
          const cast = column === "raw_payload" ? "::jsonb" : "";
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}${cast}`;
          paramIndex += 1;
          return token;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");
    const sqlText = `insert into "price_snapshots" (${columns.map(quoteIdentifier).join(", ")}) values ${valuesSql}`;
    await sql.unsafe(sqlText, params);
    await logProgress(label, Math.min((groupIndex + 1) * chunkSize, rows.length), rows.length);
  }
}

async function applyActiveAssignments(sql, assignments, chunkSize, label) {
  if (!assignments.length) return;
  const groups = chunk(assignments, chunkSize);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const params = [];
    const valuesSql = group
      .map((row) => {
        params.push(row.card_print_id, row.active_external_product_id);
        return `($${params.length - 1}, $${params.length})`;
      })
      .join(", ");
    const sqlText = `
      update "card_prints" as target
      set "active_external_product_id" = source."active_external_product_id"
      from (values ${valuesSql}) as source("card_print_id", "active_external_product_id")
      where target."id" = source."card_print_id"
    `;
    await sql.unsafe(sqlText, params);
    await logProgress(label, Math.min((groupIndex + 1) * chunkSize, assignments.length), assignments.length);
  }
}

async function logProgress(label, index, total) {
  if (index === 1 || index === total || index % 100 === 0) {
    console.log(`${label}: ${index}/${total}`);
  }
}

async function fetchExistingIds(sql, tableName) {
  const rows = await sql.unsafe(`select "id" from ${quoteIdentifier(tableName)}`);
  return new Set(rows.map((row) => row.id));
}

async function fetchExistingCurrentKeys(sql) {
  const rows = await sql.unsafe(
    `select "card_print_id", "source_id" from "card_print_price_current" where "source_id" = $1`,
    ["justtcg"],
  );
  return new Set(rows.map((row) => `${row.card_print_id}::${row.source_id}`));
}

async function fetchExistingSnapshotKeys(sql) {
  const rows = await sql.unsafe(
    `select "external_product_id", "captured_at" from "price_snapshots" where "external_product_id" like 'justtcg:%'`,
  );
  return new Set(rows.map((row) => `${row.external_product_id}::${new Date(row.captured_at).toISOString()}`));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [builder, mappingReport, priceData, officialReleases] = await Promise.all([
    importSeedBuilder(),
    readJson(args.mappingReport),
    readJson(args.priceData),
    readJson(OFFICIAL_RELEASES_PATH),
  ]);

  const seed = builder.buildSeed(
    {
      catalog: null,
      mappingReport,
      priceData,
      officialReleases,
    },
    {
      apply: false,
      includeTcgplayerSource: true,
      catalog: "",
      mappingReport: args.mappingReport,
      priceData: args.priceData,
      seedOut: null,
      chunkSize: 1,
    },
  );

  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    const [existingExternalSourceIds, existingExternalProductIds, existingLinkIds, existingCurrentKeys, existingSnapshotKeys] =
      await Promise.all([
        fetchExistingIds(sql, "external_sources"),
        fetchExistingIds(sql, "external_products"),
        fetchExistingIds(sql, "card_print_market_links"),
        fetchExistingCurrentKeys(sql),
        fetchExistingSnapshotKeys(sql),
      ]);

    const pendingExternalSources = seed.externalSources.filter((row) => !existingExternalSourceIds.has(row.id));
    const pendingExternalProducts = seed.externalProducts.filter((row) => !existingExternalProductIds.has(row.id));
    const pendingLinks = seed.cardPrintMarketLinks.filter((row) => !existingLinkIds.has(row.id));
    const pendingCurrentPrices = seed.cardPrintPriceCurrent.filter(
      (row) => !existingCurrentKeys.has(`${row.card_print_id}::${row.source_id}`),
    );
    const pendingSnapshots = seed.priceSnapshots.filter(
      (row) => !existingSnapshotKeys.has(`${row.external_product_id}::${new Date(row.captured_at).toISOString()}`),
    );

    console.log(
      JSON.stringify(
        {
          pendingExternalSources: pendingExternalSources.length,
          pendingExternalProducts: pendingExternalProducts.length,
          pendingLinks: pendingLinks.length,
          pendingCurrentPrices: pendingCurrentPrices.length,
          pendingSnapshots: pendingSnapshots.length,
        },
        null,
        2,
      ),
    );

    await upsertRows(sql, "external_sources", pendingExternalSources, ["id"], 10, "external_sources");
    await upsertRows(sql, "external_products", pendingExternalProducts, ["id"], 50, "external_products");
    await upsertRows(sql, "card_print_market_links", pendingLinks, ["id"], 50, "card_print_market_links");

    const clearAssignments = [...new Set(seed.activeCardPrintAssignments.map((row) => row.card_print_id))].map((card_print_id) => ({
      card_print_id,
      active_external_product_id: null,
    }));
    await applyActiveAssignments(sql, clearAssignments, 200, "card_prints.clear_active_external_product_id");

    const activeAssignments = seed.activeCardPrintAssignments.filter((row) => row.active_external_product_id != null);
    await applyActiveAssignments(sql, activeAssignments, 200, "card_prints.set_active_external_product_id");

    await upsertRows(
      sql,
      "card_print_price_current",
      pendingCurrentPrices,
      ["card_print_id", "source_id"],
      50,
      "card_print_price_current",
    );

    await insertSnapshots(sql, pendingSnapshots, 50, "price_snapshots");

    console.log("Manual JustTCG seed apply complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MAPPING_REPORT_PATH = path.join(ROOT, ".cache", "justtcg", "op13-repair-mapping-report.json");
const DEFAULT_PRICE_DATA_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/approved-price-sync-data.json";
const OFFICIAL_RELEASES_PATH = path.join(ROOT, "data", "bandai-en-official-releases.json");

function parseArgs(argv) {
  const args = {
    mappingReport: DEFAULT_MAPPING_REPORT_PATH,
    priceData: DEFAULT_PRICE_DATA_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mapping-report" && argv[index + 1]) {
      args.mappingReport = path.resolve(process.cwd(), argv[index + 1]);
      index += 1;
      continue;
    }
    if (value === "--price-data" && argv[index + 1]) {
      args.priceData = path.resolve(process.cwd(), argv[index + 1]);
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
  if (column === "raw_payload" || column === "metadata" || column === "price_history_payload") {
    return value == null ? null : JSON.stringify(value);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "")
    .replace(/\\n/g, "")
    .trim();
  if (!raw) throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  return raw;
}

async function upsertRow(sql, tableName, row, conflictColumns) {
  const columns = Object.keys(row);
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
  const params = columns.map((column) => normalizeParamValue(column, row[column]));
  const valuesSql = columns
    .map((column, index) => `$${index + 1}${["raw_payload", "metadata", "price_history_payload"].includes(column) ? "::jsonb" : ""}`)
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

async function buildSeed(args) {
  const [builder, mappingReport, priceData, officialReleases] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, "scripts", "import-justtcg-to-drizzle.mjs")).href),
    readJson(args.mappingReport),
    readJson(args.priceData),
    readJson(OFFICIAL_RELEASES_PATH),
  ]);

  return builder.buildSeed(
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
}

function collectTargetRows(seed) {
  const targetCardIds = [...new Set(seed.activeCardPrintAssignments.map((row) => row.card_print_id))];
  const targetProductIds = [
    ...new Set([
      ...seed.activeCardPrintAssignments.map((row) => row.active_external_product_id),
      ...seed.cardPrintPriceCurrent
        .filter((row) => targetCardIds.includes(row.card_print_id))
        .map((row) => row.external_product_id),
    ]),
  ];
  const targetVariantIds = [
    ...new Set([
      ...seed.activeCardPrintVariantAssignments.map((row) => row.active_external_variant_id),
      ...seed.cardPrintPriceCurrent
        .filter((row) => targetCardIds.includes(row.card_print_id))
        .map((row) => row.external_variant_id)
        .filter(Boolean),
    ]),
  ];

  return {
    source: seed.externalSources.find((row) => row.id === "justtcg") ?? null,
    products: seed.externalProducts.filter((row) => targetProductIds.includes(row.id)),
    variants: seed.externalProductVariants.filter((row) => targetVariantIds.includes(row.id)),
    links: seed.cardPrintMarketLinks.filter((row) => targetCardIds.includes(row.card_print_id)),
    currentPrices: seed.cardPrintPriceCurrent.filter((row) => targetCardIds.includes(row.card_print_id)),
    assignments: targetCardIds.map((cardPrintId) => ({
      cardPrintId,
      productId:
        seed.activeCardPrintAssignments.find((row) => row.card_print_id === cardPrintId)?.active_external_product_id ??
        null,
      variantId:
        seed.activeCardPrintVariantAssignments.find((row) => row.card_print_id === cardPrintId)
          ?.active_external_variant_id ?? null,
    })),
    rejectedCardIds: [],
    targetCardIds,
    targetProductIds,
    targetVariantIds,
  };
}

async function applyTargetedSeed(targetRows) {
  const sql = postgres(getConnectionString(), {
    max: 1,
    prepare: false,
  });

  try {
    await sql`set statement_timeout = 0`;
    await sql.begin(async (tx) => {
      if (targetRows.source) {
        await upsertRow(tx, "external_sources", targetRows.source, ["id"]);
      }

      for (const row of targetRows.products) {
        await upsertRow(tx, "external_products", row, ["id"]);
      }

      for (const row of targetRows.variants) {
        await upsertRow(tx, "external_product_variants", row, ["provider_variant_id"]);
      }

      for (const row of targetRows.links) {
        await upsertRow(tx, "card_print_market_links", row, ["id"]);
      }

      await tx`
        update card_prints
        set active_external_product_id = null,
            active_external_variant_id = null,
            updated_at = now()
        where id not in ${tx(targetRows.targetCardIds)}
          and (
            active_external_product_id in ${tx(targetRows.targetProductIds)}
            or active_external_variant_id in ${tx(targetRows.targetVariantIds)}
          )
      `;

      for (const row of targetRows.assignments) {
        await tx`
          update card_prints
          set active_external_product_id = ${row.productId},
              active_external_variant_id = ${row.variantId},
              updated_at = now()
          where id = ${row.cardPrintId}
        `;
      }

      for (const row of targetRows.currentPrices) {
        await upsertRow(tx, "card_print_price_current", row, ["card_print_id", "source_id"]);
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const seed = await buildSeed(args);
  const targetRows = collectTargetRows(seed);

  await applyTargetedSeed(targetRows);

  console.log(
    JSON.stringify(
      {
        targetCardIds: targetRows.targetCardIds.length,
        targetProductIds: targetRows.targetProductIds.length,
        targetVariantIds: targetRows.targetVariantIds.length,
        links: targetRows.links.length,
        currentPrices: targetRows.currentPrices.length,
      },
      null,
      2,
    ),
  );
}

const isDirectRun =
  process.env.NODE_ENV !== "test" &&
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

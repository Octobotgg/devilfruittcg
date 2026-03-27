import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getTableConfig } from "drizzle-orm/pg-core";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importSchema() {
  return import(pathToFileURL(path.join(REPO_ROOT, "db/schema.ts")).href);
}

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((index) => index.config.name);
}

function columnByName(table: Parameters<typeof getTableConfig>[0], name: string) {
  const column = getTableConfig(table).columns.find((entry) => entry.name === name);
  assert.ok(column, `expected column ${name}`);
  return column;
}

function foreignKeyByName(table: Parameters<typeof getTableConfig>[0], name: string) {
  const foreignKey = getTableConfig(table).foreignKeys.find((entry) => entry.getName() === name);
  assert.ok(foreignKey, `expected foreign key ${name}`);
  return foreignKey;
}

function assertColumns(table: Parameters<typeof getTableConfig>[0], expected: string[]) {
  const names = columnNames(table);
  for (const column of expected) {
    assert.ok(names.includes(column), `expected column ${column}`);
  }
}

function assertIndexes(table: Parameters<typeof getTableConfig>[0], expected: string[]) {
  const names = indexNames(table);
  for (const indexName of expected) {
    assert.ok(names.includes(indexName), `expected index ${indexName}`);
  }
}

test("pricing verifier schema includes published and verification tables", async () => {
  const schema = await importSchema();

  assert.ok(schema.pricingVerificationRuns, "pricing_verification_runs should exist");
  assert.ok(schema.pricingVerificationResults, "pricing_verification_results should exist");
  assert.ok(schema.pricingMappingConflicts, "pricing_mapping_conflicts should exist");
  assert.ok(schema.cardPrintPricePublished, "card_print_price_published should exist");
  assert.ok(schema.cardPrintDisplayPublished, "card_print_display_published should exist");

  assertColumns(schema.pricingVerificationRuns, ["status", "started_at", "finished_at", "source", "notes"]);
  assertColumns(schema.pricingVerificationResults, [
    "verification_run_id",
    "card_print_id",
    "external_product_id",
    "external_variant_id",
    "tcgplayer_product_id",
    "justtcg_price_nm",
    "tcgplayer_market_price",
    "published_price_nm_before",
    "price_delta_abs",
    "price_delta_ratio",
    "mapping_integrity_status",
    "label_integrity_status",
    "verification_status",
    "reason",
    "checked_at",
    "raw_tcgplayer_payload",
  ]);
  assertColumns(schema.pricingMappingConflicts, [
    "verification_run_id",
    "card_print_id",
    "external_product_id",
    "external_variant_id",
    "tcgplayer_product_id",
    "conflict_type",
    "expected_number",
    "expected_set_code",
    "expected_name",
    "provider_number",
    "provider_set_name",
    "provider_product_name",
    "details",
    "created_at",
  ]);
  assertColumns(schema.cardPrintPricePublished, [
    "card_print_id",
    "source_id",
    "external_product_id",
    "external_variant_id",
    "price_market",
    "price_nm",
    "price_lp",
    "updated_at",
    "published_at",
    "verification_status",
    "verification_run_id",
  ]);
  assertColumns(schema.cardPrintDisplayPublished, [
    "card_print_id",
    "external_product_id",
    "external_variant_id",
    "display_set_name",
    "display_set_code",
    "display_rarity",
    "display_title",
    "display_treatment_label",
    "display_image_url",
    "label_status",
    "verification_run_id",
    "published_at",
  ]);
  assert.equal(columnByName(schema.cardPrintPricePublished, "external_variant_id").notNull, true);
  assert.equal(columnByName(schema.cardPrintDisplayPublished, "external_variant_id").notNull, true);
  assert.deepEqual(columnByName(schema.pricingVerificationResults, "mapping_integrity_status").enumValues, [
    "verified",
    "warning",
    "mismatch",
    "blocked",
    "unknown",
  ]);
  assert.deepEqual(columnByName(schema.pricingVerificationResults, "label_integrity_status").enumValues, [
    "verified",
    "normalized",
    "fallback",
    "blocked",
    "unknown",
  ]);
  assert.deepEqual(columnByName(schema.cardPrintDisplayPublished, "label_status").enumValues, [
    "verified",
    "normalized",
    "fallback",
    "blocked",
    "unknown",
  ]);

  assert.equal(foreignKeyByName(schema.cardPrintPricePublished, "card_print_price_published_external_product_id_external_products_id_fk").onDelete, "no action");
  assert.equal(foreignKeyByName(schema.cardPrintPricePublished, "card_print_price_published_external_variant_id_external_product_variants_id_fk").onDelete, "no action");
  assert.equal(foreignKeyByName(schema.cardPrintDisplayPublished, "card_print_display_published_external_product_id_external_products_id_fk").onDelete, "no action");
  assert.equal(foreignKeyByName(schema.cardPrintDisplayPublished, "card_print_display_published_external_variant_id_external_product_variants_id_fk").onDelete, "no action");

  assertIndexes(schema.pricingVerificationResults, [
    "pricing_verification_results_card_print_idx",
    "pricing_verification_results_verification_run_idx",
  ]);
  assertIndexes(schema.pricingMappingConflicts, [
    "pricing_mapping_conflicts_card_print_idx",
    "pricing_mapping_conflicts_verification_run_idx",
  ]);
  assertIndexes(schema.cardPrintPricePublished, [
    "card_print_price_published_card_print_idx",
    "card_print_price_published_verification_run_idx",
  ]);
  assertIndexes(schema.cardPrintDisplayPublished, [
    "card_print_display_published_card_print_idx",
    "card_print_display_published_verification_run_idx",
  ]);

  const migrationSql = readFileSync(
    path.join(REPO_ROOT, "db/migrations/0004_flat_jack_murdock.sql"),
    "utf8",
  );
  assert.match(
    migrationSql,
    /CREATE TYPE "public"\."pricing_mapping_integrity_status" AS ENUM\('verified', 'warning', 'mismatch', 'blocked', 'unknown'\);/,
  );
  assert.match(
    migrationSql,
    /CREATE TYPE "public"\."pricing_label_status" AS ENUM\('verified', 'normalized', 'fallback', 'blocked', 'unknown'\);/,
  );
  assert.match(
    migrationSql,
    /FOREIGN KEY \("external_product_id"\) REFERENCES "public"\."external_products"\("id"\) ON DELETE no action ON UPDATE no action;/,
  );
  assert.match(
    migrationSql,
    /FOREIGN KEY \("external_variant_id"\) REFERENCES "public"\."external_product_variants"\("id"\) ON DELETE no action ON UPDATE no action;/,
  );
  assert.doesNotMatch(migrationSql, /ALTER TABLE "card_print_display_published" ALTER COLUMN "external_variant_id" SET NOT NULL;/);
  assert.doesNotMatch(migrationSql, /ALTER TABLE "card_print_price_published" ALTER COLUMN "external_variant_id" SET NOT NULL;/);
});

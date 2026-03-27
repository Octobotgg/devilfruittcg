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

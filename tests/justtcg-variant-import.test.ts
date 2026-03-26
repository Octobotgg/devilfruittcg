import assert from "node:assert/strict";
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

test("JustTCG variant schema includes the new variant layer", () => {
  return importSchema().then((schema) => {
    assert.ok(schema.externalProductVariants, "external_product_variants should exist");

    assert.ok(columnNames(schema.externalProductVariants).includes("source_id"), "source_id should exist");
    assert.ok(columnNames(schema.externalProductVariants).includes("provider_variant_id"), "provider_variant_id should exist");
    assert.ok(columnNames(schema.externalProductVariants).includes("last_updated_at"), "last_updated_at should exist");

    assert.ok(
      indexNames(schema.externalProductVariants).includes("external_product_variants_provider_variant_id_unique"),
      "provider_variant_id should be unique",
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
  });
});

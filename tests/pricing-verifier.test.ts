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

async function importPricingVerifier() {
  return import(pathToFileURL(path.join(REPO_ROOT, "lib/server/pricing/pricing-verifier.ts")).href);
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

  const migrationDir = path.join(REPO_ROOT, "db/migrations");
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const hardeningMigration = migrationFiles.find((file) => file.startsWith("0005_"));
  assert.ok(hardeningMigration, "expected append-only follow-up migration 0005_*");

  const baseMigrationSql = readFileSync(path.join(migrationDir, "0004_flat_jack_murdock.sql"), "utf8");
  const hardeningMigrationSql = readFileSync(path.join(migrationDir, hardeningMigration), "utf8");
  const journal = JSON.parse(readFileSync(path.join(migrationDir, "meta/_journal.json"), "utf8")) as {
    entries: Array<{ tag: string }>;
  };
  assert.ok(journal.entries.some((entry) => entry.tag === hardeningMigration.replace(".sql", "")));

  assert.match(baseMigrationSql, /"card_print_display_published_external_product_id_external_products_id_fk".*ON DELETE cascade/);
  assert.match(baseMigrationSql, /"card_print_display_published_external_variant_id_external_product_variants_id_fk".*ON DELETE set null/);
  assert.match(baseMigrationSql, /"card_print_price_published_external_product_id_external_products_id_fk".*ON DELETE cascade/);
  assert.match(baseMigrationSql, /"card_print_price_published_external_variant_id_external_product_variants_id_fk".*ON DELETE set null/);
  assert.match(baseMigrationSql, /"external_variant_id" text,/);
  assert.match(baseMigrationSql, /"label_status" text NOT NULL/);
  assert.match(baseMigrationSql, /"mapping_integrity_status" text NOT NULL/);
  assert.doesNotMatch(baseMigrationSql, /pricing_label_status/);
  assert.doesNotMatch(baseMigrationSql, /pricing_mapping_integrity_status/);

  assert.match(hardeningMigrationSql, /CREATE TYPE "public"\."pricing_label_status" AS ENUM/);
  assert.match(hardeningMigrationSql, /CREATE TYPE "public"\."pricing_mapping_integrity_status" AS ENUM/);
  assert.match(hardeningMigrationSql, /DO \$\$/);
  assert.match(
    hardeningMigrationSql,
    /UPDATE "pricing_verification_results"\s+SET "mapping_integrity_status" = CASE\s+WHEN lower\(btrim\("mapping_integrity_status"\)\) IN \('verified', 'warning', 'mismatch', 'blocked', 'unknown'\) THEN lower\(btrim\("mapping_integrity_status"\)\)\s+ELSE 'unknown'\s+END;/,
  );
  assert.match(
    hardeningMigrationSql,
    /UPDATE "pricing_verification_results"\s+SET "label_integrity_status" = CASE\s+WHEN lower\(btrim\("label_integrity_status"\)\) IN \('verified', 'normalized', 'fallback', 'blocked', 'unknown'\) THEN lower\(btrim\("label_integrity_status"\)\)\s+ELSE 'unknown'\s+END;/,
  );
  assert.match(
    hardeningMigrationSql,
    /UPDATE "card_print_display_published"\s+SET "label_status" = CASE\s+WHEN lower\(btrim\("label_status"\)\) IN \('verified', 'normalized', 'fallback', 'blocked', 'unknown'\) THEN lower\(btrim\("label_status"\)\)\s+ELSE 'unknown'\s+END;/,
  );
  assert.match(
    hardeningMigrationSql,
    /card_print_display_published_external_product_id_external_products_id_fk.*ON DELETE no action/,
  );
  assert.match(
    hardeningMigrationSql,
    /card_print_display_published_external_variant_id_external_product_variants_id_fk.*ON DELETE no action/,
  );
  assert.match(
    hardeningMigrationSql,
    /card_print_price_published_external_product_id_external_products_id_fk.*ON DELETE no action/,
  );
  assert.match(
    hardeningMigrationSql,
    /card_print_price_published_external_variant_id_external_product_variants_id_fk.*ON DELETE no action/,
  );
  assert.match(hardeningMigrationSql, /ALTER TABLE "card_print_display_published" ALTER COLUMN "external_variant_id" SET NOT NULL;/);
  assert.match(hardeningMigrationSql, /ALTER TABLE "card_print_price_published" ALTER COLUMN "external_variant_id" SET NOT NULL;/);
  assert.doesNotMatch(hardeningMigrationSql, /CREATE TABLE "card_print_price_published"/);
  assert.doesNotMatch(hardeningMigrationSql, /CREATE TABLE "card_print_display_published"/);
});

function createMappingInput(overrides?: {
  cardPrint?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  duplicateVariantCardPrintIds?: string[];
  duplicateProductCardPrintIds?: string[];
  publishedDisplay?: Record<string, unknown> | null;
}) {
  return {
    cardPrint: {
      id: "print-1",
      number: "OP01-001",
      setCode: "OP01",
      setName: "Romance Dawn [OP01]",
      originSet: null,
      releaseCode: "OP01",
      title: "Monkey D. Luffy",
      rarity: "SR",
      treatmentLabel: null,
      imageUrl: "https://example.com/luffy.jpg",
      ...overrides?.cardPrint,
    },
    provider: {
      externalProductId: "product-1",
      externalVariantId: "variant-1",
      tcgplayerProductId: "123",
      productName: "Monkey D. Luffy OP01-001",
      productUrlName: "monkey-d-luffy-op01-001",
      setName: "Romance Dawn",
      number: "OP01-001",
      treatment: null,
      imageUrl: "https://example.com/provider-luffy.jpg",
      ...overrides?.provider,
    },
    duplicateVariantCardPrintIds: overrides?.duplicateVariantCardPrintIds || [],
    duplicateProductCardPrintIds: overrides?.duplicateProductCardPrintIds || [],
    publishedDisplay: overrides?.publishedDisplay,
  };
}

test("verifyMappingIntegrity marks exact number, set, and title matches as verified", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(createMappingInput());

  assert.equal(result.mappingIntegrityStatus, "verified");
  assert.equal(result.verificationStatus, "verified");
  assert.deepEqual(result.conflictTypes, []);
  assert.equal(result.primaryConflictType, null);
  assert.equal(result.labelIntegrityStatus, "verified");
  assert.equal(result.normalizedProviderTreatmentLabel, null);
  assert.equal(result.publishable, true);
});

test("verifyMappingIntegrity accepts same-family provider set aliases and containment matches", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        number: "PRB02-001",
        setCode: "PRB02",
        setName: "Premium Booster The Best [PRB02]",
        originSet: "Premium Booster The Best Vol. 2",
        releaseCode: "PRB02",
      },
      provider: {
        number: "PRB02-001",
        setName: "One Piece Card The Best Vol 2",
        productName: "Monkey D. Luffy PRB02-001",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "verified");
  assert.equal(result.verificationStatus, "verified");
  assert.deepEqual(result.conflictTypes, []);
  assert.equal(result.publishable, true);
});

test("verifyMappingIntegrity does not treat short promo-like codes as set family matches on unrelated names", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        number: "P-001",
        setCode: "P",
        setName: "Promo [P]",
        originSet: null,
        releaseCode: "P",
      },
      provider: {
        number: "P-001",
        setName: "Paramount War",
        productName: "Monkey D. Luffy P-001",
        productUrlName: "monkey-d-luffy-p-001",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "set_mismatch");
  assert.deepEqual(result.conflictTypes, ["set_mismatch"]);
  assert.equal(result.publishable, false);
});

test("verifyMappingIntegrity captures number mismatches explicitly", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      provider: {
        number: "OP01-999",
        productName: "Monkey D. Luffy OP01-999",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "number_mismatch");
  assert.deepEqual(result.conflictTypes, ["number_mismatch"]);
  assert.equal(result.publishable, false);
});

test("verifyMappingIntegrity captures set mismatches explicitly", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      provider: {
        setName: "Paramount War",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "set_mismatch");
  assert.deepEqual(result.conflictTypes, ["set_mismatch"]);
});

test("verifyMappingIntegrity captures premium treatment mismatches explicitly", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        treatmentLabel: "Jolly Roger Foil",
      },
      provider: {
        productName: "Monkey D. Luffy Parallel OP01-001",
        productUrlName: "monkey-d-luffy-parallel-op01-001",
        treatment: "Parallel",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "treatment_mismatch");
  assert.deepEqual(result.conflictTypes, ["treatment_mismatch"]);
});

test("verifyMappingIntegrity accepts explicit supported generic treatment matches", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        treatmentLabel: "Parallel",
      },
      provider: {
        productName: "Monkey D. Luffy Parallel OP01-001",
        productUrlName: "monkey-d-luffy-parallel-op01-001",
        treatment: "Parallel",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "verified");
  assert.equal(result.verificationStatus, "verified");
  assert.deepEqual(result.conflictTypes, []);
  assert.equal(result.publishable, true);
});

test("verifyMappingIntegrity blocks mismatches for trusted event and SP treatment labels", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        treatmentLabel: "Winner Pack",
      },
      provider: {
        productName: "Monkey D. Luffy Event Pack OP01-001",
        productUrlName: "monkey-d-luffy-event-pack-op01-001",
        treatment: "EVENT_PACK",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "treatment_mismatch");
  assert.deepEqual(result.conflictTypes, ["treatment_mismatch"]);
});

test("verifyMappingIntegrity trusts strong multiword treatment phrases from provider product names", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        treatmentLabel: "Winner Pack",
      },
      provider: {
        productName: "Monkey D. Luffy Winner Pack PRB01-001",
        productUrlName: "monkey-d-luffy-winner-pack-prb01-001",
        treatment: null,
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "verified");
  assert.equal(result.verificationStatus, "verified");
  assert.equal(result.labelIntegrityStatus, "normalized");
  assert.equal(result.normalizedProviderTreatmentLabel, "Winner Pack");
  assert.equal(result.exactTreatmentTrusted, true);
  assert.deepEqual(result.conflictTypes, []);
  assert.equal(result.publishable, true);
});

test("verifyMappingIntegrity ignores incidental premium keywords in freeform product titles", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        title: "Champion",
      },
      provider: {
        productName: "Champion OP01-001",
        productUrlName: "champion-op01-001",
        treatment: null,
      },
      publishedDisplay: {
        displayTreatmentLabel: "Champion",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "verified");
  assert.equal(result.verificationStatus, "verified");
  assert.equal(result.labelIntegrityStatus, "verified");
  assert.equal(result.normalizedProviderTreatmentLabel, null);
  assert.equal(result.exactTreatmentTrusted, false);
  assert.deepEqual(result.conflictTypes, []);
  assert.equal(result.publishable, true);
});

test("verifyMappingIntegrity captures duplicate variant assignments explicitly", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      duplicateVariantCardPrintIds: ["print-1", "print-2"],
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.primaryConflictType, "duplicate_variant_assignment");
  assert.deepEqual(result.conflictTypes, ["duplicate_variant_assignment"]);
});

test("verifyMappingIntegrity captures duplicate product assignments and ui label mismatches explicitly", async () => {
  const { verifyMappingIntegrity } = await importPricingVerifier();

  const result = verifyMappingIntegrity(
    createMappingInput({
      cardPrint: {
        treatmentLabel: "Jolly Roger Foil",
      },
      provider: {
        productName: "Monkey D. Luffy (JOLLY_RODGER_FOIL)",
      },
      duplicateProductCardPrintIds: ["print-1", "print-9"],
      publishedDisplay: {
        displayTreatmentLabel: "Pirate Foil",
      },
    }),
  );

  assert.equal(result.mappingIntegrityStatus, "blocked");
  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.deepEqual(result.conflictTypes, ["duplicate_product_assignment", "ui_label_mismatch"]);
});

test("buildPublishedDisplayPayload hides vague fallback treatments when no exact provider treatment is trustworthy", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "Romance Dawn [OP01]",
      setCode: "OP01",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Monkey D. Luffy Parallel OP01-001",
      setName: "ROMANCE_DAWN",
      treatment: "Parallel",
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displayTreatmentLabel, null);
  assert.equal(result.labelStatus, "fallback");
});

test("buildPublishedDisplayPayload normalizes provider treatment slugs for published labels", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "Romance Dawn [OP01]",
      setCode: "OP01",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Monkey D. Luffy (JOLLY_RODGER_FOIL)",
      setName: "ROMANCE_DAWN",
      treatment: "JOLLY_RODGER_FOIL",
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displayTreatmentLabel, "Jolly Roger Foil");
  assert.equal(result.labelStatus, "normalized");
});

test("buildPublishedDisplayPayload normalizes trusted event and SP premium labels for published display", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const cases = [
    { treatment: "CHAMPION", expected: "Champion" },
    { treatment: "FINALIST", expected: "Finalist" },
    { treatment: "PARTICIPATION_PACK", expected: "Participation Pack" },
    { treatment: "WINNER_PACK", expected: "Winner Pack" },
    { treatment: "EVENT_PACK", expected: "Event Pack" },
    { treatment: "TOURNAMENT_PACK", expected: "Tournament Pack" },
    { treatment: "SP_GOLD", expected: "SP (Gold)" },
    { treatment: "SP_SILVER", expected: "SP (Silver)" },
  ];

  for (const testCase of cases) {
    const result = buildPublishedDisplayPayload({
      cardPrint: {
        title: "Monkey D. Luffy",
        setName: "Premium Booster The Best [PRB01]",
        setCode: "PRB01",
        rarity: "SR",
        imageUrl: "https://example.com/luffy.jpg",
      },
      provider: {
        productName: `Monkey D. Luffy (${testCase.treatment})`,
        setName: "PREMIUM_BOOSTER_THE_BEST",
        treatment: testCase.treatment,
        imageUrl: "https://example.com/provider-luffy.jpg",
      },
    });

    assert.equal(result.displayTreatmentLabel, testCase.expected, testCase.treatment);
    assert.equal(result.labelStatus, "normalized", testCase.treatment);
  }
});

test("buildPublishedDisplayPayload publishes strong multiword treatment phrases from provider product names", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "Premium Booster The Best [PRB01]",
      setCode: "PRB01",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Monkey D. Luffy Winner Pack PRB01-001",
      productUrlName: "monkey-d-luffy-winner-pack-prb01-001",
      setName: "PREMIUM_BOOSTER_THE_BEST",
      treatment: null,
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displayTreatmentLabel, "Winner Pack");
  assert.equal(result.labelStatus, "normalized");
});

test("buildPublishedDisplayPayload ignores incidental premium keywords in freeform product titles", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "Romance Dawn [OP01]",
      setCode: "OP01",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Champion OP01-001",
      productUrlName: "champion-op01-001",
      setName: "ROMANCE_DAWN",
      treatment: null,
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displayTreatmentLabel, null);
  assert.equal(result.labelStatus, "verified");
});

test("buildPublishedDisplayPayload preserves canonical casing for hyphenated set code prefixes", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "OP-01 ROMANCE DAWN",
      setCode: "OP-01",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Monkey D. Luffy OP-01",
      setName: "OP-01 ROMANCE DAWN",
      treatment: null,
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displaySetName, "OP-01 Romance Dawn");
});

test("buildPublishedDisplayPayload preserves canonical casing for mixed alphanumeric set tokens", async () => {
  const { buildPublishedDisplayPayload } = await importPricingVerifier();

  const result = buildPublishedDisplayPayload({
    cardPrint: {
      title: "Monkey D. Luffy",
      setName: "ST-14 3D2Y",
      setCode: "ST-14",
      rarity: "SR",
      imageUrl: "https://example.com/luffy.jpg",
    },
    provider: {
      productName: "Monkey D. Luffy ST-14",
      setName: "ST-14 3D2Y",
      treatment: null,
      imageUrl: "https://example.com/provider-luffy.jpg",
    },
  });

  assert.equal(result.displaySetName, "ST-14 3D2Y");
});

test("verifyPriceDrift uses stricter thresholds for premium cards than non-premium cards", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const premium = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: true,
    justtcgPriceNm: 10.1,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });
  const nonPremium = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10.1,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(premium.verificationStatus, "mismatch");
  assert.equal(premium.publishable, false);
  assert.equal(nonPremium.verificationStatus, "drift_warning");
  assert.equal(nonPremium.publishable, true);
});

test("verifyPriceDrift treats exact and near-exact deltas as verified", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const absoluteTolerance = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10.05,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });
  const ratioTolerance = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: true,
    justtcgPriceNm: 100.5,
    tcgplayerMarketPrice: 100,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(absoluteTolerance.verificationStatus, "verified");
  assert.equal(absoluteTolerance.publishable, true);
  assert.equal(ratioTolerance.verificationStatus, "verified");
  assert.equal(ratioTolerance.publishable, true);
});

test("verifyPriceDrift does not verify values just above the absolute tolerance after rounding", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 1.051,
    tcgplayerMarketPrice: 1,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "mismatch");
  assert.equal(result.publishable, false);
});

test("verifyPriceDrift publishes low-volatility non-premium rows with drift warnings", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10.2,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "drift_warning");
  assert.equal(result.publishable, true);
});

test("verifyPriceDrift blocks non-premium mismatch rows in the >2% and <=5% band", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10.25,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "mismatch");
  assert.equal(result.publishable, false);
});

test("verifyPriceDrift blocks premium rows once ratio delta exceeds 2%", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: true,
    justtcgPriceNm: 10.3,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "mismatch");
  assert.equal(result.publishable, false);
});

test("verifyPriceDrift blocks non-premium rows once ratio delta exceeds 5%", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10.6,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "mismatch");
  assert.equal(result.publishable, false);
});

test("verifyPriceDrift blocks mapping conflicts before evaluating price drift", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "blocked",
    isPremium: false,
    justtcgPriceNm: 10,
    tcgplayerMarketPrice: 9,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "mapping_conflict");
  assert.equal(result.publishable, false);
  assert.equal(result.priceDeltaAbs, null);
  assert.equal(result.priceDeltaRatio, null);
});

test("verifyPriceDrift persists stale provider, missing id, and unpriced statuses explicitly", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const staleProvider = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-20T12:00:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });
  const missingTcgplayerId = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: null,
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });
  const unpricedNoVariant = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: null,
    tcgplayerMarketPrice: 10,
    externalVariantId: null,
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-27T11:30:00.000Z",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(staleProvider.verificationStatus, "stale_provider");
  assert.equal(missingTcgplayerId.verificationStatus, "missing_tcgplayer_id");
  assert.equal(unpricedNoVariant.verificationStatus, "unpriced_no_variant");
});

test("verifyPriceDrift blocks malformed providerUpdatedAt values as unknown provider freshness", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "not-a-timestamp",
    checkedAt: "2026-03-27T12:00:00.000Z",
  });

  assert.equal(result.verificationStatus, "stale_provider");
  assert.equal(result.publishable, false);
  assert.equal(result.priceDeltaAbs, null);
  assert.equal(result.priceDeltaRatio, null);
  assert.equal(result.reason, "invalid_provider_updated_at");
});

test("verifyPriceDrift blocks malformed checkedAt values as unknown provider freshness", async () => {
  const { verifyPriceDrift } = await importPricingVerifier();

  const result = verifyPriceDrift({
    mappingIntegrityStatus: "verified",
    isPremium: false,
    justtcgPriceNm: 10,
    tcgplayerMarketPrice: 10,
    externalVariantId: "variant-1",
    tcgplayerProductId: "123",
    providerUpdatedAt: "2026-03-20T12:00:00.000Z",
    checkedAt: "not-a-timestamp",
  });

  assert.equal(result.verificationStatus, "stale_provider");
  assert.equal(result.publishable, false);
  assert.equal(result.priceDeltaAbs, null);
  assert.equal(result.priceDeltaRatio, null);
  assert.equal(result.reason, "invalid_checked_at");
});

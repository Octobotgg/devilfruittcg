import {
  bigserial,
  bigint,
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const releaseTypeEnum = pgEnum("release_type", [
  "booster",
  "starter_deck",
  "premium_booster",
  "promo",
  "event",
  "pre_release",
  "demo_deck",
  "anniversary",
  "other",
]);

export const variantTypeEnum = pgEnum("variant_type", [
  "base",
  "parallel",
  "alternate_art",
  "full_art",
  "jolly_roger_foil",
  "textured_foil",
  "reprint",
  "pre_release",
  "treasure_cup",
  "box_topper",
  "promo",
  "sp",
  "manga",
  "anniversary",
  "other",
]);

export const mappingStatusEnum = pgEnum("mapping_status", [
  "exact",
  "probable",
  "manual_review",
  "rejected",
]);

export const externalProductKindEnum = pgEnum("external_product_kind", [
  "raw_card",
  "sealed",
  "graded",
  "other",
]);

export const importRunStatusEnum = pgEnum("import_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const issueSeverityEnum = pgEnum("issue_severity", [
  "info",
  "warning",
  "error",
  "critical",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "open",
  "in_progress",
  "resolved",
  "rejected",
]);

export const pricingVerificationRunStatusEnum = pgEnum("pricing_verification_run_status", [
  "running",
  "completed",
  "failed",
]);

export const pricingVerificationStatusEnum = pgEnum("pricing_verification_status", [
  "verified",
  "drift_warning",
  "mismatch",
  "stale_provider",
  "missing_tcgplayer_id",
  "unpriced_no_variant",
  "mapping_conflict",
]);

export const pricingMappingConflictTypeEnum = pgEnum("pricing_mapping_conflict_type", [
  "number_mismatch",
  "set_mismatch",
  "name_mismatch",
  "treatment_mismatch",
  "duplicate_variant_assignment",
  "duplicate_product_assignment",
  "ui_label_mismatch",
]);

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => ({
    slugUnique: uniqueIndex("games_slug_unique").on(table.slug),
  }),
);

export const releases = pgTable(
  "releases",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    releaseType: releaseTypeEnum("release_type").notNull(),
    releaseDate: date("release_date"),
    language: text("language").notNull().default("EN"),
    officialUrl: text("official_url"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    gameCodeLangUnique: uniqueIndex("releases_game_code_language_unique").on(table.gameId, table.code, table.language),
    releaseTypeIdx: index("releases_release_type_idx").on(table.releaseType),
    releaseDateIdx: index("releases_release_date_idx").on(table.releaseDate),
  }),
);

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    baseCardCode: text("base_card_code").notNull(),
    name: text("name").notNull(),
    setCode: text("set_code").notNull(),
    number: text("number").notNull(),
    cardType: text("card_type").notNull(),
    color: text("color").notNull(),
    rarity: text("rarity").notNull(),
    cost: integer("cost"),
    life: integer("life"),
    power: integer("power"),
    counter: integer("counter"),
    attribute: text("attribute"),
    traits: text("traits"),
    effectText: text("effect_text"),
    triggerText: text("trigger_text"),
    blockIcon: text("block_icon"),
    searchText: text("search_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    gameBaseCodeUnique: uniqueIndex("cards_game_base_card_code_unique").on(table.gameId, table.baseCardCode),
    gameSetNumberNameUnique: uniqueIndex("cards_game_set_code_number_name_unique").on(
      table.gameId,
      table.setCode,
      table.number,
      table.name,
    ),
    setCodeNumberIdx: index("cards_set_code_number_idx").on(table.setCode, table.number),
    nameIdx: index("cards_name_idx").on(table.name),
  }),
);

export const externalSources = pgTable(
  "external_sources",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    baseUrl: text("base_url"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    codeUnique: uniqueIndex("external_sources_code_unique").on(table.code),
  }),
);

export const externalProducts = pgTable(
  "external_products",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id").notNull(),
    productKind: externalProductKindEnum("product_kind").notNull(),
    name: text("name").notNull(),
    setName: text("set_name"),
    number: text("number"),
    rarity: text("rarity"),
    language: text("language"),
    conditionModel: text("condition_model"),
    printing: text("printing"),
    imageUrl: text("image_url"),
    productUrl: text("product_url"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    sourceExternalProductUnique: uniqueIndex("external_products_source_external_product_unique").on(
      table.sourceId,
      table.externalProductId,
    ),
    idSourceUnique: uniqueIndex("external_products_id_source_id_unique").on(table.id, table.sourceId),
    productKindIdx: index("external_products_product_kind_idx").on(table.productKind),
    numberIdx: index("external_products_number_idx").on(table.number),
    nameIdx: index("external_products_name_idx").on(table.name),
  }),
);

export const externalProductVariants = pgTable(
  "external_product_variants",
  {
    id: text("id").primaryKey(),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    providerVariantId: text("provider_variant_id").notNull(),
    condition: text("condition").notNull(),
    printing: text("printing").notNull(),
    language: text("language").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull(),
    priceHistoryPayload: jsonb("price_history_payload").$type<Record<string, unknown>>(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    productSourceFk: foreignKey({
      name: "external_product_variants_product_source_fk",
      columns: [table.externalProductId, table.sourceId],
      foreignColumns: [externalProducts.id, externalProducts.sourceId],
    }).onDelete("cascade"),
    providerVariantIdUnique: uniqueIndex("external_product_variants_provider_variant_id_unique").on(
      table.providerVariantId,
    ),
    externalProductIdIdUnique: uniqueIndex("external_product_variants_external_product_id_id_unique").on(
      table.externalProductId,
      table.id,
    ),
    productSourceIdUnique: uniqueIndex("external_product_variants_product_source_id_unique").on(
      table.externalProductId,
      table.sourceId,
      table.id,
    ),
    externalProductIdx: index("external_product_variants_external_product_id_idx").on(table.externalProductId),
    conditionPrintingIdx: index("external_product_variants_condition_printing_idx").on(table.condition, table.printing),
    lastUpdatedAtIdx: index("external_product_variants_last_updated_at_idx").on(table.lastUpdatedAt),
  }),
);

export const cardPrints = pgTable(
  "card_prints",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    releaseId: text("release_id")
      .notNull()
      .references(() => releases.id, { onDelete: "restrict" }),
    activeExternalProductId: text("active_external_product_id").references(() => externalProducts.id, {
      onDelete: "set null",
    }),
    activeExternalVariantId: text("active_external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    printCode: text("print_code"),
    printedCardCode: text("printed_card_code").notNull(),
    variantFamily: text("variant_family").notNull(),
    variantType: variantTypeEnum("variant_type").notNull(),
    variantLabel: text("variant_label").notNull(),
    variantSlug: text("variant_slug").notNull(),
    isReprint: boolean("is_reprint").notNull().default(false),
    isPreRelease: boolean("is_pre_release").notNull().default(false),
    isAltArt: boolean("is_alt_art").notNull().default(false),
    isSpecialPrint: boolean("is_special_print").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url"),
    releaseDateOverride: date("release_date_override"),
    officialSourceId: text("official_source_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => ({
    activeExternalProductVariantFk: foreignKey({
      name: "card_prints_active_external_product_variant_fk",
      columns: [table.activeExternalProductId, table.activeExternalVariantId],
      foreignColumns: [externalProductVariants.externalProductId, externalProductVariants.id],
    }).onDelete("set null"),
    printedCardCodeUnique: uniqueIndex("card_prints_printed_card_code_unique").on(table.printedCardCode),
    cardVariantSlugUnique: uniqueIndex("card_prints_card_variant_slug_unique").on(table.cardId, table.variantSlug),
    releaseIdx: index("card_prints_release_idx").on(table.releaseId),
    cardIdx: index("card_prints_card_idx").on(table.cardId),
    activeExternalProductUnique: uniqueIndex("card_prints_active_external_product_unique")
      .on(table.activeExternalProductId)
      .where(sql`${table.activeExternalProductId} is not null`),
    activeExternalVariantUnique: uniqueIndex("card_prints_active_external_variant_unique")
      .on(table.activeExternalVariantId)
      .where(sql`${table.activeExternalVariantId} is not null`),
    variantTypeIdx: index("card_prints_variant_type_idx").on(table.variantType),
  }),
);

export const sealedProducts = pgTable(
  "sealed_products",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    releaseId: text("release_id").references(() => releases.id, { onDelete: "set null" }),
    activeExternalProductId: text("active_external_product_id").references(() => externalProducts.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    productType: text("product_type").notNull(),
    sku: text("sku"),
    language: text("language").notNull().default("EN"),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    gameSlugUnique: uniqueIndex("sealed_products_game_slug_unique").on(table.gameId, table.slug),
    skuUnique: uniqueIndex("sealed_products_sku_unique").on(table.sku),
    releaseIdx: index("sealed_products_release_idx").on(table.releaseId),
    activeExternalProductUnique: uniqueIndex("sealed_products_active_external_product_unique")
      .on(table.activeExternalProductId)
      .where(sql`${table.activeExternalProductId} is not null`),
    productTypeIdx: index("sealed_products_product_type_idx").on(table.productType),
    nameIdx: index("sealed_products_name_idx").on(table.name),
  }),
);

export const cardPrintMarketLinks = pgTable(
  "card_print_market_links",
  {
    id: text("id").primaryKey(),
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    mappingStatus: mappingStatusEnum("mapping_status").notNull(),
    confidence: text("confidence"),
    matchMethod: text("match_method"),
    reviewNotes: text("review_notes"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    cardPrintExternalProductUnique: uniqueIndex("card_print_market_links_card_print_external_product_unique").on(
      table.cardPrintId,
      table.externalProductId,
    ),
    cardPrintIdx: index("card_print_market_links_card_print_idx").on(table.cardPrintId),
    externalProductIdx: index("card_print_market_links_external_product_idx").on(table.externalProductId),
    statusIdx: index("card_print_market_links_status_idx").on(table.mappingStatus),
  }),
);

export const sealedProductMarketLinks = pgTable(
  "sealed_product_market_links",
  {
    id: text("id").primaryKey(),
    sealedProductId: text("sealed_product_id")
      .notNull()
      .references(() => sealedProducts.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    mappingStatus: mappingStatusEnum("mapping_status").notNull(),
    confidence: text("confidence"),
    matchMethod: text("match_method"),
    reviewNotes: text("review_notes"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    sealedProductExternalProductUnique: uniqueIndex(
      "sealed_product_market_links_sealed_product_external_product_unique",
    ).on(table.sealedProductId, table.externalProductId),
    sealedProductIdx: index("sealed_product_market_links_sealed_product_idx").on(table.sealedProductId),
    externalProductIdx: index("sealed_product_market_links_external_product_idx").on(table.externalProductId),
    statusIdx: index("sealed_product_market_links_status_idx").on(table.mappingStatus),
  }),
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
    priceLow: numeric("price_low", { precision: 12, scale: 2 }),
    priceMid: numeric("price_mid", { precision: 12, scale: 2 }),
    priceHigh: numeric("price_high", { precision: 12, scale: 2 }),
    priceNm: numeric("price_nm", { precision: 12, scale: 2 }),
    priceLp: numeric("price_lp", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    availability: integer("availability"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productVariantFk: foreignKey({
      name: "price_snapshots_product_variant_fk",
      columns: [table.externalProductId, table.externalVariantId],
      foreignColumns: [externalProductVariants.externalProductId, externalProductVariants.id],
    }).onDelete("no action"),
    externalProductCapturedAtIdx: index("price_snapshots_external_product_captured_at_idx").on(
      table.externalProductId,
      table.capturedAt,
    ),
  }),
);

export const cardPrintPriceCurrent = pgTable(
  "card_print_price_current",
  {
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
    priceNm: numeric("price_nm", { precision: 12, scale: 2 }),
    priceLp: numeric("price_lp", { precision: 12, scale: 2 }),
    priceChange24h: numeric("price_change_24h", { precision: 8, scale: 2 }),
    priceChange7d: numeric("price_change_7d", { precision: 8, scale: 2 }),
    priceChange30d: numeric("price_change_30d", { precision: 8, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  },
  (table) => ({
    productSourceVariantFk: foreignKey({
      name: "card_print_price_current_product_source_variant_fk",
      columns: [table.externalProductId, table.sourceId, table.externalVariantId],
      foreignColumns: [
        externalProductVariants.externalProductId,
        externalProductVariants.sourceId,
        externalProductVariants.id,
      ],
    }).onDelete("no action"),
    pk: primaryKey({ columns: [table.cardPrintId, table.sourceId] }),
    cardPrintIdx: index("card_print_price_current_card_print_idx").on(table.cardPrintId),
    sourceUpdatedIdx: index("card_print_price_current_source_updated_idx").on(table.sourceId, table.updatedAt),
  }),
);

export const cardPrintPriceHistory = pgTable(
  "card_print_price_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .references(() => externalProducts.id, { onDelete: "set null" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    priceNm: numeric("price_nm", { precision: 12, scale: 2 }),
    priceLp: numeric("price_lp", { precision: 12, scale: 2 }),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
  },
  (table) => ({
    productSourceVariantFk: foreignKey({
      name: "card_print_price_history_product_source_variant_fk",
      columns: [table.externalProductId, table.sourceId, table.externalVariantId],
      foreignColumns: [
        externalProductVariants.externalProductId,
        externalProductVariants.sourceId,
        externalProductVariants.id,
      ],
    }).onDelete("no action"),
    printRecordedAtIdx: index("card_print_price_history_print_recorded_at_idx").on(table.cardPrintId, table.recordedAt),
  }),
);

export const pricingVerificationRuns = pgTable(
  "pricing_verification_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: pricingVerificationRunStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    source: text("source").notNull(),
    notes: text("notes"),
  },
  (table) => ({
    sourceIdx: index("pricing_verification_runs_source_idx").on(table.source),
    startedAtIdx: index("pricing_verification_runs_started_at_idx").on(table.startedAt),
  }),
);

export const pricingVerificationResults = pgTable(
  "pricing_verification_results",
  {
    verificationRunId: bigint("verification_run_id", { mode: "number" })
      .notNull()
      .references(() => pricingVerificationRuns.id, { onDelete: "cascade" }),
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id").references(() => externalProducts.id, { onDelete: "set null" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    tcgplayerProductId: text("tcgplayer_product_id"),
    justtcgPriceNm: numeric("justtcg_price_nm", { precision: 12, scale: 2 }),
    tcgplayerMarketPrice: numeric("tcgplayer_market_price", { precision: 12, scale: 2 }),
    publishedPriceNmBefore: numeric("published_price_nm_before", { precision: 12, scale: 2 }),
    priceDeltaAbs: numeric("price_delta_abs", { precision: 12, scale: 2 }),
    priceDeltaRatio: numeric("price_delta_ratio", { precision: 10, scale: 6 }),
    mappingIntegrityStatus: text("mapping_integrity_status").notNull(),
    labelIntegrityStatus: text("label_integrity_status").notNull(),
    verificationStatus: pricingVerificationStatusEnum("verification_status").notNull(),
    reason: text("reason"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
    rawTcgplayerPayload: jsonb("raw_tcgplayer_payload").$type<Record<string, unknown>>(),
  },
  (table) => ({
    productVariantFk: foreignKey({
      name: "pricing_verification_results_product_variant_fk",
      columns: [table.externalProductId, table.externalVariantId],
      foreignColumns: [externalProductVariants.externalProductId, externalProductVariants.id],
    }).onDelete("no action"),
    pk: primaryKey({ columns: [table.verificationRunId, table.cardPrintId] }),
    cardPrintIdx: index("pricing_verification_results_card_print_idx").on(table.cardPrintId),
    verificationRunIdx: index("pricing_verification_results_verification_run_idx").on(table.verificationRunId),
  }),
);

export const pricingMappingConflicts = pgTable(
  "pricing_mapping_conflicts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    verificationRunId: bigint("verification_run_id", { mode: "number" })
      .notNull()
      .references(() => pricingVerificationRuns.id, { onDelete: "cascade" }),
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id").references(() => externalProducts.id, { onDelete: "set null" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    tcgplayerProductId: text("tcgplayer_product_id"),
    conflictType: pricingMappingConflictTypeEnum("conflict_type").notNull(),
    expectedNumber: text("expected_number"),
    expectedSetCode: text("expected_set_code"),
    expectedName: text("expected_name"),
    providerNumber: text("provider_number"),
    providerSetName: text("provider_set_name"),
    providerProductName: text("provider_product_name"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productVariantFk: foreignKey({
      name: "pricing_mapping_conflicts_product_variant_fk",
      columns: [table.externalProductId, table.externalVariantId],
      foreignColumns: [externalProductVariants.externalProductId, externalProductVariants.id],
    }).onDelete("no action"),
    cardPrintIdx: index("pricing_mapping_conflicts_card_print_idx").on(table.cardPrintId),
    verificationRunIdx: index("pricing_mapping_conflicts_verification_run_idx").on(table.verificationRunId),
  }),
);

export const cardPrintPricePublished = pgTable(
  "card_print_price_published",
  {
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
    priceNm: numeric("price_nm", { precision: 12, scale: 2 }),
    priceLp: numeric("price_lp", { precision: 12, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    verificationStatus: pricingVerificationStatusEnum("verification_status").notNull(),
    verificationRunId: bigint("verification_run_id", { mode: "number" })
      .notNull()
      .references(() => pricingVerificationRuns.id, { onDelete: "restrict" }),
  },
  (table) => ({
    productSourceVariantFk: foreignKey({
      name: "card_print_price_published_product_source_variant_fk",
      columns: [table.externalProductId, table.sourceId, table.externalVariantId],
      foreignColumns: [
        externalProductVariants.externalProductId,
        externalProductVariants.sourceId,
        externalProductVariants.id,
      ],
    }).onDelete("no action"),
    pk: primaryKey({ columns: [table.cardPrintId, table.sourceId] }),
    cardPrintIdx: index("card_print_price_published_card_print_idx").on(table.cardPrintId),
    verificationRunIdx: index("card_print_price_published_verification_run_idx").on(table.verificationRunId),
  }),
);

export const cardPrintDisplayPublished = pgTable(
  "card_print_display_published",
  {
    cardPrintId: text("card_print_id")
      .notNull()
      .references(() => cardPrints.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    externalVariantId: text("external_variant_id").references(() => externalProductVariants.id, {
      onDelete: "set null",
    }),
    displaySetName: text("display_set_name").notNull(),
    displaySetCode: text("display_set_code").notNull(),
    displayRarity: text("display_rarity"),
    displayTitle: text("display_title").notNull(),
    displayTreatmentLabel: text("display_treatment_label"),
    displayImageUrl: text("display_image_url"),
    labelStatus: text("label_status").notNull(),
    verificationRunId: bigint("verification_run_id", { mode: "number" })
      .notNull()
      .references(() => pricingVerificationRuns.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productVariantFk: foreignKey({
      name: "card_print_display_published_product_variant_fk",
      columns: [table.externalProductId, table.externalVariantId],
      foreignColumns: [externalProductVariants.externalProductId, externalProductVariants.id],
    }).onDelete("no action"),
    pk: primaryKey({ columns: [table.cardPrintId] }),
    cardPrintIdx: index("card_print_display_published_card_print_idx").on(table.cardPrintId),
    verificationRunIdx: index("card_print_display_published_verification_run_idx").on(table.verificationRunId),
  }),
);

export const sealedProductPriceCurrent = pgTable(
  "sealed_product_price_current",
  {
    sealedProductId: text("sealed_product_id")
      .notNull()
      .references(() => sealedProducts.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .notNull()
      .references(() => externalProducts.id, { onDelete: "cascade" }),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
    priceChange24h: numeric("price_change_24h", { precision: 8, scale: 2 }),
    priceChange7d: numeric("price_change_7d", { precision: 8, scale: 2 }),
    priceChange30d: numeric("price_change_30d", { precision: 8, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sealedProductId, table.sourceId] }),
    sealedProductIdx: index("sealed_product_price_current_sealed_product_idx").on(table.sealedProductId),
    sourceUpdatedIdx: index("sealed_product_price_current_source_updated_idx").on(table.sourceId, table.updatedAt),
  }),
);

export const sealedProductPriceHistory = pgTable(
  "sealed_product_price_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sealedProductId: text("sealed_product_id")
      .notNull()
      .references(() => sealedProducts.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => externalSources.id, { onDelete: "cascade" }),
    externalProductId: text("external_product_id")
      .references(() => externalProducts.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    priceMarket: numeric("price_market", { precision: 12, scale: 2 }),
  },
  (table) => ({
    sealedProductRecordedAtIdx: index("sealed_product_price_history_sealed_product_recorded_at_idx").on(
      table.sealedProductId,
      table.recordedAt,
    ),
  }),
);

export const importRuns = pgTable(
  "import_runs",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    runType: text("run_type").notNull(),
    status: importRunStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    summaryJson: jsonb("summary_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceRunTypeIdx: index("import_runs_source_run_type_idx").on(table.source, table.runType),
    statusIdx: index("import_runs_status_idx").on(table.status),
  }),
);

export const importStagingCardPrints = pgTable(
  "import_staging_card_prints",
  {
    id: text("id").primaryKey(),
    importRunId: text("import_run_id")
      .notNull()
      .references(() => importRuns.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    normalizedPrintedCardCode: text("normalized_printed_card_code"),
    normalizedVariantSlug: text("normalized_variant_slug"),
    status: importRunStatusEnum("status").notNull().default("queued"),
    ...timestamps,
  },
  (table) => ({
    runIdx: index("import_staging_card_prints_run_idx").on(table.importRunId),
  }),
);

export const importStagingExternalProducts = pgTable(
  "import_staging_external_products",
  {
    id: text("id").primaryKey(),
    importRunId: text("import_run_id")
      .notNull()
      .references(() => importRuns.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    normalizedExternalProductId: text("normalized_external_product_id"),
    normalizedProductKind: externalProductKindEnum("normalized_product_kind"),
    status: importRunStatusEnum("status").notNull().default("queued"),
    ...timestamps,
  },
  (table) => ({
    runIdx: index("import_staging_external_products_run_idx").on(table.importRunId),
  }),
);

export const importIssues = pgTable(
  "import_issues",
  {
    id: text("id").primaryKey(),
    importRunId: text("import_run_id")
      .notNull()
      .references(() => importRuns.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityKey: text("entity_key").notNull(),
    severity: issueSeverityEnum("severity").notNull(),
    issueCode: text("issue_code").notNull(),
    message: text("message").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runSeverityIdx: index("import_issues_run_severity_idx").on(table.importRunId, table.severity),
    entityIdx: index("import_issues_entity_idx").on(table.entityType, table.entityKey),
  }),
);

export const reviewQueue = pgTable(
  "review_queue",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    reasonCode: text("reason_code").notNull(),
    status: reviewStatusEnum("status").notNull().default("open"),
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    entityIdx: index("review_queue_entity_idx").on(table.entityType, table.entityId),
    statusIdx: index("review_queue_status_idx").on(table.status),
  }),
);

export const schema = {
  games,
  releases,
  cards,
  externalSources,
  externalProducts,
  cardPrints,
  sealedProducts,
  cardPrintMarketLinks,
  sealedProductMarketLinks,
  priceSnapshots,
  cardPrintPriceCurrent,
  cardPrintPriceHistory,
  sealedProductPriceCurrent,
  sealedProductPriceHistory,
  importRuns,
  importStagingCardPrints,
  importStagingExternalProducts,
  importIssues,
  reviewQueue,
};

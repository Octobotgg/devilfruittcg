CREATE TYPE "public"."external_product_kind" AS ENUM('raw_card', 'sealed', 'graded', 'other');--> statement-breakpoint
CREATE TYPE "public"."import_run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."mapping_status" AS ENUM('exact', 'probable', 'manual_review', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."release_type" AS ENUM('booster', 'starter_deck', 'premium_booster', 'promo', 'event', 'pre_release', 'demo_deck', 'anniversary', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('open', 'in_progress', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."variant_type" AS ENUM('base', 'parallel', 'alternate_art', 'full_art', 'jolly_roger_foil', 'textured_foil', 'reprint', 'pre_release', 'treasure_cup', 'box_topper', 'promo', 'sp', 'manga', 'anniversary', 'other');--> statement-breakpoint
CREATE TABLE "card_print_market_links" (
	"id" text PRIMARY KEY NOT NULL,
	"card_print_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"mapping_status" "mapping_status" NOT NULL,
	"confidence" text,
	"match_method" text,
	"review_notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_print_price_current" (
	"card_print_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"price_market" numeric(12, 2),
	"price_nm" numeric(12, 2),
	"price_lp" numeric(12, 2),
	"price_change_24h" numeric(8, 2),
	"price_change_7d" numeric(8, 2),
	"price_change_30d" numeric(8, 2),
	"updated_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone,
	CONSTRAINT "card_print_price_current_card_print_id_source_id_pk" PRIMARY KEY("card_print_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "card_print_price_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"card_print_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"price_nm" numeric(12, 2),
	"price_lp" numeric(12, 2),
	"price_market" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "card_prints" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"release_id" text NOT NULL,
	"active_external_product_id" text,
	"print_code" text,
	"printed_card_code" text NOT NULL,
	"variant_family" text NOT NULL,
	"variant_type" "variant_type" NOT NULL,
	"variant_label" text NOT NULL,
	"variant_slug" text NOT NULL,
	"is_reprint" boolean DEFAULT false NOT NULL,
	"is_pre_release" boolean DEFAULT false NOT NULL,
	"is_alt_art" boolean DEFAULT false NOT NULL,
	"is_special_print" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"release_date_override" date,
	"official_source_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"base_card_code" text NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"number" text NOT NULL,
	"card_type" text NOT NULL,
	"color" text NOT NULL,
	"rarity" text NOT NULL,
	"cost" integer,
	"life" integer,
	"power" integer,
	"counter" integer,
	"attribute" text,
	"traits" text,
	"effect_text" text,
	"trigger_text" text,
	"block_icon" text,
	"search_text" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_products" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"product_kind" "external_product_kind" NOT NULL,
	"name" text NOT NULL,
	"set_name" text,
	"number" text,
	"rarity" text,
	"language" text,
	"condition_model" text,
	"printing" text,
	"image_url" text,
	"product_url" text,
	"raw_payload" jsonb,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_key" text NOT NULL,
	"severity" "issue_severity" NOT NULL,
	"issue_code" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"run_type" text NOT NULL,
	"status" "import_run_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"summary_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_staging_card_prints" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"source_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"normalized_printed_card_code" text,
	"normalized_variant_slug" text,
	"status" "import_run_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_staging_external_products" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"source_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"normalized_external_product_id" text,
	"normalized_product_kind" "external_product_kind",
	"status" "import_run_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"external_product_id" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"price_market" numeric(12, 2),
	"price_low" numeric(12, 2),
	"price_mid" numeric(12, 2),
	"price_high" numeric(12, 2),
	"price_nm" numeric(12, 2),
	"price_lp" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"availability" integer,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"release_type" "release_type" NOT NULL,
	"release_date" date,
	"language" text DEFAULT 'EN' NOT NULL,
	"official_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"reason_code" text NOT NULL,
	"status" "review_status" DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sealed_product_market_links" (
	"id" text PRIMARY KEY NOT NULL,
	"sealed_product_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"mapping_status" "mapping_status" NOT NULL,
	"confidence" text,
	"match_method" text,
	"review_notes" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sealed_product_price_current" (
	"sealed_product_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"price_market" numeric(12, 2),
	"price_change_24h" numeric(8, 2),
	"price_change_7d" numeric(8, 2),
	"price_change_30d" numeric(8, 2),
	"updated_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone,
	CONSTRAINT "sealed_product_price_current_sealed_product_id_source_id_pk" PRIMARY KEY("sealed_product_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "sealed_product_price_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sealed_product_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"price_market" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "sealed_products" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"release_id" text,
	"active_external_product_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"product_type" text NOT NULL,
	"sku" text,
	"language" text DEFAULT 'EN' NOT NULL,
	"image_url" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_print_market_links" ADD CONSTRAINT "card_print_market_links_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_market_links" ADD CONSTRAINT "card_print_market_links_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_current" ADD CONSTRAINT "card_print_price_current_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_current" ADD CONSTRAINT "card_print_price_current_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_current" ADD CONSTRAINT "card_print_price_current_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_history" ADD CONSTRAINT "card_print_price_history_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_history" ADD CONSTRAINT "card_print_price_history_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_history" ADD CONSTRAINT "card_print_price_history_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_prints" ADD CONSTRAINT "card_prints_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_prints" ADD CONSTRAINT "card_prints_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_prints" ADD CONSTRAINT "card_prints_active_external_product_id_external_products_id_fk" FOREIGN KEY ("active_external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_products" ADD CONSTRAINT "external_products_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_staging_card_prints" ADD CONSTRAINT "import_staging_card_prints_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_staging_external_products" ADD CONSTRAINT "import_staging_external_products_import_run_id_import_runs_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_market_links" ADD CONSTRAINT "sealed_product_market_links_sealed_product_id_sealed_products_id_fk" FOREIGN KEY ("sealed_product_id") REFERENCES "public"."sealed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_market_links" ADD CONSTRAINT "sealed_product_market_links_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_current" ADD CONSTRAINT "sealed_product_price_current_sealed_product_id_sealed_products_id_fk" FOREIGN KEY ("sealed_product_id") REFERENCES "public"."sealed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_current" ADD CONSTRAINT "sealed_product_price_current_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_current" ADD CONSTRAINT "sealed_product_price_current_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_history" ADD CONSTRAINT "sealed_product_price_history_sealed_product_id_sealed_products_id_fk" FOREIGN KEY ("sealed_product_id") REFERENCES "public"."sealed_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_history" ADD CONSTRAINT "sealed_product_price_history_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_product_price_history" ADD CONSTRAINT "sealed_product_price_history_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_products" ADD CONSTRAINT "sealed_products_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_products" ADD CONSTRAINT "sealed_products_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sealed_products" ADD CONSTRAINT "sealed_products_active_external_product_id_external_products_id_fk" FOREIGN KEY ("active_external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_print_market_links_card_print_external_product_unique" ON "card_print_market_links" USING btree ("card_print_id","external_product_id");--> statement-breakpoint
CREATE INDEX "card_print_market_links_card_print_idx" ON "card_print_market_links" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "card_print_market_links_external_product_idx" ON "card_print_market_links" USING btree ("external_product_id");--> statement-breakpoint
CREATE INDEX "card_print_market_links_status_idx" ON "card_print_market_links" USING btree ("mapping_status");--> statement-breakpoint
CREATE INDEX "card_print_price_current_card_print_idx" ON "card_print_price_current" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "card_print_price_current_source_updated_idx" ON "card_print_price_current" USING btree ("source_id","updated_at");--> statement-breakpoint
CREATE INDEX "card_print_price_history_print_recorded_at_idx" ON "card_print_price_history" USING btree ("card_print_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "card_prints_printed_card_code_unique" ON "card_prints" USING btree ("printed_card_code");--> statement-breakpoint
CREATE UNIQUE INDEX "card_prints_card_variant_slug_unique" ON "card_prints" USING btree ("card_id","variant_slug");--> statement-breakpoint
CREATE INDEX "card_prints_release_idx" ON "card_prints" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "card_prints_card_idx" ON "card_prints" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_prints_active_external_product_idx" ON "card_prints" USING btree ("active_external_product_id");--> statement-breakpoint
CREATE INDEX "card_prints_variant_type_idx" ON "card_prints" USING btree ("variant_type");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_game_base_card_code_unique" ON "cards" USING btree ("game_id","base_card_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_game_set_code_number_name_unique" ON "cards" USING btree ("game_id","set_code","number","name");--> statement-breakpoint
CREATE INDEX "cards_set_code_number_idx" ON "cards" USING btree ("set_code","number");--> statement-breakpoint
CREATE INDEX "cards_name_idx" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "external_products_source_external_product_unique" ON "external_products" USING btree ("source_id","external_product_id");--> statement-breakpoint
CREATE INDEX "external_products_product_kind_idx" ON "external_products" USING btree ("product_kind");--> statement-breakpoint
CREATE INDEX "external_products_number_idx" ON "external_products" USING btree ("number");--> statement-breakpoint
CREATE INDEX "external_products_name_idx" ON "external_products" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "external_sources_code_unique" ON "external_sources" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "games_slug_unique" ON "games" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "import_issues_run_severity_idx" ON "import_issues" USING btree ("import_run_id","severity");--> statement-breakpoint
CREATE INDEX "import_issues_entity_idx" ON "import_issues" USING btree ("entity_type","entity_key");--> statement-breakpoint
CREATE INDEX "import_runs_source_run_type_idx" ON "import_runs" USING btree ("source","run_type");--> statement-breakpoint
CREATE INDEX "import_runs_status_idx" ON "import_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_staging_card_prints_run_idx" ON "import_staging_card_prints" USING btree ("import_run_id");--> statement-breakpoint
CREATE INDEX "import_staging_external_products_run_idx" ON "import_staging_external_products" USING btree ("import_run_id");--> statement-breakpoint
CREATE INDEX "price_snapshots_external_product_captured_at_idx" ON "price_snapshots" USING btree ("external_product_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_game_code_language_unique" ON "releases" USING btree ("game_id","code","language");--> statement-breakpoint
CREATE INDEX "releases_release_type_idx" ON "releases" USING btree ("release_type");--> statement-breakpoint
CREATE INDEX "releases_release_date_idx" ON "releases" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "review_queue_entity_idx" ON "review_queue" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "review_queue_status_idx" ON "review_queue" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sealed_product_market_links_sealed_product_external_product_unique" ON "sealed_product_market_links" USING btree ("sealed_product_id","external_product_id");--> statement-breakpoint
CREATE INDEX "sealed_product_market_links_sealed_product_idx" ON "sealed_product_market_links" USING btree ("sealed_product_id");--> statement-breakpoint
CREATE INDEX "sealed_product_market_links_external_product_idx" ON "sealed_product_market_links" USING btree ("external_product_id");--> statement-breakpoint
CREATE INDEX "sealed_product_market_links_status_idx" ON "sealed_product_market_links" USING btree ("mapping_status");--> statement-breakpoint
CREATE INDEX "sealed_product_price_current_sealed_product_idx" ON "sealed_product_price_current" USING btree ("sealed_product_id");--> statement-breakpoint
CREATE INDEX "sealed_product_price_current_source_updated_idx" ON "sealed_product_price_current" USING btree ("source_id","updated_at");--> statement-breakpoint
CREATE INDEX "sealed_product_price_history_sealed_product_recorded_at_idx" ON "sealed_product_price_history" USING btree ("sealed_product_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sealed_products_game_slug_unique" ON "sealed_products" USING btree ("game_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "sealed_products_sku_unique" ON "sealed_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "sealed_products_release_idx" ON "sealed_products" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "sealed_products_active_external_product_idx" ON "sealed_products" USING btree ("active_external_product_id");--> statement-breakpoint
CREATE INDEX "sealed_products_product_type_idx" ON "sealed_products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "sealed_products_name_idx" ON "sealed_products" USING btree ("name");
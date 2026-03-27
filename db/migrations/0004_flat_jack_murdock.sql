CREATE TYPE "public"."pricing_mapping_conflict_type" AS ENUM('number_mismatch', 'set_mismatch', 'name_mismatch', 'treatment_mismatch', 'duplicate_variant_assignment', 'duplicate_product_assignment', 'ui_label_mismatch');--> statement-breakpoint
CREATE TYPE "public"."pricing_verification_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pricing_verification_status" AS ENUM('verified', 'drift_warning', 'mismatch', 'stale_provider', 'missing_tcgplayer_id', 'unpriced_no_variant', 'mapping_conflict');--> statement-breakpoint
CREATE TABLE "card_print_display_published" (
	"card_print_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"external_variant_id" text,
	"display_set_name" text NOT NULL,
	"display_set_code" text NOT NULL,
	"display_rarity" text,
	"display_title" text NOT NULL,
	"display_treatment_label" text,
	"display_image_url" text,
	"label_status" text NOT NULL,
	"verification_run_id" bigint NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_print_display_published_card_print_id_pk" PRIMARY KEY("card_print_id")
);
--> statement-breakpoint
CREATE TABLE "card_print_price_published" (
	"card_print_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_product_id" text NOT NULL,
	"external_variant_id" text,
	"price_market" numeric(12, 2),
	"price_nm" numeric(12, 2),
	"price_lp" numeric(12, 2),
	"updated_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_status" "pricing_verification_status" NOT NULL,
	"verification_run_id" bigint NOT NULL,
	CONSTRAINT "card_print_price_published_card_print_id_source_id_pk" PRIMARY KEY("card_print_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_mapping_conflicts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"verification_run_id" bigint NOT NULL,
	"card_print_id" text NOT NULL,
	"external_product_id" text,
	"external_variant_id" text,
	"tcgplayer_product_id" text,
	"conflict_type" "pricing_mapping_conflict_type" NOT NULL,
	"expected_number" text,
	"expected_set_code" text,
	"expected_name" text,
	"provider_number" text,
	"provider_set_name" text,
	"provider_product_name" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_verification_results" (
	"verification_run_id" bigint NOT NULL,
	"card_print_id" text NOT NULL,
	"external_product_id" text,
	"external_variant_id" text,
	"tcgplayer_product_id" text,
	"justtcg_price_nm" numeric(12, 2),
	"tcgplayer_market_price" numeric(12, 2),
	"published_price_nm_before" numeric(12, 2),
	"price_delta_abs" numeric(12, 2),
	"price_delta_ratio" numeric(10, 6),
	"mapping_integrity_status" text NOT NULL,
	"label_integrity_status" text NOT NULL,
	"verification_status" "pricing_verification_status" NOT NULL,
	"reason" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_tcgplayer_payload" jsonb,
	CONSTRAINT "pricing_verification_results_verification_run_id_card_print_id_pk" PRIMARY KEY("verification_run_id","card_print_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_verification_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" "pricing_verification_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"source" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_verification_run_id_pricing_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."pricing_verification_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_product_variant_fk" FOREIGN KEY ("external_product_id","external_variant_id") REFERENCES "public"."external_product_variants"("external_product_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_verification_run_id_pricing_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."pricing_verification_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_product_source_variant_fk" FOREIGN KEY ("external_product_id","source_id","external_variant_id") REFERENCES "public"."external_product_variants"("external_product_id","source_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_mapping_conflicts" ADD CONSTRAINT "pricing_mapping_conflicts_verification_run_id_pricing_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."pricing_verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_mapping_conflicts" ADD CONSTRAINT "pricing_mapping_conflicts_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_mapping_conflicts" ADD CONSTRAINT "pricing_mapping_conflicts_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_mapping_conflicts" ADD CONSTRAINT "pricing_mapping_conflicts_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_mapping_conflicts" ADD CONSTRAINT "pricing_mapping_conflicts_product_variant_fk" FOREIGN KEY ("external_product_id","external_variant_id") REFERENCES "public"."external_product_variants"("external_product_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ADD CONSTRAINT "pricing_verification_results_verification_run_id_pricing_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."pricing_verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ADD CONSTRAINT "pricing_verification_results_card_print_id_card_prints_id_fk" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ADD CONSTRAINT "pricing_verification_results_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ADD CONSTRAINT "pricing_verification_results_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ADD CONSTRAINT "pricing_verification_results_product_variant_fk" FOREIGN KEY ("external_product_id","external_variant_id") REFERENCES "public"."external_product_variants"("external_product_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_print_display_published_card_print_idx" ON "card_print_display_published" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "card_print_display_published_verification_run_idx" ON "card_print_display_published" USING btree ("verification_run_id");--> statement-breakpoint
CREATE INDEX "card_print_price_published_card_print_idx" ON "card_print_price_published" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "card_print_price_published_verification_run_idx" ON "card_print_price_published" USING btree ("verification_run_id");--> statement-breakpoint
CREATE INDEX "pricing_mapping_conflicts_card_print_idx" ON "pricing_mapping_conflicts" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "pricing_mapping_conflicts_verification_run_idx" ON "pricing_mapping_conflicts" USING btree ("verification_run_id");--> statement-breakpoint
CREATE INDEX "pricing_verification_results_card_print_idx" ON "pricing_verification_results" USING btree ("card_print_id");--> statement-breakpoint
CREATE INDEX "pricing_verification_results_verification_run_idx" ON "pricing_verification_results" USING btree ("verification_run_id");--> statement-breakpoint
CREATE INDEX "pricing_verification_runs_source_idx" ON "pricing_verification_runs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "pricing_verification_runs_started_at_idx" ON "pricing_verification_runs" USING btree ("started_at");

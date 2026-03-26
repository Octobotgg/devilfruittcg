CREATE TABLE "external_product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"external_product_id" text NOT NULL,
	"source_id" text NOT NULL,
	"provider_variant_id" text NOT NULL,
	"condition" text NOT NULL,
	"printing" text NOT NULL,
	"language" text NOT NULL,
	"price" numeric(12, 2),
	"last_updated_at" timestamp with time zone NOT NULL,
	"price_history_payload" jsonb,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_print_price_current" ADD COLUMN "external_variant_id" text;--> statement-breakpoint
ALTER TABLE "card_print_price_history" ADD COLUMN "external_variant_id" text;--> statement-breakpoint
ALTER TABLE "card_prints" ADD COLUMN "active_external_variant_id" text;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "external_variant_id" text;--> statement-breakpoint
ALTER TABLE "external_product_variants" ADD CONSTRAINT "external_product_variants_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_product_variants" ADD CONSTRAINT "external_product_variants_source_id_external_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."external_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_product_variants_provider_variant_id_unique" ON "external_product_variants" USING btree ("provider_variant_id");--> statement-breakpoint
CREATE INDEX "external_product_variants_external_product_id_idx" ON "external_product_variants" USING btree ("external_product_id");--> statement-breakpoint
CREATE INDEX "external_product_variants_condition_printing_idx" ON "external_product_variants" USING btree ("condition","printing");--> statement-breakpoint
CREATE INDEX "external_product_variants_last_updated_at_idx" ON "external_product_variants" USING btree ("last_updated_at");--> statement-breakpoint
ALTER TABLE "card_print_price_current" ADD CONSTRAINT "card_print_price_current_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_history" ADD CONSTRAINT "card_print_price_history_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_prints" ADD CONSTRAINT "card_prints_active_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("active_external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE set null ON UPDATE no action;
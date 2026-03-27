CREATE TYPE "public"."pricing_label_status" AS ENUM('verified', 'normalized', 'fallback', 'blocked', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pricing_mapping_integrity_status" AS ENUM('verified', 'warning', 'mismatch', 'blocked', 'unknown');--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (SELECT 1 FROM "card_print_display_published" WHERE "external_variant_id" IS NULL) THEN
		RAISE EXCEPTION 'card_print_display_published.external_variant_id must be populated before hardening';
	END IF;
	IF EXISTS (SELECT 1 FROM "card_print_price_published" WHERE "external_variant_id" IS NULL) THEN
		RAISE EXCEPTION 'card_print_price_published.external_variant_id must be populated before hardening';
	END IF;
END $$;--> statement-breakpoint
UPDATE "card_print_display_published" SET "label_status" = 'unknown' WHERE "label_status" IS NULL;--> statement-breakpoint
UPDATE "pricing_verification_results" SET "mapping_integrity_status" = 'unknown' WHERE "mapping_integrity_status" IS NULL;--> statement-breakpoint
UPDATE "pricing_verification_results" SET "label_integrity_status" = 'unknown' WHERE "label_integrity_status" IS NULL;--> statement-breakpoint
ALTER TABLE "card_print_display_published" DROP CONSTRAINT "card_print_display_published_external_product_id_external_products_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_display_published" DROP CONSTRAINT "card_print_display_published_external_variant_id_external_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_price_published" DROP CONSTRAINT "card_print_price_published_external_product_id_external_products_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_price_published" DROP CONSTRAINT "card_print_price_published_external_variant_id_external_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_display_published" ALTER COLUMN "external_variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ALTER COLUMN "label_status" SET DATA TYPE "public"."pricing_label_status" USING "label_status"::"public"."pricing_label_status";--> statement-breakpoint
ALTER TABLE "card_print_price_published" ALTER COLUMN "external_variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ALTER COLUMN "mapping_integrity_status" SET DATA TYPE "public"."pricing_mapping_integrity_status" USING "mapping_integrity_status"::"public"."pricing_mapping_integrity_status";--> statement-breakpoint
ALTER TABLE "pricing_verification_results" ALTER COLUMN "label_integrity_status" SET DATA TYPE "public"."pricing_label_status" USING "label_integrity_status"::"public"."pricing_label_status";--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_external_product_id_external_products_id_fk" FOREIGN KEY ("external_product_id") REFERENCES "public"."external_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE no action ON UPDATE no action;

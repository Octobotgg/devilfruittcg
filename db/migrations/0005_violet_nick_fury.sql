ALTER TABLE "card_print_display_published" DROP CONSTRAINT "card_print_display_published_external_variant_id_external_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_price_published" DROP CONSTRAINT "card_print_price_published_external_variant_id_external_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "card_print_display_published" ALTER COLUMN "external_variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ALTER COLUMN "external_variant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "card_print_display_published" ADD CONSTRAINT "card_print_display_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_print_price_published" ADD CONSTRAINT "card_print_price_published_external_variant_id_external_product_variants_id_fk" FOREIGN KEY ("external_variant_id") REFERENCES "public"."external_product_variants"("id") ON DELETE no action ON UPDATE no action;
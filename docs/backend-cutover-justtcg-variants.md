# JustTCG Variant Cutover Runbook

This runbook covers the cutover to the variant-backed JustTCG pricing model for raw cards.

## What Changed

The live model now treats JustTCG as three separate layers:

- `external_products` holds the JustTCG card/product record.
- `external_product_variants` holds each condition/printing-specific JustTCG variant.
- `card_prints.active_external_variant_id` points to the approved active Near Mint variant used for runtime pricing.

Pricing tables are variant-aware now too:

- `card_print_price_current.external_variant_id`
- `card_print_price_history.external_variant_id`
- `price_snapshots.external_variant_id`

## Importer Flow

The importer keeps the product and variant layers separate.

Full backfill path:

1. Read the full JustTCG catalog snapshot.
2. Write `external_products` for the card/product layer.
3. Write `external_product_variants` for each card variant.
4. Resolve approved raw-card mappings from the approved mapping report.
5. Set both the active product and the active Near Mint variant on `card_prints`.
6. Write current prices, history rows, and snapshots from the active Near Mint variant.

Incremental refresh path:

1. Request JustTCG cards with `updated_after`.
2. Upsert the changed product and variant rows only.
3. Refresh current prices only for cards whose active variant is still the approved Near Mint variant.
4. Do not rerun the fuzzy card-to-print remap.

The premium and event approval rules from the earlier work remain in place. Do not relax them during cutover.

## Full Backfill Command

Use this when you need to rebuild the entire raw-card variant model from the canonical caches:

```bash
JUSTTCG_API_KEY=... \
node scripts/import-justtcg-to-drizzle.mjs \
  --catalog .cache/justtcg/one-piece-catalog.latest.json \
  --mapping-report .cache/justtcg/released-mapping-report.json \
  --price-data .cache/justtcg/approved-price-sync-data.json \
  --apply
```

If you only need a dry run, omit `--apply`.

## Incremental `updated_after` Refresh Command

Use this for delta refreshes after the initial cutover:

```bash
UPDATED_AFTER=1742947200
JUSTTCG_API_KEY=... \
node scripts/import-justtcg-to-drizzle.mjs \
  --updated-after "$UPDATED_AFTER" \
  --mapping-report .cache/justtcg/released-mapping-report.json \
  --apply
```

Notes:

- `updated_after` is a Unix timestamp in seconds.
- Keep the approved mapping report from the full backfill.
- Do not pass the full price sync payload here; the incremental path is for variant refreshes, not a full fuzzy remap.

## Database Spot Checks

Run these after backfill or incremental refresh:

```sql
select count(*) from external_product_variants;
select count(*) from card_prints where active_external_variant_id is not null;
select count(*) from card_print_price_current
where source_id = 'justtcg' and external_variant_id is not null;
```

One useful sample query:

```sql
select
  cp.id as card_print_id,
  cp.active_external_product_id,
  cp.active_external_variant_id,
  epv.condition,
  epv.printing,
  epv.language
from card_prints cp
left join external_product_variants epv on epv.id = cp.active_external_variant_id
where cp.active_external_variant_id is not null
order by cp.id
limit 10;
```

What to expect:

- `active_external_variant_id` should usually be populated for approved raw cards.
- The variant should normally be `Near Mint`, `English`, and `Normal` for canonical runtime pricing.
- `card_print_price_current.external_variant_id` should match the active variant.

## API Spot Checks

Validate the JustTCG delta request directly:

```bash
curl -H "X-API-Key: $JUSTTCG_API_KEY" \
  "https://api.justtcg.com/v1/cards?game=one-piece-card-game&updated_after=1742947200&include_null_prices=true"
```

What to check:

- The response should only include cards/variants changed at or after the cursor.
- The response should include variant payloads with `variantId`, `condition`, `printing`, `language`, `price`, and `lastUpdated`.
- Do not combine `updated_after` with `q`; JustTCG documents those as incompatible.

## Unpriced vs Broken

Treat these differently:

- `Unpriced` is correct when the print is mapped, but there is no approved active Near Mint variant or no current price yet.
- Broken means the mapping or identity chain is wrong. Examples:
  - `active_external_product_id` is missing
  - `active_external_variant_id` is missing for a mapped raw card
  - the active variant is not Near Mint
  - the current price row points to the wrong variant

In runtime terms:

- `missing_active_approved_mapping` usually means the card is intentionally unpriced.
- `missing_current_price` means the active variant exists but the current price row is missing or empty.
- `kind_mismatch` means the row is wired to the wrong collectible type and needs operator attention.

## Cutover Checklist

1. Apply the schema migration.
2. Run the full backfill.
3. Confirm the DB spot checks above.
4. Confirm the runtime API returns priced raw cards for known Near Mint approvals.
5. Switch to incremental `updated_after` refreshes for future syncs.

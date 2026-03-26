# JustTCG Card + Variant V2 Design

Date: 2026-03-26
Branch: `codex/card-pricing-v1`
Status: Approved design

## Goal

Use the JustTCG API the right way for DevilFruitTCG so pricing is strict, accurate, and maintainable.

This design keeps DevilFruit's internal One Piece identity model while aligning runtime pricing with how JustTCG actually models data:

- JustTCG card object = commercial product identity
- JustTCG variant object = condition/printing-specific price identity
- DevilFruit canonical runtime price = approved active Near Mint JustTCG variant

## Why We Are Changing This

The current importer and runtime model flatten too much of JustTCG into a single product row. That works for some cards, but it is not the best long-term fit for:

- premium variants
- event/tournament promos
- condition-aware pricing
- exact runtime pricing lookups
- long-term sync correctness

JustTCG's docs make the intended model clear:

- Cards do not directly contain pricing information
- Pricing is stored in the `variants` array
- `variantId` is the fastest direct lookup
- `updated_after` is the intended incremental sync mechanism

## Source Model From JustTCG

For DevilFruit, the important JustTCG concepts are:

- `cardId`
  - the product-level identity
  - used to retrieve the card and its variants
- `variantId`
  - the condition/printing-specific identity
  - used for the fastest exact lookup
- `variants[]`
  - each variant includes condition, printing, language, price, lastUpdated, and priceHistory

That means a correct DevilFruit mapping needs two external identities for raw cards:

- approved active JustTCG card/product
- approved active Near Mint JustTCG variant

## DevilFruit Runtime Rule

For raw cards:

- `card_print` remains the canonical internal identity
- each `card_print` may link to one approved active JustTCG card/product
- each `card_print` may link to one approved active Near Mint JustTCG variant
- runtime canonical price uses that exact Near Mint variant
- if no approved active Near Mint variant exists, the card is `Unpriced`

For sealed products:

- keep the current sealed model separate from `card_print`
- use JustTCG product identity for sealed
- variant-backed pricing for sealed can be added later if JustTCG sealed responses require it

## Recommended Migration Strategy

Use a safe additive migration.

Do not hard-cut the current runtime model immediately.

Instead:

1. keep current frontend/API response shapes stable
2. add JustTCG variant storage underneath the current system
3. backfill approved Near Mint variants
4. move runtime pricing reads to variant-backed pricing
5. remove old flattened shortcuts only after verification

This keeps the market, collection, and deck cost experiences working while the backend becomes more correct.

## Schema Changes

## Keep

Keep these current tables and meanings:

- `card_prints`
- `sealed_products`
- `external_sources`
- `external_products`
- `card_print_market_links`
- `sealed_product_market_links`

Interpretation change:

- `external_products` becomes the JustTCG card/product layer for raw cards
- it is no longer treated as the final pricing object by itself

## Add

### `external_product_variants`

New table for JustTCG card variants.

Columns:

- `id`
  - internal primary key or direct provider variant id
- `external_product_id`
  - FK to `external_products.id`
- `source_id`
  - FK to `external_sources.id`
- `provider_variant_id`
  - unique JustTCG `variantId`
- `condition`
  - `Near Mint`, `Lightly Played`, etc.
- `printing`
  - `Normal`, `Foil`, etc.
- `language`
  - `English`, `Japanese`, etc.
- `price`
  - latest variant price
- `last_updated_at`
  - provider update time
- `price_history_payload`
  - raw variant history snapshot if needed during transition
- `raw_payload`
  - raw provider payload
- timestamps

Indexes:

- unique on `provider_variant_id`
- index on `external_product_id`
- index on `(condition, printing)`
- index on `last_updated_at`

### `card_prints.active_external_variant_id`

Add nullable FK to `external_product_variants.id`.

Meaning:

- the approved active canonical pricing variant for runtime use
- for v2 raw-card pricing, this should normally be the JustTCG Near Mint variant

### `card_print_variant_market_links`

Optional but recommended review/history table if variant-level approval needs its own audit trail.

If added, columns should include:

- `card_print_id`
- `external_product_variant_id`
- `mapping_status`
- `confidence`
- `match_method`
- `review_notes`
- `approved_by`
- `approved_at`

If we want to keep the first migration smaller, variant approval can initially be stored directly on `card_prints.active_external_variant_id` plus importer-generated review logs.

## Change Existing Price Tables

### `card_print_price_current`

Add:

- `external_variant_id`

Meaning:

- the exact JustTCG variant that produced the canonical price row

Canonical raw-card runtime contract:

- `price_nm` comes from the active Near Mint variant
- `external_product_id` remains available as product context
- `external_variant_id` becomes the exact pricing source of truth

### `card_print_price_history`

Add:

- `external_variant_id`

Meaning:

- historical price points should be tied to the exact variant source, not only the product-level row

### `price_snapshots`

For raw cards, snapshots should move toward variant-level capture.

Recommended options:

- keep current table temporarily and add `external_variant_id`, or
- create a new `variant_price_snapshots` table and migrate reads later

Recommendation:

- add `external_variant_id` to `price_snapshots` first
- avoid introducing a second snapshot table unless needed

## Importer Changes

The importer should stop treating a single flattened JustTCG row as both product and price source.

New importer responsibilities:

1. import JustTCG card object into `external_products`
2. import each JustTCG variant into `external_product_variants`
3. identify the JustTCG Near Mint variant for each approved mapped raw card
4. set:
   - `card_prints.active_external_product_id`
   - `card_prints.active_external_variant_id`
5. write `card_print_price_current` from the active Near Mint variant
6. write history/snapshots using variant-level identity

## Runtime Read Rules

Raw cards:

- collection value
- market price
- deck cost
- published deck cost
- portfolio totals

All of these should read from:

- `card_prints.active_external_variant_id`

and not from fuzzy search or legacy flattened assumptions.

If:

- no active variant link exists, return `Unpriced`
- variant condition is not Near Mint, do not use it as canonical runtime price

## Sync Strategy

Use JustTCG the way its docs intend:

- initial import/backfill:
  - card/product import
  - variant import
- incremental updates:
  - use `updated_after`
  - refresh changed variants
  - update current price rows from changed Near Mint variants

This avoids repeated broad fuzzy matching after the initial mapping pass.

## UI/API Compatibility

During migration:

- keep the current frontend/API shape stable
- keep returning the same market/collection/deck payload shapes
- swap the backend source under those responses from flattened product pricing to variant-backed pricing

This is a backend correctness migration, not a frontend rewrite.

## Acceptance Criteria

The migration is successful when:

- every raw priced card reads from an approved active JustTCG Near Mint variant
- `card_print_price_current.external_variant_id` is populated for priced raw cards
- runtime pricing no longer depends on fuzzy search after mapping
- unpriced cards remain explicitly `Unpriced`
- premium/event/tournament cards no longer share product-level price state incorrectly
- market, collection, and deck cost payloads stay compatible with the current frontend

## What We Are Not Doing In This Step

Not in this step:

- multi-provider blended pricing
- cross-print price fallback
- condition-aware portfolio totals
- full sealed variant architecture unless JustTCG sealed data requires it immediately
- frontend redesign tied to this migration

## Recommendation

Proceed with:

- additive schema migration
- variant-backed JustTCG importer
- active NM variant backfill
- runtime cutover to `active_external_variant_id`

This is the best fit for DevilFruit because it gives the user-facing simplicity the product needs while matching the actual structure of the JustTCG API.

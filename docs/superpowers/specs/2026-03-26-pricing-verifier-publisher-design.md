# JustTCG Verifier + Publisher Design

Date: 2026-03-26
Branch: `codex/card-pricing-v1`
Status: Draft for review

## Goal

Make DevilFruit pricing fast, trustworthy, and recoverable by treating:

- `JustTCG` as the operational pricing source
- `TCGplayer` as the audit/reference source
- DevilFruit runtime prices as a published layer, not a direct side effect of every refresh

This design prevents bad refreshes, stale imports, and mapping drift from silently changing live prices.

## Problem

The current backend can fetch and store JustTCG card + variant data correctly, but it still has two major operational weaknesses:

1. refreshes can break the live runtime layer if the import path is invoked incorrectly
2. DevilFruit has no formal publish boundary between:
   - imported JustTCG data
   - verified market data
   - live user-facing prices

Recent failures made that clear:

- some premium cards matched TCGplayer exactly
- some did not
- one bad refresh command wiped `card_print_price_current` and `active_external_variant_id`, causing cards to become `Unpriced`

That means the runtime needs a stronger operational model, not just better matching.

## What We Want

For every mapped raw card, DevilFruit should be able to answer:

- what JustTCG product is this?
- what JustTCG Near Mint variant is the canonical runtime price?
- what is TCGplayer currently reporting for that same product?
- is the DevilFruit live price verified, stale, drifted, or blocked?

The website should only show live prices from a published price layer that has passed verification rules.

## Approaches Considered

### 1. Trust JustTCG blindly

Refresh JustTCG variants and publish them immediately.

Pros:

- simplest
- fastest

Cons:

- no drift detection
- no protection against stale/incorrect provider snapshots
- no safe rollback boundary

Not recommended.

### 2. Query TCGplayer live during app requests

Use JustTCG plus live TCGplayer checks from the market page, collection page, or detail pages.

Pros:

- strongest immediate comparison

Cons:

- slow
- brittle
- rate-limit risk
- puts verification on the user request path

Not recommended.

### 3. Stage -> verify -> publish

Refresh JustTCG into staging/runtime candidate data, compare against TCGplayer audit data off-request, and publish only verified rows to the live price layer.

Pros:

- fastest frontend
- best operational safety
- good recovery story
- easiest to debug

Cons:

- more backend tables/jobs

Recommended.

## Core Design

The system becomes a three-layer pipeline:

1. `Ingest`
   - fetch card + variant data from JustTCG
   - store/import candidate values

2. `Verify`
   - compare the candidate JustTCG NM price against TCGplayer product details
   - determine verification status and drift

3. `Publish`
   - only verified or policy-allowed rows update live user-facing prices
   - failed or suspicious rows do not wipe the current live layer

## Pricing Layers

### A. Source layer

This is provider truth as imported:

- `external_products`
- `external_product_variants`
- `price_snapshots`

This layer can be stale, partial, or mid-refresh.
It must never be treated as automatically safe for live publication.

### B. Candidate runtime layer

This is the DevilFruit candidate view of what should be live next:

- `card_prints.active_external_product_id`
- `card_prints.active_external_variant_id`
- `card_print_price_current`
- `card_print_price_history`

This layer is allowed to be rebuilt by refresh jobs, but it should not automatically become the published truth unless verification passes.

### C. Published live layer

This is what the website uses for:

- market grid
- card detail
- collection value
- portfolio totals
- deck cost
- published deck cost

Recommendation:

add a published price layer instead of reading directly from candidate rows.

For v1 of this verifier/publisher flow, the cleanest approach is:

- keep candidate rows where they are
- add a published table that the website reads from

Recommended table:

- `card_print_price_published`

Columns:

- `card_print_id`
- `source_id`
- `external_product_id`
- `external_variant_id`
- `price_market`
- `price_nm`
- `price_lp`
- `updated_at`
- `published_at`
- `verification_status`
- `verification_run_id`

Meaning:

- `card_print_price_current` = latest candidate
- `card_print_price_published` = latest approved live price

The site should read from `card_print_price_published`.

## Verification Data Model

### `pricing_verification_runs`

Tracks each audit run.

Columns:

- `id`
- `started_at`
- `finished_at`
- `source`
  - example: `justtcg_incremental_refresh`
- `status`
  - `running`, `completed`, `failed`
- `notes`

### `pricing_verification_results`

One row per checked `card_print`.

Columns:

- `verification_run_id`
- `card_print_id`
- `external_product_id`
- `external_variant_id`
- `tcgplayer_product_id`
- `justtcg_price_nm`
- `tcgplayer_market_price`
- `published_price_nm_before`
- `price_delta_abs`
- `price_delta_ratio`
- `verification_status`
- `reason`
- `checked_at`
- `raw_tcgplayer_payload`

Statuses:

- `verified`
- `drift_warning`
- `mismatch`
- `stale_provider`
- `missing_tcgplayer_id`
- `unpriced_no_variant`
- `mapping_conflict`

## Verification Rules

### Publish-safe rows

A row is publish-safe when:

- the `card_print` has an approved active JustTCG product link
- the `card_print` has an approved active JustTCG Near Mint variant link
- the JustTCG candidate price is present
- the product has a usable `tcgplayerId`
- the fetched TCGplayer product details match the same product identity
- price drift is within allowed tolerance

Recommended default drift rules:

- exact/near-exact:
  - absolute delta <= `$0.05`, or
  - ratio delta <= `0.5%`
- warning but publishable for low-volatility cards:
  - ratio delta <= `2%`
- block publish:
  - ratio delta > `2%` for premium cards
  - ratio delta > `5%` for non-premium cards

Premium cards should use stricter rules.

Premium buckets include:

- Manga
- SP
- Red Super Alternate Art
- Gold/Silver SP
- Anniversary
- high-value event/tournament promos

### Never wipe live prices on failed verification

If a refresh cannot verify a row:

- keep the previous published price
- mark the candidate row as failed or pending review
- do not set the live website to `Unpriced` unless:
  - the row truly has no approved mapping
  - or the previous published row is intentionally retired

This is the most important operational rule in the whole design.

## TCGplayer Audit Source

Use TCGplayer product details as the audit reference, not as the live frontend source.

The repository already has a working lightweight detail fetch path:

- `https://mp-search-api.tcgplayer.com/v1/product/<productId>/details`

That gives enough for verification:

- `marketPrice`
- `productName`
- `setName`
- `setCode`
- `productId`

This is enough to confirm:

- same product identity
- same set/number/title family
- current market price for audit comparison

## Refresh Flow

### Full refresh

1. fetch JustTCG cards + variants
2. update source layer
3. rebuild candidate NM variant links and candidate current prices
4. run TCGplayer verification on changed/high-risk cards
5. publish verified rows to `card_print_price_published`
6. keep previous published rows for failures

### Incremental refresh

1. fetch changed JustTCG cards with `updated_after`
2. update source layer
3. recompute candidate prices only for affected `card_prints`
4. verify only affected rows against TCGplayer
5. publish only verified rows

## Fast Path for Performance

Not every card needs the same verification frequency.

Recommended priority tiers:

- Tier 1: premium/high-value
  - verify every refresh
- Tier 2: medium-value mapped cards
  - verify on change or periodic schedule
- Tier 3: low-value stable cards
  - verify sampled or less frequently

This keeps the system fast while protecting trust where it matters most.

## Caching

Add a persistent TCGplayer detail cache:

- keyed by `tcgplayer_product_id`
- stores the raw product detail response
- stores `fetched_at`

Suggested TTL:

- premium/high-value cards: short TTL
- low-value cards: longer TTL

This reduces rate pressure and makes verification runs repeatable.

## Runtime Read Rule

The website should read from published prices only.

For raw cards:

- if published row exists, use it
- if no published row exists and there has never been one, show `Unpriced`
- do not read candidate rows directly on customer-facing pages

This creates a stable public contract:

- staging can be messy
- candidate rows can be rebuilding
- the live site remains stable

## Recovery and Safety

### Guardrails

1. incremental CLI must fail loudly when `--updated-after` is missing or invalid
2. JustTCG fetches must respect plan-safe page limits and rate handling
3. refresh jobs must not clear the published table before verification succeeds
4. publish must be atomic

### Rollback

If a verification run fails badly:

- keep old published rows
- mark the run failed
- expose failures in a report

Do not attempt automatic destructive cleanup of live prices during a failed run.

## Reporting

Every run should produce a report with:

- number of changed candidate rows
- number verified
- number published
- number blocked
- top mismatches by dollar delta
- top mismatches by ratio
- rows missing `tcgplayerId`
- rows with mapping conflicts

This should be easy to inspect in JSON first.

## Recommended Implementation Order

1. add verification + published price tables
2. switch runtime reads from `card_print_price_current` to `card_print_price_published`
3. add TCGplayer detail cache + verification runner
4. update full refresh flow to stage -> verify -> publish
5. update incremental refresh flow to stage -> verify -> publish
6. add JSON reporting for drift/mismatch results
7. add premium-card regression checks

## Success Criteria

This design is successful when:

- a bad JustTCG refresh cannot blank out live prices
- DevilFruit can explain why any price is live, stale, blocked, or unpriced
- premium cards can be checked quickly against TCGplayer
- the website shows only published verified prices
- JustTCG remains the operational source without being blindly trusted


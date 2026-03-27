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
It also prevents wrong card labels and wrong card-to-price links from leaking into the UI.

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
The website should also only show labels and treatment chips from a published display layer that has passed mapping integrity checks.

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
   - determine verification status, mapping integrity, and drift

3. `Publish`
   - only verified or policy-allowed rows update live user-facing prices and labels
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

### D. Published display layer

This is what the website uses for card naming and treatment chips on priced surfaces.

Recommendation:

add a published display table so the backend can send the UI one verified label package instead of mixing:

- internal print metadata
- raw JustTCG product title
- fallback UI heuristics

Recommended table:

- `card_print_display_published`

Columns:

- `card_print_id`
- `external_product_id`
- `external_variant_id`
- `display_title`
- `display_set_name`
- `display_set_code`
- `display_rarity`
- `display_treatment_label`
- `display_image_url`
- `label_status`
- `verification_run_id`
- `published_at`

Meaning:

- the UI uses one verified display payload
- labels stop leaking from raw slugs, stale internal fields, or mismatched fallback logic

The market grid, card detail header, collection cards, deck cost cards, and search suggestions should read from this table once it exists.

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
- `mapping_integrity_status`
- `label_integrity_status`
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

### `pricing_mapping_conflicts`

Tracks concrete integrity failures when one imported commercial object appears to be attached to the wrong internal card.

Columns:

- `verification_run_id`
- `card_print_id`
- `external_product_id`
- `external_variant_id`
- `tcgplayer_product_id`
- `conflict_type`
- `expected_number`
- `expected_set_code`
- `expected_name`
- `provider_number`
- `provider_set_name`
- `provider_product_name`
- `details`
- `created_at`

Suggested `conflict_type` values:

- `number_mismatch`
- `set_mismatch`
- `name_mismatch`
- `treatment_mismatch`
- `duplicate_variant_assignment`
- `duplicate_product_assignment`
- `ui_label_mismatch`

## Verification Rules

### Mapping integrity rules

Before price drift is even considered, the backend must decide whether the mapped JustTCG product looks like the same actual card.

A candidate mapping should be blocked from publication if any of these are true:

- the expected Bandai/printed number does not match the JustTCG / TCGplayer product number
- the expected set family does not match the provider set family
- the core card name does not match
- the expected treatment does not match the provider treatment
- the same JustTCG variant is attached to multiple unrelated `card_prints`
- the same JustTCG product is active on multiple conflicting prints where only one should win

This is the layer that catches:

- one card showing another card's price
- reprints inheriting a manga or premium price
- wrong alt-art treatment labels
- wrong event/tournament promo labels

If mapping integrity fails:

- do not publish the candidate price
- do not publish the candidate display label
- keep the existing published row if one exists
- record the failure in `pricing_mapping_conflicts`

### Publish-safe rows

A row is publish-safe when:

- the `card_print` has an approved active JustTCG product link
- the `card_print` has an approved active JustTCG Near Mint variant link
- the JustTCG candidate price is present
- the product has a usable `tcgplayerId`
- mapping integrity checks pass
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

### Label publication rules

The same verifier run should also decide what the card is called in the UI.

Recommended display policy:

- use the exact treatment name from the provider when it is specific and trustworthy
- normalize formatting for display
- do not publish vague generic labels like `Parallel` when a more exact treatment exists
- if the treatment cannot be identified confidently, publish no treatment chip

Examples:

- `JOLLY_RODGER_FOIL` -> `Jolly Roger Foil`
- `RED_SUPER_ALTERNATE_ART` -> `Red Super Alternate Art`
- `ALT ART` -> `Alternate Art`
- ambiguous `parallel` with no trusted exact treatment -> publish nothing

The published display layer should be the only source of truth for:

- display title
- treatment chip
- set label
- image choice on priced surfaces

This fixes both backend and UI problems together:

- prices are attached to the right card
- labels describe the same verified card

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
4. run mapping integrity checks
5. run TCGplayer verification on changed/high-risk cards
6. build published display payloads
7. publish verified price rows to `card_print_price_published`
8. publish verified display rows to `card_print_display_published`
9. keep previous published rows for failures

### Incremental refresh

1. fetch changed JustTCG cards with `updated_after`
2. update source layer
3. recompute candidate prices only for affected `card_prints`
4. run mapping integrity checks for affected rows
5. verify only affected rows against TCGplayer
6. rebuild affected published display payloads
7. publish only verified rows

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
Mapping integrity checks should still run on every changed row, even when TCGplayer price verification is sampled less aggressively.

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

For labels:

- if a published display row exists, use it
- if no published display row exists, fall back to a minimal safe internal identity view
- do not render raw provider slugs or guessed treatment chips on customer-facing pages

This creates a stable public contract:

- staging can be messy
- candidate rows can be rebuilding
- the live site remains stable

## Recovery and Safety

### Guardrails

1. incremental CLI must fail loudly when `--updated-after` is missing or invalid
2. JustTCG fetches must respect plan-safe page limits and rate handling
3. refresh jobs must not clear the published price or display tables before verification succeeds
4. publish must be atomic
5. no single refresh should be able to assign one external variant to multiple conflicting live cards without recording a conflict

### Rollback

If a verification run fails badly:

- keep old published rows
- mark the run failed
- expose failures in a report

Do not attempt automatic destructive cleanup of live prices during a failed run.

## Reporting

Every run should produce a report with:

- number of changed candidate rows
- number of mapping conflicts
- number verified
- number published
- number blocked
- top mismatches by dollar delta
- top mismatches by ratio
- rows missing `tcgplayerId`
- rows with mapping conflicts
- top label mismatches
- duplicate external product / variant assignments

This should be easy to inspect in JSON first.

## Recommended Implementation Order

1. add verification + published price tables
2. add published display table
3. switch runtime price reads from `card_print_price_current` to `card_print_price_published`
4. switch display-heavy market surfaces to published display rows
5. add TCGplayer detail cache + verification runner
6. add mapping integrity audit
7. update full refresh flow to stage -> verify -> publish
8. update incremental refresh flow to stage -> verify -> publish
9. add JSON reporting for drift/mismatch results
10. add premium-card and label regression checks

## Success Criteria

This design is successful when:

- a bad JustTCG refresh cannot blank out live prices
- DevilFruit can explain why any price is live, stale, blocked, or unpriced
- DevilFruit can explain why any label/treatment chip is live, blocked, or hidden
- premium cards can be checked quickly against TCGplayer
- the website shows only published verified prices
- the website shows only verified display labels on priced surfaces
- JustTCG remains the operational source without being blindly trusted

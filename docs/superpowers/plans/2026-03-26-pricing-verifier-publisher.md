# JustTCG Verifier + Publisher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a staged `JustTCG -> verify against TCGplayer -> publish` pipeline so DevilFruit only serves verified prices and verified labels, while failed refreshes can never blank out live pricing again.

**Architecture:** Keep the existing JustTCG card + variant import as the source layer, add a verification layer that compares mapped JustTCG NM variants against TCGplayer product details, and publish only approved results into dedicated live price and live display tables. Runtime market, collection, deck, card detail, and search suggestion reads should use published rows instead of candidate rows so staging and failed refreshes never leak to users.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, Supabase Postgres, Drizzle ORM, JustTCG API, TCGplayer product-details endpoint

---

## Pre-Flight Notes

- Approved specs:
  - `docs/superpowers/specs/2026-03-26-justtcg-card-variant-v2-design.md`
  - `docs/superpowers/specs/2026-03-26-pricing-verifier-publisher-design.md`
- Branch: `codex/card-pricing-v1`
- The repo already has unrelated local edits in:
  - `components/market/CardDetailMarketPanel.tsx`
  - `lib/market-display.ts`
  - `tests/market-display.test.ts`
  - `lib/market-detail-pricing.ts`
  - `tests/market-detail-pricing.test.ts`
- Preserve those local market fixes. When this plan touches those files, layer on top of them instead of reverting them.
- Keep candidate/runtime tables intact until published tables are bootstrapped and verified.
- Never delete published rows as part of a refresh unless a targeted test and an explicit policy require it.

## File Map

### New files expected

- `docs/superpowers/plans/2026-03-26-pricing-verifier-publisher.md`
- `tests/pricing-verifier.test.ts`
- `tests/pricing-publisher.test.ts`
- `tests/tcgplayer-detail-cache.test.ts`
- `tests/published-pricing-read-model.test.ts`
- `tests/market-published-display.test.ts`
- `tests/pricing-report.test.ts`
- `lib/server/pricing/pricing-verifier.ts`
- `lib/server/pricing/pricing-publisher.ts`
- `lib/server/pricing/published-card-prices.ts`
- `lib/server/pricing/display-label-publisher.ts`
- `scripts/run-pricing-verification.mjs`
- `scripts/publish-verified-prices.mjs`
- `scripts/bootstrap-published-pricing.mjs`
- `scripts/report-pricing-verification.mjs`
- `scripts/lib/tcgplayer-detail-cache.mjs`
- `docs/backend-pricing-verifier-runbook.md`
- `db/migrations/*`

### Existing files expected to change

- `db/schema.ts`
- `package.json`
- `README.md`
- `scripts/import-justtcg-to-drizzle.mjs`
- `scripts/verify-missing-justtcg-set.mjs`
- `lib/server/pricing/justtcg-variant-read-model.ts`
- `lib/server/pricing/card-print-prices.ts`
- `lib/server/pricing/external-products.ts`
- `lib/server/market/market-search.ts`
- `lib/server/market/market-home.ts`
- `lib/server/collection/portfolio-summary.ts`
- `lib/server/decks/deck-valuation.ts`
- `lib/justtcg-store.ts`
- `lib/market-display.ts`
- `lib/market-detail-pricing.ts`
- `components/market/MarketCatalogView.tsx`
- `components/market/CardDetailMarketPanel.tsx`
- `tests/justtcg-variant-import.test.ts`
- `tests/justtcg-variant-runtime.test.ts`
- `tests/task4-runtime-pricing.test.ts`
- `tests/market-display.test.ts`
- `tests/market-detail-pricing.test.ts`

### Existing files to inspect while implementing

- `docs/superpowers/specs/2026-03-26-pricing-verifier-publisher-design.md`
- `docs/superpowers/specs/2026-03-26-justtcg-card-variant-v2-design.md`
- `scripts/sync-justtcg-prices.mjs`
- `scripts/report-suspicious-justtcg-mappings.mjs`
- `scripts/lib/justtcg-suspicious-mappings.mjs`

## Task 1: Add Published + Verification Schema

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/migrations/*`
- Test: `tests/pricing-verifier.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Add assertions in `tests/pricing-verifier.test.ts` that expect:
- `card_print_price_published` to exist
- `card_print_display_published` to exist
- `pricing_verification_runs` to exist
- `pricing_verification_results` to exist
- `pricing_mapping_conflicts` to exist
- `card_print_price_published` to include:
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
- `card_print_display_published` to include:
  - `card_print_id`
  - `external_product_id`
  - `external_variant_id`
  - `display_set_name`
  - `display_set_code`
  - `display_rarity`
  - `display_title`
  - `display_treatment_label`
  - `display_image_url`
  - `label_status`
  - `verification_run_id`
  - `published_at`
- `pricing_verification_runs` to include:
  - `status`
  - `started_at`
  - `finished_at`
  - `source`
  - `notes`
- `pricing_verification_results` to include:
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
- `pricing_mapping_conflicts` to include evidence fields for:
  - `verification_run_id`
  - `card_print_id`
  - `external_product_id`
  - `external_variant_id`
  - `tcgplayer_product_id`
  - conflict `type`
  - expected `number`
  - expected `set_code`
  - expected `name`
  - provider `number`
  - provider `set_name`
  - provider `product_name`
  - captured `details`
  - `created_at`
- indexes for:
  - `pricing_verification_results.card_print_id`
  - `pricing_mapping_conflicts.card_print_id`
  - `card_print_price_published.card_print_id`
  - `card_print_display_published.card_print_id`

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pricing-verifier.test.ts
```

Expected:
- FAIL because the new tables and fields do not exist yet

- [ ] **Step 3: Add schema objects in `db/schema.ts`**

Add Drizzle tables for:
- `pricingVerificationRuns`
- `pricingVerificationResults`
- `pricingMappingConflicts`
- `cardPrintPricePublished`
- `cardPrintDisplayPublished`

Model them so:
- published price rows point to exact `card_print_id`, `external_product_id`, and `external_variant_id`
- published display rows point to the same identity tuple
- verification result rows store both price drift and mapping/label integrity statuses
- mapping conflict rows store conflict classification and captured evidence
- verification runs explicitly track `running`, `completed`, and `failed`

- [ ] **Step 4: Generate and inspect the migration**

Run:

```bash
npm run db:generate
```

Expected:
- new migration files are generated under `db/migrations`

Verify the SQL contains:
- create table for each new table
- FK constraints to `card_prints`, `external_products`, and `external_product_variants`
- indexes for the lookup/report paths above

- [ ] **Step 5: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 6: Re-run schema tests**

Run:

```bash
node --experimental-strip-types --test tests/pricing-verifier.test.ts
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts db/migrations tests/pricing-verifier.test.ts
git commit -m "feat: add pricing verifier schema"
```

## Task 2: Add TCGplayer Audit Fetch + Cache

**Files:**
- Create: `scripts/lib/tcgplayer-detail-cache.mjs`
- Create: `tests/tcgplayer-detail-cache.test.ts`
- Modify: `scripts/verify-missing-justtcg-set.mjs`

- [ ] **Step 1: Write the failing cache/fetch tests**

Add tests in `tests/tcgplayer-detail-cache.test.ts` that expect:
- product-details fetch to hit `https://mp-search-api.tcgplayer.com/v1/product/<id>/details`
- cached responses to be reused on second fetch
- stale cache entries to refresh when TTL is exceeded
- failed fetches to preserve the last good cached payload

Use a fake `https.get` or injected fetcher rather than hitting the network in tests.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/tcgplayer-detail-cache.test.ts
```

Expected:
- FAIL because the new cache module does not exist

- [ ] **Step 3: Extract a reusable TCGplayer detail cache module**

Move the lightweight product-details fetch/caching logic into `scripts/lib/tcgplayer-detail-cache.mjs`.

Required API:

```js
export async function getTcgplayerProductDetail({
  productId,
  cache,
  cachePath,
  ttlMs,
  fetchImpl,
}) {}
```

Behavior:
- return cached payload when still fresh
- fetch and overwrite cache when stale or missing
- keep old cache if remote fetch fails
- never throw away the last good payload because of a transient network problem

- [ ] **Step 4: Reuse the shared cache module**

Update `scripts/verify-missing-justtcg-set.mjs` to use the new helper instead of its private detail-fetch implementation.

- [ ] **Step 5: Re-run tests**

Run:

```bash
node --experimental-strip-types --test tests/tcgplayer-detail-cache.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/tcgplayer-detail-cache.mjs scripts/verify-missing-justtcg-set.mjs tests/tcgplayer-detail-cache.test.ts
git commit -m "feat: add tcgplayer detail cache"
```

## Task 3: Build Mapping Integrity + Drift + Label Verifier

**Files:**
- Create: `lib/server/pricing/pricing-verifier.ts`
- Create: `tests/pricing-verifier.test.ts`
- Modify: `scripts/verify-missing-justtcg-set.mjs`
- Modify: `lib/market-display.ts`

- [ ] **Step 1: Add failing verifier tests**

In `tests/pricing-verifier.test.ts`, add cases for:
- exact matching number, set family, and title core => `mapping_integrity_status = verified`
- product number mismatch => `number_mismatch`
- set mismatch => `set_mismatch`
- premium treatment mismatch => `treatment_mismatch`
- duplicate external variant assigned to conflicting prints => `duplicate_variant_assignment`
- vague fallback treatment like `Parallel` with no trustworthy exact treatment => publish no treatment chip
- clean provider title like `JOLLY_RODGER_FOIL` => published label `Jolly Roger Foil`
- premium cards use stricter drift thresholds than non-premium cards
- exact/near-exact cases pass when absolute delta <= `$0.05` or ratio delta <= `0.5%`
- low-volatility non-premium rows can publish with `drift_warning` when ratio delta is > `0.5%` and <= `2%`
- non-premium rows in the > `2%` and <= `5%` band persist `mismatch` and remain blocked from publish unless a later policy explicitly allows them
- premium rows block publish when ratio delta > `2%`
- non-premium rows block publish when ratio delta > `5%`
- rows with mapping failure are blocked before drift evaluation
- `stale_provider`, `missing_tcgplayer_id`, `unpriced_no_variant`, and `mapping_conflict` statuses are persisted explicitly
- `duplicate_product_assignment` and `ui_label_mismatch` conflict types are captured explicitly

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pricing-verifier.test.ts
```

Expected:
- FAIL because the verifier module does not exist or the statuses are not implemented

- [ ] **Step 3: Implement `pricing-verifier.ts`**

Add pure functions for:

```ts
export function verifyMappingIntegrity(input) {}
export function verifyPriceDrift(input) {}
export function buildPublishedDisplayPayload(input) {}
```

Rules:
- number, set, and name checks happen before drift checks
- if mapping integrity fails, the row is blocked regardless of price drift
- treatment labels are cleaned for display
- vague labels are hidden when exact treatment cannot be trusted
- premium cards use the stricter tolerance from the spec

Reuse normalization patterns from:
- `scripts/verify-missing-justtcg-set.mjs`
- `lib/market-display.ts`

but keep this module backend-focused and deterministic.

- [ ] **Step 4: Re-run tests**

Run:

```bash
node --experimental-strip-types --test tests/pricing-verifier.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add lib/server/pricing/pricing-verifier.ts tests/pricing-verifier.test.ts scripts/verify-missing-justtcg-set.mjs lib/market-display.ts
git commit -m "feat: add pricing integrity verifier"
```

## Task 4: Add Atomic Publisher Logic + Published Read Model

**Files:**
- Create: `lib/server/pricing/pricing-publisher.ts`
- Create: `lib/server/pricing/published-card-prices.ts`
- Create: `lib/server/pricing/display-label-publisher.ts`
- Create: `tests/pricing-publisher.test.ts`
- Create: `tests/published-pricing-read-model.test.ts`

- [ ] **Step 1: Write failing publisher/read-model tests**

Add tests that expect:
- verified candidate rows publish into `card_print_price_published`
- policy-allowed `drift_warning` rows still publish
- blocked rows leave the old published price untouched
- blocked rows leave the old published display row and image untouched
- `missing_tcgplayer_id`, `unpriced_no_variant`, `stale_provider`, and `mapping_conflict` rows stay blocked
- `duplicate_product_assignment` and `ui_label_mismatch` conflicts stay blocked and are reported
- verified display payloads publish into `card_print_display_published`
- publish writes both published tables inside one transaction
- a failed display publish rolls back the paired price publish
- successful publish marks `pricing_verification_runs.status = completed` with `finished_at`
- failed publish rolls back live writes, then marks `pricing_verification_runs.status = failed` with `finished_at` in the error path
- runtime readers prefer published rows over candidate rows
- if no published row exists, runtime returns `Unpriced`
- if no published display row exists, runtime falls back to safe internal identity labels only

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pricing-publisher.test.ts tests/published-pricing-read-model.test.ts
```

Expected:
- FAIL because the publisher/read-model modules do not exist

- [ ] **Step 3: Implement publisher modules**

In `pricing-publisher.ts`:
- take candidate price rows + verification result rows
- choose rows that are publish-safe
- allow both `verified` and policy-allowed `drift_warning` rows to publish
- retain old published rows when verification fails
- retain old published display rows when verification or label integrity fails
- emit upsert payloads for `card_print_price_published`
- publish price rows and display rows atomically inside one live-write transaction
- mark the run `completed` with `finished_at` only after the live-write transaction succeeds
- on failure, roll back live writes and then record `status = failed` with `finished_at` in a separate error-path update

In `display-label-publisher.ts`:
- take candidate identity + provider title/treatment + verification result
- emit upsert payloads for `card_print_display_published`
- do not emit untrusted treatment chips

In `published-card-prices.ts`:
- read published price rows
- expose the same runtime shape the app already expects

- [ ] **Step 4: Re-run publisher/read-model tests**

Run:

```bash
node --experimental-strip-types --test tests/pricing-publisher.test.ts tests/published-pricing-read-model.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add lib/server/pricing/pricing-publisher.ts lib/server/pricing/published-card-prices.ts lib/server/pricing/display-label-publisher.ts tests/pricing-publisher.test.ts tests/published-pricing-read-model.test.ts
git commit -m "feat: add atomic published pricing and display layers"
```

## Task 5: Bootstrap Published Rows Before Runtime Cutover

**Files:**
- Create: `scripts/bootstrap-published-pricing.mjs`
- Modify: `tests/pricing-publisher.test.ts`
- Modify: `tests/justtcg-variant-runtime.test.ts`

- [ ] **Step 1: Add failing bootstrap tests**

Add tests that prove:
- existing safe candidate rows can seed both published tables
- bootstrap publish preserves currently priced cards instead of blanking them
- bootstrap skips blocked or incomplete candidate rows
- bootstrap can seed policy-allowed `drift_warning` rows
- bootstrap can be re-run idempotently
- bootstrap reconciliation fails loudly if currently live candidate-priced rows are missing published price coverage or published display coverage

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pricing-publisher.test.ts tests/justtcg-variant-runtime.test.ts
```

Expected:
- FAIL because bootstrap publish does not exist

- [ ] **Step 3: Implement bootstrap runner**

In `scripts/bootstrap-published-pricing.mjs`:
- load current candidate price rows and variant links
- verify them through the same verifier/publisher rules
- seed both:
  - `card_print_price_published`
  - `card_print_display_published`
- write a run record in `pricing_verification_runs`
- never delete existing published rows during bootstrap
- compare current candidate live coverage against published coverage and abort cutover if priced/display gaps remain

- [ ] **Step 4: Re-run bootstrap tests**

Run:

```bash
node --experimental-strip-types --test tests/pricing-publisher.test.ts tests/justtcg-variant-runtime.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-published-pricing.mjs tests/pricing-publisher.test.ts tests/justtcg-variant-runtime.test.ts
git commit -m "feat: add published pricing bootstrap"
```

## Task 6: Switch Runtime Reads to Published Price + Display Rows

**Files:**
- Modify: `lib/server/pricing/card-print-prices.ts`
- Modify: `lib/server/pricing/justtcg-variant-read-model.ts`
- Modify: `lib/server/pricing/external-products.ts`
- Modify: `lib/server/market/market-search.ts`
- Modify: `lib/server/market/market-home.ts`
- Modify: `lib/server/collection/portfolio-summary.ts`
- Modify: `lib/server/decks/deck-valuation.ts`
- Modify: `lib/justtcg-store.ts`
- Modify: `lib/market-detail-pricing.ts`
- Modify: `lib/market-display.ts`
- Modify: `components/market/CardDetailMarketPanel.tsx`
- Modify: `components/market/MarketCatalogView.tsx`
- Test: `tests/task4-runtime-pricing.test.ts`
- Test: `tests/published-pricing-read-model.test.ts`
- Test: `tests/market-display.test.ts`
- Test: `tests/market-detail-pricing.test.ts`
- Test: `tests/market-published-display.test.ts`

- [ ] **Step 1: Add failing runtime/display tests**

Add tests that prove:
- market search reads published prices instead of candidate current prices
- market home movers use published prices
- collection portfolio uses published price/history rows
- deck valuation uses published prices
- collection cards use the published display title/treatment/set payload
- deck cost cards use the published display title/treatment/set payload
- `justtcg-store` compatibility responses use published rows
- market labels and treatment chips prefer `card_print_display_published`
- priced surfaces use `display_image_url` from `card_print_display_published` when present
- card detail header reads the published display payload
- search suggestions read the published display payload
- if no published display row exists, runtime falls back to a minimal safe internal identity view

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test \
  tests/task4-runtime-pricing.test.ts \
  tests/published-pricing-read-model.test.ts \
  tests/market-display.test.ts \
  tests/market-detail-pricing.test.ts \
  tests/market-published-display.test.ts
```

Expected:
- FAIL because runtime still reads candidate rows or mixed display logic

- [ ] **Step 3: Update runtime queries and display surfaces**

Switch read paths so they:
- use `card_print_price_published` as the live price source
- join `card_print_display_published` for verified label/title/treatment/image data where appropriate
- fall back safely when published display data is absent
- never show raw staging values to users

Cover these surfaces explicitly:
- market grid
- market search suggestions
- card detail header/panel
- collection cards
- deck cost cards

- [ ] **Step 4: Re-run runtime/display tests**

Run:

```bash
node --experimental-strip-types --test \
  tests/task4-runtime-pricing.test.ts \
  tests/published-pricing-read-model.test.ts \
  tests/market-display.test.ts \
  tests/market-detail-pricing.test.ts \
  tests/market-published-display.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add lib/server/pricing/card-print-prices.ts lib/server/pricing/justtcg-variant-read-model.ts lib/server/pricing/external-products.ts lib/server/market/market-search.ts lib/server/market/market-home.ts lib/server/collection/portfolio-summary.ts lib/server/decks/deck-valuation.ts lib/justtcg-store.ts lib/market-detail-pricing.ts lib/market-display.ts components/market/CardDetailMarketPanel.tsx components/market/MarketCatalogView.tsx tests/task4-runtime-pricing.test.ts tests/published-pricing-read-model.test.ts tests/market-display.test.ts tests/market-detail-pricing.test.ts tests/market-published-display.test.ts
git commit -m "feat: read runtime prices and labels from published tables"
```

## Task 7: Wire Refresh Jobs to Stage -> Verify -> Publish

**Files:**
- Modify: `scripts/import-justtcg-to-drizzle.mjs`
- Create: `scripts/run-pricing-verification.mjs`
- Create: `scripts/publish-verified-prices.mjs`
- Modify: `tests/justtcg-variant-import.test.ts`
- Modify: `tests/justtcg-variant-runtime.test.ts`
- Modify: `tests/pricing-publisher.test.ts`

- [ ] **Step 1: Add failing refresh-flow tests**

Add tests that prove:
- a bad or partial refresh does not delete published prices
- incremental refresh with changed provider data only updates verified published rows
- invalid `--updated-after` still errors loudly
- refreshes use the plan-safe page limit
- a candidate rebuild with no active variants does not wipe published rows
- verify and publish run as separate explicit steps after import
- full publish-run rollback works if one row fails mid-run
- run status becomes `failed` and keeps old published rows on publish-run failure
- runs with `stale_provider`, `missing_tcgplayer_id`, `unpriced_no_variant`, and `mapping_conflict` rows record those blocked statuses without publishing them

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-import.test.ts tests/justtcg-variant-runtime.test.ts tests/pricing-publisher.test.ts
```

Expected:
- FAIL because the refresh pipeline does not yet verify/publish

- [ ] **Step 3: Implement the verifier runner**

In `scripts/run-pricing-verification.mjs`:
- load changed candidate rows
- fetch or reuse cached TCGplayer details
- run mapping integrity and drift verification
- persist rows into:
  - `pricing_verification_runs`
  - `pricing_verification_results`
  - `pricing_mapping_conflicts`
- explicitly record blocked statuses for:
  - `stale_provider`
  - `missing_tcgplayer_id`
  - `unpriced_no_variant`
  - `mapping_conflict`

- [ ] **Step 4: Implement the publisher runner**

In `scripts/publish-verified-prices.mjs`:
- load latest verification results
- load candidate rows
- publish only safe rows into:
  - `card_print_price_published`
  - `card_print_display_published`
- explicitly leave old published rows intact for blocked rows
- execute the whole publish run inside one transaction boundary
- roll back all write attempts if any row in the run fails
- after rollback, mark the verification run `failed` with `finished_at` in a separate error-path update

- [ ] **Step 5: Update JustTCG import flow**

In `scripts/import-justtcg-to-drizzle.mjs`:
- keep source/candidate refresh behavior
- do not treat candidate rows as live rows
- ensure command-line guardrails stay in place
- add a documented path to run:
  1. import
  2. verify
  3. publish

- [ ] **Step 6: Re-run refresh-flow tests**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-import.test.ts tests/justtcg-variant-runtime.test.ts tests/pricing-publisher.test.ts
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/import-justtcg-to-drizzle.mjs scripts/run-pricing-verification.mjs scripts/publish-verified-prices.mjs tests/justtcg-variant-import.test.ts tests/justtcg-variant-runtime.test.ts tests/pricing-publisher.test.ts
git commit -m "feat: wire pricing refresh to verify and publish"
```

## Task 8: Add Reporting + Runbook + Manual Verification

**Files:**
- Create: `scripts/report-pricing-verification.mjs`
- Create: `tests/pricing-report.test.ts`
- Create: `docs/backend-pricing-verifier-runbook.md`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add failing reporting tests**

Add tests in `tests/pricing-report.test.ts` that expect JSON output containing:
- number of changed candidate rows
- number of mapping conflicts
- total checked rows
- verified rows
- published rows
- blocked rows
- drift warnings
- top mismatches by dollar delta
- top mismatches by ratio
- missing `tcgplayerId`
- rows with mapping conflicts
- duplicate assignments
- label mismatches
- conflict breakdown by reason

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/pricing-report.test.ts
```

Expected:
- FAIL because the reporting module does not exist

- [ ] **Step 3: Implement the reporting script**

In `scripts/report-pricing-verification.mjs`:
- read the latest verification run
- emit JSON-inspectable output with the counts and buckets above
- include separate top mismatch lists for dollar delta and ratio delta
- include published-row count and mapping-conflict count
- support filtering to premium/high-value rows for fast manual review

- [ ] **Step 4: Add package scripts**

Add scripts such as:

```json
{
  "verify:pricing": "node scripts/run-pricing-verification.mjs",
  "publish:pricing": "node scripts/publish-verified-prices.mjs",
  "bootstrap:pricing": "node scripts/bootstrap-published-pricing.mjs",
  "report:pricing": "node scripts/report-pricing-verification.mjs"
}
```

- [ ] **Step 5: Write the runbook**

Document:
- full refresh flow
- bootstrap cutover flow
- incremental refresh flow
- how to inspect verification reports
- how to inspect conflicts
- how to recover from a failed refresh without touching live prices

- [ ] **Step 6: Update README operational notes**

Add a short section explaining:
- JustTCG is the runtime source
- TCGplayer is the audit/reference source
- the website reads published verified prices and published verified labels

- [ ] **Step 7: Run final verification suite**

Run:

```bash
node --experimental-strip-types --test \
  tests/justtcg-variant-import.test.ts \
  tests/justtcg-variant-runtime.test.ts \
  tests/pricing-verifier.test.ts \
  tests/tcgplayer-detail-cache.test.ts \
  tests/pricing-publisher.test.ts \
  tests/published-pricing-read-model.test.ts \
  tests/task4-runtime-pricing.test.ts \
  tests/market-display.test.ts \
  tests/market-detail-pricing.test.ts \
  tests/market-published-display.test.ts \
  tests/pricing-report.test.ts
npx tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 8: Manual verification**

After running the real pipeline in local or staging data:
- confirm previously verified cards still match TCGplayer:
  - `657406`
  - `657411`
- confirm drift examples are recorded correctly:
  - `657401`
  - `529850`
  - `527026`
- confirm the website still renders:
  - market grid
  - card detail
  - collection portfolio
  - deck valuation
- confirm bootstrap preserved already-priced rows before runtime cutover

- [ ] **Step 9: Commit**

```bash
git add scripts/report-pricing-verification.mjs tests/pricing-report.test.ts docs/backend-pricing-verifier-runbook.md README.md package.json
git commit -m "docs: add pricing verifier reporting and runbook"
```

## Execution Notes

- Implement this plan in order.
- Do not switch runtime reads until published tables exist, bootstrap has seeded them, and runtime tests pass.
- Do not run destructive DB cleanup to “fix” failed refreshes.
- Publish must be atomic across both published tables. Success status is recorded after the live-write transaction commits; failure status is recorded immediately after rollback in the error path.
- Preserve the current unrelated market-page local edits unless a task explicitly requires merging them.
- Prefer small commits after each task.

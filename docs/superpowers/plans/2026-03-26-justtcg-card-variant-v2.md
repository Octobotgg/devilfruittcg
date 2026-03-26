# JustTCG Card + Variant V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate DevilFruit’s raw-card pricing from a flattened JustTCG product shortcut to a correct JustTCG card + variant model, with canonical runtime price sourced from the approved active Near Mint variant.

**Architecture:** Keep `card_prints` as the internal One Piece identity and keep `external_products` as the JustTCG card/product layer. Add a new JustTCG variant table plus active NM variant pointers, backfill approved variant links, and cut runtime pricing reads over without changing the frontend/API response shape.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase Postgres, Drizzle ORM, JustTCG API/import scripts, Node test runner

---

## Pre-Flight Notes

- Approved spec: `docs/superpowers/specs/2026-03-26-justtcg-card-variant-v2-design.md`
- Branch: `codex/card-pricing-v1`
- Current runtime is still compatible with the old frontend/API shape
- The pricing importer has already been hardened for premium/event/base recovery work; do not regress those fixes
- Keep the migration additive until variant-backed runtime reads are verified

## File Map

### New files expected

- `db/migrations/*`
- `tests/justtcg-variant-import.test.ts`
- `tests/justtcg-variant-runtime.test.ts`
- `lib/server/pricing/justtcg-variant-read-model.ts`
- `docs/backend-cutover-justtcg-variants.md`

### Existing files expected to change

- `db/schema.ts`
- `scripts/import-justtcg-to-drizzle.mjs`
- `scripts/manual-apply-justtcg-seed.mjs`
- `lib/justtcg-store.ts`
- `lib/server/market/market-search.ts`
- `lib/server/market/market-home.ts`
- `lib/server/collection/portfolio-summary.ts`
- `lib/server/decks/deck-valuation.ts`
- `tests/import-justtcg-to-drizzle.test.ts`
- `tests/task4-runtime-pricing.test.ts`

### Existing files to inspect while implementing

- `db/migrations/0000_neat_avengers.sql`
- `db/migrations/meta/0000_snapshot.json`
- `docs/superpowers/specs/2026-03-25-card-pricing-v1-design.md`
- `docs/superpowers/specs/2026-03-26-justtcg-card-variant-v2-design.md`

## Task 1: Add Variant-Level Schema

**Files:**
- Modify: `db/schema.ts`
- Modify: `db/migrations/*`
- Test: `db/schema.ts`

- [ ] **Step 1: Write the failing schema-level tests**

Add tests or assertions in `tests/justtcg-variant-import.test.ts` that expect:
- `external_product_variants` to exist
- `card_prints.active_external_variant_id` to exist
- `card_print_price_current.external_variant_id` to exist
- `external_product_variants.source_id` to exist
- `external_product_variants.provider_variant_id` to be unique
- `external_product_variants.last_updated_at` to exist
- indexes for variant lookup paths to be defined

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-import.test.ts
```

Expected:
- FAIL because the variant table / fields do not exist yet

- [ ] **Step 3: Add the new schema objects**

In `db/schema.ts`:
- add `external_product_variants`
- add `card_prints.active_external_variant_id`
- add `card_print_price_current.external_variant_id`
- add `card_print_price_history.external_variant_id`
- add `price_snapshots.external_variant_id`

Use explicit indexes for:
- `provider_variant_id`
- `external_product_id`
- `(condition, printing)`
- timestamps

- [ ] **Step 4: Generate the migration**

Run:

```bash
npm run db:generate
```

Expected:
- new migration files created under `db/migrations`

- [ ] **Step 5: Run TypeScript before touching the real database**

Run:

```bash
npx tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 6: Re-run schema test locally**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-import.test.ts
```

Expected:
- PASS for schema expectations

- [ ] **Step 7: Apply the migration to the real database before any variant backfill**

Run:

```bash
set -a && source .env.local && set +a && npm run db:migrate
```

Expected:
- migration completes successfully against Supabase Postgres
- new variant table and FK columns exist in the live DB

- [ ] **Step 8: Verify migrated schema in the database**

Run spot checks that confirm:
- `external_product_variants` exists
- `card_prints.active_external_variant_id` exists
- `card_print_price_current.external_variant_id` exists
- `price_snapshots.external_variant_id` exists
- `external_product_variants.provider_variant_id` has its uniqueness constraint/index
- the variant lookup indexes defined in the schema exist in Postgres

Expected:
- all new columns/tables are present before importer work starts

- [ ] **Step 9: Commit**

```bash
git add db/schema.ts db/migrations tests/justtcg-variant-import.test.ts
git commit -m "feat: add JustTCG variant schema"
```

## Task 2: Import JustTCG Variants Correctly

**Files:**
- Modify: `scripts/import-justtcg-to-drizzle.mjs`
- Modify: `scripts/manual-apply-justtcg-seed.mjs`
- Modify: `tests/import-justtcg-to-drizzle.test.ts`
- Create: `tests/justtcg-variant-import.test.ts`

- [ ] **Step 1: Write the failing importer tests**

Add tests that expect:
- JustTCG card objects to land in `external_products`
- JustTCG variants to land in `external_product_variants`
- active NM variant selection for a mapped raw card
- non-NM variants not becoming the canonical runtime price by default

- [ ] **Step 2: Run importer tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/import-justtcg-to-drizzle.test.ts tests/justtcg-variant-import.test.ts
```

Expected:
- FAIL because variants are not imported/stored yet

- [ ] **Step 3: Update the importer**

In `scripts/import-justtcg-to-drizzle.mjs`:
- parse JustTCG card object separately from its variants
- create `external_products` from card/product-level fields
- create `external_product_variants` from each variant entry
- select the Near Mint variant as canonical runtime candidate
- keep existing exact/probable/manual review protections intact

- [ ] **Step 4: Update manual seed apply**

In `scripts/manual-apply-justtcg-seed.mjs`:
- insert `external_product_variants`
- support variant-level upserts
- support `external_variant_id` fields in current/history/snapshot writes

- [ ] **Step 5: Re-run importer tests**

Run:

```bash
node --experimental-strip-types --test tests/import-justtcg-to-drizzle.test.ts tests/justtcg-variant-import.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/import-justtcg-to-drizzle.mjs scripts/manual-apply-justtcg-seed.mjs tests/import-justtcg-to-drizzle.test.ts tests/justtcg-variant-import.test.ts
git commit -m "feat: import JustTCG variants"
```

## Task 3: Backfill Active Near Mint Variant Links

**Files:**
- Modify: `scripts/import-justtcg-to-drizzle.mjs`
- Modify: `tests/import-justtcg-to-drizzle.test.ts`
- Create: `tests/justtcg-variant-runtime.test.ts`

- [ ] **Step 1: Write the failing backfill/runtime tests**

Add tests that expect:
- `card_prints.active_external_variant_id` to be populated for exact approved mapped raw cards
- `card_print_price_current.external_variant_id` to match the active NM variant
- `price_snapshots.external_variant_id` to match the exact variant source
- cards with no exact NM variant to remain `Unpriced`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-runtime.test.ts
```

Expected:
- FAIL because active variant backfill is not wired yet

- [ ] **Step 3: Implement active NM variant assignment**

Update importer/backfill logic so:
- exact approved product mapping resolves to an exact approved NM variant
- `active_external_variant_id` is filled
- `card_print_price_current` and `card_print_price_history` reference the exact variant
- non-exact or missing NM variant leaves card unpriced

- [ ] **Step 4: Re-run variant assignment tests**

Run:

```bash
node --experimental-strip-types --test tests/justtcg-variant-runtime.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Apply the seed to Postgres**

Run:

```bash
set -a && source .env.local && set +a && node scripts/import-justtcg-to-drizzle.mjs --apply --mapping-report .cache/justtcg/released-mapping-report-premium-reviewed.json
```

Expected:
- script completes successfully
- current price rows and active variant links update in the database

- [ ] **Step 6: Verify real DB state**

Run checks for:
- total priced vs unpriced counts
- a base card sample
- a premium card sample
- a deliberately unpriced sample
- one `price_snapshots` row that proves `external_variant_id` is populated from the exact NM variant
- one `card_print_price_history` row that proves `external_variant_id` is populated from the exact NM variant

Expected:
- counts and samples reflect variant-backed current pricing

- [ ] **Step 7: Commit**

```bash
git add scripts/import-justtcg-to-drizzle.mjs tests/import-justtcg-to-drizzle.test.ts tests/justtcg-variant-runtime.test.ts
git commit -m "feat: backfill active JustTCG NM variants"
```

## Task 4: Cut Runtime Reads To Variant-Backed Pricing

**Files:**
- Create: `lib/server/pricing/justtcg-variant-read-model.ts`
- Modify: `lib/justtcg-store.ts`
- Modify: `lib/server/market/market-search.ts`
- Modify: `lib/server/market/market-home.ts`
- Modify: `lib/server/collection/portfolio-summary.ts`
- Modify: `lib/server/decks/deck-valuation.ts`
- Modify: `tests/task4-runtime-pricing.test.ts`

- [ ] **Step 1: Write the failing runtime read tests**

Extend tests so they require:
- price reads to use `external_variant_id`
- market, collection, and deck valuation to stay compatible
- published deck cost to stay compatible
- cards with only product-level links but no active NM variant to remain unpriced

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --experimental-strip-types --test tests/task4-runtime-pricing.test.ts
```

Expected:
- FAIL because runtime still assumes flattened product pricing

- [ ] **Step 3: Add a variant-backed read model**

Create `lib/server/pricing/justtcg-variant-read-model.ts` that:
- resolves current NM price via `active_external_variant_id`
- exposes the linked JustTCG product context for UI payloads
- returns `Unpriced` when no active NM variant exists

- [ ] **Step 4: Swap runtime readers**

Update:
- `lib/justtcg-store.ts`
- `lib/server/market/market-search.ts`
- `lib/server/market/market-home.ts`
- `lib/server/collection/portfolio-summary.ts`
- `lib/server/decks/deck-valuation.ts`

Also inspect and update any published-deck reader path that still depends on legacy pricing assumptions.

Keep response shapes stable.

- [ ] **Step 5: Re-run runtime tests**

Run:

```bash
node --experimental-strip-types --test tests/task4-runtime-pricing.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Verify live API compatibility**

Run:

```bash
curl -s 'http://localhost:3001/api/market/tcg-price?id=EB02-001'
curl -s 'http://localhost:3001/api/market/tcg-price?id=OP13-120_p2'
curl -s 'http://localhost:3001/api/market/tcg-price?id=ST01-012_p1'
```

Expected:
- priced cards return JustTCG-backed NM pricing
- unpriced card still returns `price: null`

- [ ] **Step 7: Verify collection and deck valuation compatibility**

Run spot checks for:
- collection portfolio summary
- normal deck valuation
- published deck cost path

Expected:
- all three continue using the same response shape while reading variant-backed NM pricing underneath

- [ ] **Step 8: Commit**

```bash
git add lib/server/pricing/justtcg-variant-read-model.ts lib/justtcg-store.ts lib/server/market/market-search.ts lib/server/market/market-home.ts lib/server/collection/portfolio-summary.ts lib/server/decks/deck-valuation.ts tests/task4-runtime-pricing.test.ts
git commit -m "feat: use JustTCG variants for runtime pricing"
```

## Task 5: Verify Cutover And Document Operations

**Files:**
- Create: `docs/backend-cutover-justtcg-variants.md`
- Modify: `scripts/import-justtcg-to-drizzle.mjs`
- Modify: `tests/justtcg-variant-import.test.ts`

- [ ] **Step 1: Write the cutover runbook**

Document:
- new schema pieces
- importer flow
- variant-backed backfill command
- incremental `updated_after` refresh command
- DB spot checks
- API spot checks
- how to tell whether a card is correctly unpriced vs broken

- [ ] **Step 2: Add incremental sync support with `updated_after`**

Update the importer so it can:
- request changed JustTCG variants using `updated_after`
- refresh existing variant rows
- refresh active NM current price rows without rerunning a full fuzzy remap

Keep the full backfill path and the incremental refresh path separate and explicit.

- [ ] **Step 3: Add sync-path verification**

Add one test that proves an `updated_after`-style incremental refresh updates an existing variant-backed current price row without requiring a full remap.

Add one negative-path test that proves refreshing a non-Near Mint variant does not overwrite the canonical current Near Mint runtime price.

- [ ] **Step 4: Run final verification**

Run:

```bash
node --experimental-strip-types --test tests/import-justtcg-to-drizzle.test.ts tests/justtcg-variant-import.test.ts tests/justtcg-variant-runtime.test.ts tests/task4-runtime-pricing.test.ts
npx tsc --noEmit
```

Expected:
- all pass

- [ ] **Step 5: Verify database counts and representative samples**

Check:
- total priced/unpriced
- at least 3 base cards
- at least 3 premium/event cards
- at least 2 intentionally unpriced cards

- [ ] **Step 6: Commit**

```bash
git add docs/backend-cutover-justtcg-variants.md scripts/import-justtcg-to-drizzle.mjs tests/justtcg-variant-import.test.ts
git commit -m "docs: add JustTCG variant cutover runbook"
```

## Done Criteria

The migration is done when all of the following are true:

- raw-card runtime pricing reads from approved active JustTCG NM variants
- `card_prints.active_external_variant_id` is populated for priced raw cards
- `card_print_price_current.external_variant_id` is populated for priced raw cards
- market, collection, and deck valuation still return compatible payloads
- cards without exact NM source remain `Unpriced`
- premium/event fixes from earlier work are preserved

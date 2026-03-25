# Card Pricing V1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DevilFruit’s card and pricing backend onto Drizzle/Postgres with strict JustTCG-backed runtime pricing for market, collection, and deck valuation.

**Architecture:** Keep internal game identity and commercial pricing identity separate. Use `card_prints` for raw-card truth, add `sealed_products` for sealed identity, import full JustTCG catalog into `external_products`, and resolve runtime price through one approved active link per collectible. Cut marketplace and collection reads over in stages so the app stays usable while the backend is being replaced.

**Tech Stack:** Next.js 16, React 19, Supabase Auth, Supabase Postgres, Drizzle ORM, TypeScript, existing import scripts

---

## Pre-Flight Notes

- Approved spec: `docs/superpowers/specs/2026-03-25-card-pricing-v1-design.md`
- Worktree branch: `codex/card-pricing-v1`
- Existing baseline check:
  - `npm run validate:cards` passes
  - `npm run lint` currently fails before this project because of an existing error in `lib/gumgum-market-moves.ts`
- Do not mix this work with the doc cleanup changes sitting in the main checkout

## File Map

### New files expected

- `drizzle.config.ts`
- `db/client.ts`
- `db/schema.ts`
- `db/migrations/*`
- `scripts/import-bandai-official-to-drizzle.mjs`
- `scripts/import-justtcg-to-drizzle.mjs`
- `lib/server/pricing/external-products.ts`
- `lib/server/pricing/card-print-prices.ts`
- `lib/server/pricing/sealed-product-prices.ts`
- `lib/server/market/market-home.ts`
- `lib/server/market/market-search.ts`
- `lib/server/collection/portfolio-summary.ts`
- `lib/server/decks/deck-valuation.ts`
- `docs/backend-cutover-card-pricing.md`

### Existing files expected to change

- `package.json`
- `package-lock.json`
- `app/api/market/catalog/route.ts`
- `app/api/market/tcg-price/route.ts`
- `app/api/me/portfolio/route.ts`
- `app/api/me/movers/route.ts`
- `app/api/cards/prices/route.ts`
- `lib/market-catalog.ts`
- `lib/justtcg-store.ts`
- `lib/profile-summary.ts`

### Existing files to inspect while implementing

- `lib/db.ts`
- `app/api/market/route.ts`
- `app/api/market/history/route.ts`
- `components/market/CardDetailMarketPanel.tsx`
- `components/market/MarketCatalogView.tsx`
- `components/profile/*`
- `scripts/fetch-justtcg-catalog.mjs`
- `scripts/import-justtcg-approved-to-supabase.mjs`

## Task 1: Add Drizzle Tooling And Project Plumbing

**Files:**
- Create: `drizzle.config.ts`
- Create: `db/client.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add Drizzle dependencies and scripts**

Update `package.json` with:
- runtime/dev dependencies for `drizzle-orm`, `drizzle-kit`, and `postgres`
- scripts such as:
  - `db:generate`
  - `db:migrate`
  - `db:push`
  - `import:bandai:db`
  - `import:justtcg:db`

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected:
- install succeeds
- `package-lock.json` updates

- [ ] **Step 3: Add Drizzle config**

Create `drizzle.config.ts` that reads `DATABASE_URL` or `SUPABASE_DB_URL`, points schema at `db/schema.ts`, and outputs migrations under `db/migrations`.

- [ ] **Step 4: Add Postgres client wrapper**

Create `db/client.ts` with one server-only Postgres connection factory used by import scripts and future repositories.

- [ ] **Step 5: Verify tooling loads**

Run: `npx drizzle-kit --help`

Expected:
- command exits successfully

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts db/client.ts
git commit -m "chore: add drizzle tooling"
```

## Task 2: Port The Core Catalog And Pricing Schema

**Files:**
- Create: `db/schema.ts`
- Test: `db/schema.ts`

- [ ] **Step 1: Port the approved schema scaffold**

Start from the redesign scaffold in `/tmp/devilfruit-verify-push-91863/db/schema.ts`.

Keep:
- `games`
- `releases`
- `cards`
- `card_prints`
- `external_sources`
- `external_products`
- `price_snapshots`
- import/review tables

- [ ] **Step 2: Replace vague runtime mapping with explicit active-link design**

In `db/schema.ts`:
- keep a candidate/review table for raw cards
- rename or replace `card_print_external_map` with `card_print_market_links`
- add `card_prints.active_external_product_id`

- [ ] **Step 3: Add sealed support**

Add:
- `sealed_products`
- `sealed_product_market_links`
- `sealed_product_price_current`
- `sealed_product_price_history`

- [ ] **Step 4: Add commercial typing**

Add `external_products.product_kind` with values like:
- `raw_card`
- `sealed`
- `graded`
- `other`

- [ ] **Step 5: Verify schema compiles**

Run: `npx tsc --noEmit`

Expected:
- TypeScript passes or only shows pre-existing unrelated issues

- [ ] **Step 6: Generate the initial migration**

Run: `npm run db:generate`

Expected:
- migration files appear under `db/migrations`

- [ ] **Step 7: Commit**

```bash
git add db/schema.ts db/migrations drizzle.config.ts
git commit -m "feat: add card pricing v1 schema"
```

## Task 3: Port Import Scripts For Official Catalog And JustTCG

**Files:**
- Create: `scripts/import-bandai-official-to-drizzle.mjs`
- Create: `scripts/import-justtcg-to-drizzle.mjs`
- Modify: `package.json`

- [ ] **Step 1: Port the Bandai import script**

Copy the redesign script from `/tmp/devilfruit-verify-push-91863/scripts/import-bandai-official-to-drizzle.mjs`.

Adjust it so it targets the repo’s real `data/` folder and `db/schema.ts`.

- [ ] **Step 2: Port the JustTCG import script**

Copy the redesign script from `/tmp/devilfruit-verify-push-91863/scripts/import-justtcg-to-drizzle.mjs`.

Adjust it so it:
- writes into `external_products`
- creates candidate `card_print_market_links`
- materializes `card_print_price_current`
- leaves unmapped products as imported but unused at runtime

- [ ] **Step 3: Extend the JustTCG script for sealed products**

Add logic so `product_kind = sealed` records can:
- populate `sealed_products`
- create `sealed_product_market_links`
- materialize `sealed_product_price_current`

- [ ] **Step 4: Add dry-run entry points**

Ensure both import scripts support:
- dry-run / seed output mode
- apply mode

- [ ] **Step 5: Verify import scripts parse and dry-run**

Run:
- `node scripts/import-bandai-official-to-drizzle.mjs --seed-out /tmp/bandai-seed.json`
- `node scripts/import-justtcg-to-drizzle.mjs --seed-out /tmp/justtcg-seed.json`

Expected:
- both commands succeed
- output files are produced

- [ ] **Step 6: Commit**

```bash
git add scripts/import-bandai-official-to-drizzle.mjs scripts/import-justtcg-to-drizzle.mjs package.json
git commit -m "feat: port drizzle import scripts"
```

## Task 4: Add Server Read Models For Runtime Pricing

**Files:**
- Create: `lib/server/pricing/external-products.ts`
- Create: `lib/server/pricing/card-print-prices.ts`
- Create: `lib/server/pricing/sealed-product-prices.ts`
- Create: `lib/server/market/market-search.ts`
- Create: `lib/server/market/market-home.ts`
- Create: `lib/server/collection/portfolio-summary.ts`
- Create: `lib/server/decks/deck-valuation.ts`

- [ ] **Step 1: Create price lookup modules**

Implement server-only helpers that:
- fetch current raw-card price by `card_print_id`
- fetch current sealed price by `sealed_product_id`
- expose `Unpriced` when no active approved mapping exists

- [ ] **Step 2: Create market-search read model**

Move search behavior away from JSON-plus-cache assumptions.

The new read model should return compact shopping-grid data:
- JustTCG title
- JustTCG image
- official set/name metadata
- current JustTCG price

- [ ] **Step 3: Create market-home read model**

Add functions for:
- top gainers 24h
- top losers 24h
- cards/sealed separation
- trust filters for bad data suppression

- [ ] **Step 4: Create collection summary read model**

Add functions for:
- total collection value
- priced vs unpriced counts
- most valuable items
- current-collection-based chart history using historical snapshots

- [ ] **Step 5: Create deck valuation read model**

Add a helper that totals deck price from `card_print_id` items using active JustTCG links.

- [ ] **Step 6: Add focused tests**

Create tests for:
- unmapped card returns `Unpriced`
- mapped card returns NM USD price
- sealed and raw cards do not mix
- deck valuation ignores unmapped cards while surfacing them as unpriced

- [ ] **Step 7: Commit**

```bash
git add lib/server/pricing lib/server/market lib/server/collection lib/server/decks tests
git commit -m "feat: add pricing read models"
```

## Task 5: Cut Marketplace APIs To The New Read Model

**Files:**
- Modify: `app/api/market/catalog/route.ts`
- Modify: `app/api/market/tcg-price/route.ts`
- Modify: `lib/market-catalog.ts`
- Modify: `lib/justtcg-store.ts`

- [ ] **Step 1: Route market search through Postgres-backed read model**

Update `app/api/market/catalog/route.ts` to use the new market search module instead of JSON plus legacy `justtcg_prices` assumptions.

- [ ] **Step 2: Replace direct `justtcg_*` table assumptions**

Refactor `lib/justtcg-store.ts` so it becomes a compatibility layer over the new tables or remove it from live runtime paths where possible.

- [ ] **Step 3: Keep detail-page depth**

Make sure product detail can still expose:
- current JustTCG price
- price history
- eBay listings / last sales from existing integrations

The card detail page should become “JustTCG commercial card + supporting market intel,” not “internal card + disconnected price blob.”

- [ ] **Step 4: Verify market smoke flow**

Run:
- `npm run smoke:market`

Expected:
- market endpoints return data
- search still works

- [ ] **Step 5: Commit**

```bash
git add app/api/market lib/market-catalog.ts lib/justtcg-store.ts
git commit -m "feat: cut market reads to drizzle pricing model"
```

## Task 6: Cut Collection And Deck Valuation To The New Price Tables

**Files:**
- Modify: `app/api/me/portfolio/route.ts`
- Modify: `app/api/me/movers/route.ts`
- Modify: `app/api/cards/prices/route.ts`
- Modify: `lib/profile-summary.ts`

- [ ] **Step 1: Replace SQLite cache pricing in portfolio**

Update `app/api/me/portfolio/route.ts` so value comes from the new current price tables instead of `price_cache`.

- [ ] **Step 2: Update movers logic**

Update `app/api/me/movers/route.ts` to read trusted 24h changes from Drizzle/Postgres tables instead of old cache/derived assumptions.

- [ ] **Step 3: Update card pricing endpoint**

Update `app/api/cards/prices/route.ts` so it no longer invents placeholder values.

Required behavior:
- approved active link -> return current price
- no approved active link -> return `Unpriced`

- [ ] **Step 4: Update summary code**

Refactor `lib/profile-summary.ts` so collection value uses the new current price source and can report priced/unpriced coverage.

- [ ] **Step 5: Verify collection value flow**

Manually verify:
- priced cards contribute to total
- unmapped cards remain visible and unpriced
- totals do not pretend to include missing prices

- [ ] **Step 6: Commit**

```bash
git add app/api/me app/api/cards/prices/route.ts lib/profile-summary.ts
git commit -m "feat: cut collection valuation to drizzle pricing model"
```

## Task 7: Add Rollout Notes And Verification Checklist

**Files:**
- Create: `docs/backend-cutover-card-pricing.md`

- [ ] **Step 1: Document migration order**

Write down:
- schema migration order
- import order
- cutover order
- rollback points

- [ ] **Step 2: Document manual checks**

Include checks for:
- marketplace search card identity
- top movers trust behavior
- collection totals
- unpriced behavior
- deck valuation
- sealed/raw separation

- [ ] **Step 3: Run final verification**

Run:
- `npm run validate:cards`
- `npm run smoke:market`
- `npm run lint`

Expected:
- validation and market smoke pass
- lint status is clearly reported, including any remaining pre-existing failures

- [ ] **Step 4: Commit**

```bash
git add docs/backend-cutover-card-pricing.md
git commit -m "docs: add card pricing cutover checklist"
```

## Suggested Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7

## Definition Of Done

This slice is done when:
- Drizzle and Postgres are the source of truth for raw-card and sealed pricing
- JustTCG commercial identity is imported and queryable
- runtime pricing requires an approved active link
- marketplace search reads from the new pricing model
- collection value and deck cost read from the new pricing model
- unmapped items are shown as `Unpriced`, never guessed
- the work is committed on `codex/card-pricing-v1`

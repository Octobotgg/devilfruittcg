# DevilFruit TCG — Agent Operating Manual

> Use this file as the main operating context for any LLM working on this project.
> It is intentionally opinionated. Its job is to reduce regressions, scope creep, and accidental edits.
> Last updated: 2026-03-30

---

## Start Here

If context is limited, read these in order:

1. `PROJECT_BRIEF.md`
2. `README.md`
3. `docs/llm-development-workflow.md`
4. this file

Use `PROJECT_MAP.md` only as a navigation/reference file, not as the main source of truth.

---

## Project Root

Historical repo roots:

- `/Users/javierbarro/Projects/devilfruittcg`
- `/Users/javierbarro/Desktop/devilfruittcg`

This project now frequently uses git worktrees.

Current active example:

- `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1`

Rule:

- always confirm the actual working directory before editing
- do not assume the historical repo root is the current working copy

---

## What This Site Is

**DevilFruit TCG** is a One Piece TCG website with these main product areas:

- card browsing and card detail
- market search and published verified pricing
- collection tracking
- deck building and valuation
- meta, matchup, and match-history data
- account/auth for saved user data

The current major backend focus is the pricing system:

- Bandai official card data for card identity
- JustTCG as the runtime candidate pricing source
- TCGplayer as the audit/reference source
- published verified price/display rows as the live website source

The site should only show prices and labels it can trust.

---

## Non-Negotiable Rules

### 1. Verify the working copy first

- confirm the current root directory
- check `git status` before assuming anything
- trust files on disk over conversation memory

### 2. Stay inside scope

- only edit files directly related to the task
- do not mix unrelated outcomes in one branch
- if a task turns into multiple outcomes, split it

### 3. Prefer existing files over new files

- inspect the relevant folder first
- extend an existing component/utility/script if it already fits
- do not create near-duplicate helpers without proving the current folder does not already have the right place

### 4. Never guess with card identity

Card identity must come from the official Bandai English catalog flow:

`data/bandai-en-official-cards.json`
-> `lib/official-cards.ts`
-> `lib/cards.ts`
-> card APIs / UI

Do not invent card fields from memory.

### 5. Never guess with pricing

The live site should read published verified pricing, not raw candidate imports.

The pipeline is:

`JustTCG candidate import -> verification against TCGplayer -> publish verified rows -> live website reads published rows`

If a row is unclear, the correct fallback is `Unpriced`, not a guessed sibling price.

### 6. Shared files are protected

Do **not** edit these without clear need and careful review:

- `app/layout.tsx`
- `app/globals.css`
- `components/Navbar.tsx`
- `components/BrandMark.tsx`
- `components/CardModal.tsx`
- `components/auth/AuthNavButton.tsx`
- `lib/cloud/*`
- shared theme or auth files

### 7. Market changes are high risk

Unless the task is explicitly about Market or pricing, avoid touching:

- `app/market/page.tsx`
- `app/cards/[id]/page.tsx`
- `components/market/*`
- `app/api/market*`
- `lib/market-*`
- `lib/server/pricing/*`

### 8. Keep scratch out of git

Do not commit:

- browser automation state
- temp exports
- scratch JSON reports
- local caches
- one-off debug files

### 9. Verify before claiming success

Before claiming a fix is complete:

- run the relevant tests
- run `npx tsc --noEmit` when TypeScript behavior may be affected
- report what actually passed

---

## Current Architecture

## Card Identity Source Of Truth

Canonical card identity path:

- `data/bandai-en-official-cards.json`
- `lib/official-cards.ts`
- `lib/cards.ts`
- `lib/card-variants.ts`
- `app/api/cards/route.ts`
- `app/api/cards/variants/route.ts`
- `app/api/cards/special-prints/route.ts`
- `app/api/card-image/route.ts`

Use these for card identity, variant shape, and official card metadata.

## Pricing Source Of Truth

Current pricing/storage backbone:

- `db/schema.ts`
- `db/postgres.ts`
- `db/client.ts`

Current pricing runtime files:

- `lib/server/pricing/pricing-verifier.ts`
- `lib/server/pricing/pricing-publisher.ts`
- `lib/server/pricing/published-card-prices.ts`
- `lib/server/pricing/justtcg-variant-read-model.ts`
- `lib/server/pricing/external-products.ts`
- `lib/server/pricing/card-print-prices.ts`

Current market/runtime readers:

- `lib/server/market/market-search.ts`
- `lib/server/market/market-home.ts`
- `lib/justtcg-store.ts`
- `components/market/MarketCatalogView.tsx`
- `components/market/CardDetailMarketPanel.tsx`
- `lib/market-display.ts`
- `lib/market-detail-pricing.ts`

Important rule:

- live UI should read published verified prices and published display labels
- failed refreshes should not wipe live prices

## Scripts That Matter Right Now

Primary pricing pipeline scripts:

- `scripts/import-bandai-official-to-drizzle.mjs`
- `scripts/import-justtcg-to-drizzle.mjs`
- `scripts/run-pricing-verification.mjs`
- `scripts/publish-verified-prices.mjs`
- `scripts/bootstrap-published-pricing.mjs`
- `scripts/report-pricing-verification.mjs`
- `scripts/apply-targeted-justtcg-report.mjs`

Useful supporting scripts:

- `scripts/report-suspicious-justtcg-mappings.mjs`
- `scripts/review-suspicious-premium-mappings.mjs`
- `scripts/verify-missing-justtcg-set.mjs`
- `scripts/smoke-market.cjs`
- `scripts/validate-cards.cjs`

## User State / Auth

Primary auth/runtime state files:

- `app/login/page.tsx`
- `app/account/page.tsx`
- `app/auth/callback/page.tsx`
- `components/auth/AuthNavButton.tsx`
- `lib/cloud/useCloudSync.ts`
- `lib/cloud/supabase.ts`
- `lib/cloud/firebase.ts`
- `lib/cloud/pending-auth-action.ts`
- `lib/cloud/auth-redirect.ts`
- `lib/cloud/types.ts`

---

## Current Commands

Useful scripts from `package.json`:

```bash
npm run dev
npm run validate:cards
npm run validate:featured
npm run import:bandai:db
npm run import:justtcg:db
npm run verify:pricing
npm run publish:pricing
npm run bootstrap:pricing
npm run report:pricing
npm run report:justtcg:suspicious
npm run review:justtcg:premium
npm run smoke:market
```

For pricing work, read this runbook:

- `docs/backend-pricing-verifier-runbook.md`

For branch/repo hygiene, read this guide:

- `docs/llm-development-workflow.md`

---

## Low-Trust Or Reference-Only Files

These can be useful, but they are not the main runtime source of truth:

- `CLEANUP_REPORT.md`
- `PROJECT_AUDIT.md`
- `PROJECT_MAP.md`
- `reports/*`
- `.cache/*`
- generated exports or local automation folders

If a historical doc disagrees with current code, trust the current code.

---

## Default Working Style For LLMs

- work in one clear branch/worktree per outcome
- keep changes scoped
- use subagents only when ownership is clearly separable
- let one integrator own final verification, commit, and push
- prefer small, reviewable steps inside the branch
- expect squash merge to `main`

If the branch starts telling more than one story, stop and split it.

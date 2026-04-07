# DevilFruit TCG — Agent Operating Manual

> Use this file as the first context block for any LLM working on this project.
> It is intentionally opinionated. Its job is to reduce regressions, scope creep, and accidental edits.
> Last updated: 2026-03-09

---

## PROJECT ROOT

Desktop handoff copy root:

`/Users/javierbarro/Desktop/devilfruittcg`

Primary working repo path historically used during development:

`/Users/javierbarro/Projects/devilfruittcg`

If an LLM is working in a different directory, it should confirm that before making changes.

Use the directory the LLM is actually running in as the active project root. The paths above are reference roots, not assumptions to force onto the current session.

---

## WHAT THIS SITE IS

**DevilFruit TCG** is a fan-made One Piece Trading Card Game website with these main feature areas:

- Card browsing and card detail
- Market search and live pricing
- Collection tracking
- Deck building and saved decks
- Competitive data: meta snapshot, matchup matrix, match history
- Account/auth for saved user data

---

## NON-NEGOTIABLE RULES

These rules exist because this project has previously been broken by cross-page edits and wrong deploy snapshots.

### 0. Verify the working copy first

- Confirm the current root directory before editing.
- Check the current file tree and `git status` before assuming anything.
- Do not trust prior conversation memory over the files currently on disk.

### 1. Stay inside the requested scope

- Only edit files directly related to the user’s request.
- If the request is about one page, do not modify other pages.
- Do not change unrelated layouts, copy, theme, nav, spacing, auth flows, or shared UI unless the user explicitly asks.

### 1A. Before you create a new file, prove an existing one does not already fit

- Check the relevant folder first.
- Look for an existing component, utility, route, or hook before adding a new one.
- Prefer extending an existing file over creating a near-duplicate.
- Do not create a new card, market, auth, or UI helper without first checking the current folder inventory.

### 2. Shared files are protected

Do **not** edit these without explicit approval:

- `app/layout.tsx`
- `app/globals.css`
- `components/Navbar.tsx`
- `components/BrandMark.tsx`
- `components/CardModal.tsx`
- `components/auth/AuthNavButton.tsx`
- `lib/cloud/*`
- `lib/theme/*`
- Any shared auth/cloud or theme file used across multiple pages

If a fix appears to require one of those files, stop and ask first.

### 3. Never guess with card data

Card data must come from the official Bandai catalog path described below.

- Do not invent card fields.
- Do not backfill missing card data from memory.
- Do not revive legacy set modules as a runtime source.

### 4. Market area is high-risk

The Market feature has repeatedly been a regression hotspot. Unless the task is explicitly about Market, do not touch:

- `app/market/page.tsx`
- `app/cards/[id]/page.tsx`
- `components/market/*`
- `app/api/market*`
- `lib/market-*`

### 5. Historical docs and reports are reference-only

- `CLEANUP_REPORT.md`, `PROJECT_AUDIT.md`, `PROJECT_MAP.md`, and `DevilFruitTCG_Project_Map.xlsx` are support documents, not runtime instructions.
- `reports/*` contains audit artifacts and generated exports, not page code.
- If a historical doc mentions a file that is missing from the current tree, assume the doc is stale until verified.

### 6. Deploy discipline is mandatory

- Do not deploy from a dirty workspace unless the deploy file set is explicitly reviewed.
- Do not assume `HEAD` is the right baseline.
- Prefer building from a clean, intentional snapshot.
- Verify impacted routes before deploy.

### 7. Preserve design language unless asked

- Keep the current site’s visual system intact.
- No “cleanup,” “refactor,” or redesign unless explicitly requested.
- Keep typography, spacing, nav structure, and content tone stable.

---

## STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript (strict mode) | ^5 |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation | Framer Motion | ^12.34.3 |
| Charts | Recharts | ^3.7.0 |
| Icons | Lucide React | ^0.575.0 |
| Auth (real users) | Supabase | ^2.98.0 |
| Auth (anonymous / legacy support) | Firebase | ^12.10.0 |
| DB (local dev/support) | better-sqlite3 | ^12.6.2 |
| Deployment | Vercel | production deploys |

Path alias:

`@/*` maps to project root

Example:

`import { Card } from "@/lib/cards"`

---

## SOURCE OF TRUTH

### Card data

This is the canonical runtime path for card data:

`data/bandai-en-official-cards.json`
-> `lib/official-cards.ts`
-> `lib/cards.ts`
-> `app/api/cards/route.ts` and related APIs
-> UI pages/components

Use these for runtime card work:

- `lib/official-cards.ts`
- `lib/cards.ts`
- `lib/card-variants.ts`
- `app/api/cards/route.ts`
- `app/api/cards/variants/route.ts`
- `app/api/cards/special-prints/route.ts`
- `app/api/card-image/route.ts`

### Market runtime

Primary Market runtime files:

- `app/market/page.tsx`
- `app/cards/[id]/page.tsx`
- `components/market/MarketCatalogView.tsx`
- `components/market/CardDetailMarketPanel.tsx`
- `components/market/BackToMarketButton.tsx`
- `app/api/market/route.ts`
- `app/api/market/catalog/route.ts`
- `app/api/market/history/route.ts`
- `app/api/market/watch/route.ts`
- `app/api/market-movers/route.ts`
- `lib/market-catalog.ts`
- `lib/market-navigation.ts`
- `lib/market-types.ts`
- `lib/ebay.ts`

### Deck system runtime

Primary deck/builder runtime files:

- `app/deckbuilder/page.tsx`
- `app/decks/page.tsx`
- `lib/deck-validation.ts`
- `lib/deck-playtest.ts`
- `app/api/cards/prices/route.ts`

These files also depend on the card data pipeline above (`lib/official-cards.ts`, `lib/cards.ts`, `lib/card-variants.ts`).

### Auth/runtime state

Primary auth/runtime files:

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

## KNOWN LOW-TRUST OR SUPPORT-ONLY FILES

These are useful for audits, exports, and maintenance, but they are not the default runtime implementation path.

### Historical docs and maps

- `CLEANUP_REPORT.md`
- `PROJECT_AUDIT.md`
- `PROJECT_MAP.md`
- `DevilFruitTCG_Project_Map.xlsx`

### Support or historical datasets

- `data/bandai-en-official-releases.json`
- `reports/bandai-en-base-cards.json`
- `reports/current-site-cards-pre-fix.json`
- `reports/bandai-audit-pre-fix.json`
- `reports/bandai-audit-post-fix.json`
- `reports/bandai-audit-pre-fix.md`
- `reports/bandai-audit-post-fix.md`

### Maintenance-only scripts

- `scripts/*`

### Important note

- This Desktop copy does not contain the older per-set `lib/op*` or `lib/st*` card modules sometimes mentioned in historical discussion.
- Do not treat references in docs or reports as proof that a file still exists or is active.

### Noise/artifact files

- `.cache/*`
- `test-results/*`
- `tsconfig.tsbuildinfo`

---

## DIRECTORY OWNERSHIP

### `app/`

User-facing routes:

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Homepage |
| `/market` | `app/market/page.tsx` | Market browse/search |
| `/cards/[id]` | `app/cards/[id]/page.tsx` | Card detail |
| `/collection` | `app/collection/page.tsx` | Collection tracker |
| `/deckbuilder` | `app/deckbuilder/page.tsx` | Deck Builder |
| `/decks` | `app/decks/page.tsx` | Saved decks |
| `/meta` | `app/meta/page.tsx` | Meta snapshot |
| `/matchups` | `app/matchups/page.tsx` | Matchup matrix |
| `/account` | `app/account/page.tsx` | Account page |
| `/login` | `app/login/page.tsx` | Login page |
| `/auth/callback` | `app/auth/callback/page.tsx` | Auth callback |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Terms |

API routes:

- Card APIs live under `app/api/cards/*`, `app/api/card-image/route.ts`, and `app/api/leaders/route.ts`
- Market APIs live under `app/api/market*`
- Competitive APIs live under `app/api/meta*`, `app/api/matchups*`, and `app/api/matchhistory*`
- User/account APIs live under `app/api/me/*` and `app/api/ebay/account-deletion/route.ts`

### API route inventory

Use this list before building a new endpoint.

Card data:

- `app/api/cards/route.ts`
- `app/api/cards/variants/route.ts`
- `app/api/cards/special-prints/route.ts`
- `app/api/card-image/route.ts`
- `app/api/leaders/route.ts`

Market:

- `app/api/market/route.ts`
- `app/api/market/catalog/route.ts`
- `app/api/market/history/route.ts`
- `app/api/market/watch/route.ts`
- `app/api/market-movers/route.ts`
- `app/api/market-movers/refresh/route.ts`

Meta / matchup / match history:

- `app/api/meta/route.ts`
- `app/api/meta/deck/route.ts`
- `app/api/matchups/route.ts`
- `app/api/matchups/headtohead/route.ts`
- `app/api/matchhistory/ingest/route.ts`
- `app/api/matchhistory/matches/route.ts`
- `app/api/matchhistory/player-stats/route.ts`
- `app/api/matchhistory/search/route.ts`
- `app/api/matchhistory/summary/route.ts`

User/account:

- `app/api/me/holdings/route.ts`
- `app/api/me/holdings/[holdingId]/route.ts`
- `app/api/me/transactions/route.ts`
- `app/api/me/watchlist/route.ts`
- `app/api/me/portfolio/route.ts`
- `app/api/me/movers/route.ts`
- `app/api/ebay/account-deletion/route.ts`

### `components/`

- `Navbar.tsx` is shared across the site and protected
- `BrandMark.tsx` is shared branding and protected
- `CardModal.tsx` is cross-page shared card UI and should be treated as protected unless the task explicitly targets modal behavior
- `components/market/*` is Market-only
- `components/ui/*` contains reusable primitives

Reusable UI primitives already present:

- `components/ui/DonButton.tsx` = branded action button
- `components/ui/TiltCard.tsx` = stylized tilted showcase card
- `components/ui/DashboardCard.tsx` = reusable dashboard/panel shell
- `components/ui/GlowTag.tsx` = glowing tag or chip
- `components/ui/LeaderColorTag.tsx` = leader color badge
- `components/ui/LiveStatusStrip.tsx` = live/status strip element
- `components/ui/TickerRow.tsx` = scrolling ticker-style row

Before adding a new component, check `components/`, `components/ui/`, `components/market/`, and `components/auth/` first.

### `lib/`

- `official-cards.ts` is the authoritative server-side card data layer
- `cards.ts` is the main card typing/base-search compatibility layer
- `card-feed.ts` is a wrapper layer
- `card-variants.ts` handles variant classification
- `lib/cloud/*` drives auth/sync behavior across the site
- `lib/theme/*` drives dynamic styling behavior

### `data/`

This is support and source data, not page code.

Runtime-critical:

- `data/bandai-en-official-cards.json`

Support-only:

- `data/bandai-en-official-releases.json`

### `reports/`

Audit exports and historical snapshots live here. They are not runtime inputs for page rendering.

- `reports/bandai-en-base-cards.json`
- `reports/current-site-cards-pre-fix.json`
- `reports/bandai-audit-*.json`
- `reports/bandai-audit-*.md`

### `docs/`, `hooks/`, `types/`, `tests/`

These folders currently exist as placeholders with `.gitkeep` files in this Desktop copy.

- `docs/` = documentation area
- `hooks/` = future shared React hooks
- `types/` = future shared TS types
- `tests/` = future tests

Do not assume they are wired into runtime yet.

Update:

- `docs/` is no longer placeholder-only. It now includes `docs/card-catalog-update-runbook.md` documenting the current official card catalog update flow and bottlenecks.
- `docs/collection-infra-notes.md` documents the current collection public-profile/trade/share-image gaps and the suggested schema path for those future features.

---

## LIVE COLLECTION SYSTEM STATUS

This section captures the currently implemented collection features that are live in `/collection`.

### Collection Command Center (`/collection`)

Primary runtime file:

- `app/collection/page.tsx`

Primary data/runtime dependencies:

- `app/api/cards/route.ts`
- `app/api/cards/prices/route.ts`
- `app/api/market/history/route.ts`
- `app/api/me/watchlist/route.ts`
- `lib/cards.ts`
- `lib/official-cards.ts`
- `lib/db.ts`
- `lib/cloud/useCloudSync.ts`
- `lib/cloud/pending-auth-action.ts`
- `lib/cloud/types.ts`

Current `/collection` behavior:

- The page is now a tabbed collection command center, not a simple browse-only page.
- It keeps the existing card browse and pricing behavior, then layers collection management on top.
- It uses a client-side tab system for:
  - browse
  - set completion
  - portfolio
  - wishlist
  - cards needed
  - quick add and tools
- It uses `Suspense` because the page reads `useSearchParams()` for URL-synced filters.

### Browse, filters, and sorting

Current runtime behavior:

- Browse filters are live for:
  - set / booster
  - color
  - card type
  - rarity / special print
  - cost
  - power
  - counter
  - attribute
  - price range
  - ownership status
- Set filtering includes a local set-search input inside the filter panel.
- Filter state is written to the URL query string so filtered views are shareable/bookmarkable.
- Mobile filters use a bottom-sheet style drawer.
- Browse results are paginated in-page rather than rendering the entire catalog at once.
- Sort modes include:
  - card number
  - price high to low
  - price low to high
  - name A-Z
  - name Z-A
  - rarity
  - recently added

### Ownership, quantities, conditions, and wishlist

Current runtime behavior:

- Collection quantities are stored in the existing collection store loaded through `lib/cloud/useCloudSync.ts`.
- Browse cards show owned quantity with `+` / `-` controls.
- Quantity changes are saved optimistically via the existing collection save flow.
- Condition labels are supported in the UI with:
  - `NM`
  - `LP`
  - `MP`
  - `HP`
  - `DMG`
- Condition labels are currently local UI state persisted in local storage, not a new backend table.
- Wishlist uses the authenticated `app/api/me/watchlist/route.ts` API.
- Trade markers are currently local-only and persist in local storage.
- If a user is not logged in and cloud auth is active, ownership-changing actions route through the pending-auth flow in `lib/cloud/pending-auth-action.ts`.

### Set completion

Current runtime behavior:

- `/collection` has a dedicated set completion view.
- Completion is based on unique numbered set slots rather than raw print count.
- The set view shows:
  - set cards/tiles
  - owned vs total numbered slots
  - completion percent
  - estimated value per set
- Set detail includes a numbered heatmap/grid with owned vs missing states.
- Hover/focus preview for a heatmap slot shows a thumbnail and card identity.

### Portfolio / value tracking

Current runtime behavior:

- Collection pricing uses `app/api/cards/prices/route.ts`.
- Historical price series use `app/api/market/history/route.ts`.
- The portfolio view currently shows:
  - total collection value
  - total cards owned
  - unique cards owned
  - 24H / 7D / 30D value-change cards
  - 7D / 30D / 90D / 1Y collection value chart
  - top gainers
  - top losers
  - value by set
  - value by rarity
  - value by color
- Historical charting intentionally samples the first `40` owned card IDs for performance.
- If historical pricing is sparse, older points can look flatter or approximate.

### Cards needed / deck cross-reference

Current runtime behavior:

- `/collection` cross-references the user’s saved decks loaded from the existing deck store via `lib/cloud/useCloudSync.ts`.
- It shows a `Cards Needed` view listing missing quantities by deck.
- It can copy a shopping-style text list of missing cards to the clipboard.

### Quick add, import/export, and activity

Current runtime behavior:

- Browse has a `Quick Add` mode for rapid quantity increments.
- Bulk text import supports lines like:
  - `4x OP01-025`
  - `1 ST01-001`
- CSV import/export is live from the collection tools view.
- `/collection` also has a recent activity feed based on recently added cards.

### Modal / card detail behavior in collection

Important note:

- `/collection` currently reuses the shared `components/CardModal.tsx` card modal for card details.
- The collection page does **not** currently have a fully custom collection-only detail modal with embedded portfolio/deck-usage controls.
- Treat `components/CardModal.tsx` as protected unless the task explicitly targets shared modal behavior.

### Public/social collection features

Current status:

- Public collection profiles are **not** fully wired yet.
- Public trade binder URLs are **not** fully wired yet.
- Collection comparison is **not** fully wired yet.
- Shareable collection stats image export is **not** fully wired yet.

Why:

- The repo does not yet have full public username + collection privacy infrastructure for those features.
- See `docs/collection-infra-notes.md` before attempting those systems.

---

## LIVE DECK SYSTEM STATUS

This section captures the currently implemented deck features that are live or actively used in the runtime app.

### Deck Lab (`/deckbuilder`)

Primary runtime file:

- `app/deckbuilder/page.tsx`

Current Deck Lab behavior:

- Main deck count is `deck.cards.reduce(...)` only. Leader is counted separately.
- Validation UI treats legal deck construction as:
  - exactly `1` Leader
  - exactly `50` main deck cards
  - DON!! deck treated as a fixed runtime size of `10`
- The builder has a live format validation panel and a playtest/test-hand flow.
- The builder includes:
  - deck sorting modes
  - manual drag reorder
  - tech slots
  - DON curve
  - counter curve
  - type split
  - color split
  - average power by cost
  - total deck price

Important supporting files:

- `lib/deck-validation.ts`
- `lib/deck-playtest.ts`
- `app/api/cards/prices/route.ts`

### Variant / art behavior in Deck Lab

Variant/image behavior is live in the builder and is intentionally cosmetic unless otherwise stated.

Key files:

- `lib/card-variants.ts`
- `lib/official-cards.ts`
- `lib/use-preferred-special-prints.ts`
- `app/api/cards/variants/route.ts`
- `app/api/cards/special-prints/route.ts`
- `app/api/card-image/route.ts`

Current behavior:

- The builder has a global `Alt Art View` toggle.
- `Alt Art View` only swaps to explicitly recognized `alt_art` variants when available.
- If a card has no recognized alt art, it falls back to the base/regular art.
- The builder also has a per-card official variant picker/gallery so users can choose a cosmetic print for a card already in the deck.
- Art choice does not change deck legality or card counts.
- The builder stores manual art overrides in local storage, keyed per deck.

Important data-model note:

- The runtime card source of truth is still `data/bandai-en-official-cards.json`.
- Raw official data has print/variant relationships used by `lib/card-variants.ts` and `lib/official-cards.ts`.
- Pricing is not native in the raw official JSON.
- Alt-art detection should be treated as helper-driven/runtime-derived behavior, not assumed to be a guaranteed raw JSON field on every card.

### Visual Stack in Deck Lab

The builder’s deck list / `Visual Stack` is implemented inline inside:

- `app/deckbuilder/page.tsx`

Important behavior already implemented:

- Desktop and mobile row layouts are separate in the same page file.
- Desktop `Visual Stack` rows were tightened for readability and still preserve:
  - drag handle
  - quantity controls
  - art picker button
  - tech-slot button
  - remove button
- Clicking the card thumbnail in `Visual Stack` opens a builder-local image lightbox/modal.
- The image lightbox is image-only and supports:
  - backdrop click to close
  - `Escape` to close
  - arrow-key navigation
  - mobile swipe navigation
  - body scroll lock while open

Important note:

- There is already a shared cross-page modal at `components/CardModal.tsx`, but Deck Lab currently uses its own page-local image lightbox rather than reusing the shared modal, because the shared modal includes stats/actions/variant UI.

### Crew Hangar (`/decks`)

Primary runtime file:

- `app/decks/page.tsx`

Current behavior:

- Crew Hangar is the saved-decks overview/archive page.
- `Battle Ready` logic on this page must use:
  - leader present
  - exactly `50` main deck cards
- Crew Hangar card totals must exclude the leader from the `Cards` count.
- The `Battle Ready` summary metric at the top of `/decks` is also based on main-deck count plus leader presence.

Important note:

- A regression previously counted the leader inside the `/decks` card total, producing `51/50`. This has already been fixed in `app/decks/page.tsx`.

### Pricing behavior

Pricing in the builder currently comes from:

- `app/api/cards/prices/route.ts`

Current behavior:

- Deck total pricing is shown in Deck Lab.
- Pricing uses cached market pricing when available.
- If pricing is missing, placeholder/mock estimates are returned so the UI stays populated.
- Do not assume pricing exists as a native field on the canonical card JSON.

### Official format validation

Validation rules are implemented in:

- `lib/deck-validation.ts`

Current runtime behavior:

- Supports `standard` and `extra` formats.
- Standard currently enforces official block-based legality using `blockIcon`.
- Validation includes:
  - leader count
  - main deck count
  - copy limits
  - color match against leader
  - banned cards
  - paired bans
  - block legality

Related card typing support:

- `lib/cards.ts` includes `blockIcon` support used by validation.

### Playtest / Test Hand

Playtest simulation is implemented client-side and currently uses:

- `lib/deck-playtest.ts`
- `app/deckbuilder/page.tsx`

Current runtime behavior:

- `Test Hand` is enabled only for legal decks.
- Opening hand is `5` cards.
- Includes mulligan, draw, reset, remaining deck count, life area, and turn-order-aware DON progression.
- No server calls are required for the simulation itself.

### Card image behavior

Key file:

- `app/api/card-image/route.ts`

Current runtime behavior:

- Builder card art uses the proxied card image route.
- The image route has stronger fallback behavior for official card images.
- Deck builder card images intentionally bypass Next image optimization via `unoptimized` in the local image wrapper to avoid blank-card regressions seen with the optimizer path.

### Catalog maintenance and build notes

Relevant files:

- `scripts/fetch-bandai-official-en.mjs`
- `scripts/validate-cards.cjs`
- `scripts/validate-featured-cards.cjs`
- `docs/card-catalog-update-runbook.md`

Important notes:

- Official English catalog refresh is script-driven and still operationally manual.
- New set speed is currently constrained more by update workflow discipline than by missing runtime support.
- `npm run build` runs card validation and featured-card validation before the Next build.
- `scripts/validate-featured-cards.cjs` now validates against the canonical official JSON dataset rather than deleted legacy set modules.

---

## ENVIRONMENT VARIABLES

```bash
# eBay API
# Used for pricing / market data
EBAY_APP_ID
EBAY_CERT_ID
EBAY_ENV
EBAY_MARKETPLACE_ID

# TCGPlayer API
# Optional card pricing/provider integration
TCGPLAYER_API_KEY
TCGPLAYER_API_SECRET

# Cloud provider: "supabase" or "firebase" (empty = disabled)
# Selects which user/session backend the client uses
NEXT_PUBLIC_CLOUD_PROVIDER

# Supabase
# Real user accounts and synced user data
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

# Firebase
# Anonymous / legacy session support
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Feature flags
# Competitive-data behavior toggles
MATCH_INTEL_V2=true|false
```

If auth or pricing is acting strange, missing env vars are one of the first things to verify.

---

## THEMING RULES

The site is dark-themed and uses CSS variables from `app/globals.css`.

Important tokens:

- `--bg-base`
- `--panel-bg`
- `--text-primary`
- `--text-muted`
- `--theme-accent`
- `--playmat-noise`
- `--playmat-map`

Leader-color theme logic lives in:

- `lib/theme/leader-theme.ts`
- `lib/theme/color-utils.ts`

Do not change shared theme tokens during a page-specific task without approval.

---

## SAFE WORKFLOW FOR FUTURE LLMs

### Before any change

1. Confirm the exact route or feature being changed.
2. List the exact files needed for that change.
3. Separate page-local files from shared/protected files.
4. If any protected file appears necessary, stop and ask first.
5. Check `git status` so unrelated changes do not leak into the work or deploy.
6. Check whether an existing component, route, or utility already solves most of the task before creating a new file.

### If the task is page-specific

1. Identify the route.
2. List the exact page-specific files involved.
3. Avoid shared files unless explicitly approved.
4. Verify only the affected page and any directly touched APIs/components.

### If the task is about card data

1. Use the official Bandai path only.
2. Update or read through `lib/official-cards.ts` and related APIs.
3. Do not substitute support snapshots or report exports for runtime data.

### If the task is about Market

1. Stay inside Market files.
2. Preserve current Market layout/flow unless the task explicitly changes it.
3. Verify search, results, detail view, and pricing behavior.

### If the task seems to require shared files

Stop and ask before editing:

- `app/layout.tsx`
- `app/globals.css`
- `components/Navbar.tsx`
- `components/BrandMark.tsx`
- `components/auth/AuthNavButton.tsx`
- `components/CardModal.tsx`
- `lib/cloud/*`
- `lib/theme/*`

### If deploying

1. Build locally first.
2. Verify impacted pages locally.
3. Deploy only the reviewed snapshot.
4. Do not bundle unrelated local changes.

---

## COMMANDS

```bash
npm run dev              # Start local dev server
npm run build            # Production build (runs validation first)
npm run fetch:bandai     # Pull fresh card data from Bandai's website
npm run audit:bandai     # Check card data integrity, generate reports
npm run validate:cards   # Quick card ID/field validation
npm run validate:featured # Check homepage featured cards exist in database
npm run smoke:market     # Smoke test market API endpoints
```

---

## CURRENT KNOWN RISKS

1. Firebase and Supabase still coexist, so auth behavior can be harder to reason about than a single-provider setup.
2. The project contains support docs, audit exports, and historical snapshots that are easy to mistake as active runtime sources.
3. Shared shell files can cause site-wide regressions if edited during page-local work.
4. The Market area and auth shell are both high-blast-radius areas.
5. The placeholder folders `docs/`, `hooks/`, `types/`, and `tests/` exist, but they are not proof of implemented systems.

---

## FAST DEFAULTS

If an LLM only remembers five things, it should remember these:

1. `data/bandai-en-official-cards.json` is the card source of truth.
2. Do not touch shared shell files without approval.
3. Do not use `reports/*` or historical docs as runtime truth.
4. Do not touch Market files unless the task is explicitly about Market.
5. Deploy only from a clean, reviewed snapshot.

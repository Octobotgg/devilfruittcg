# PROJECT MAP

Root Directory: `/Users/javierbarro/Projects/devilfruittcg`

Notes:
- This map expands the project-authored tree plus small metadata/generated folders.
- `node_modules/`, `.git/`, and `.next/` are listed but intentionally collapsed; they are still included in the zip export.
- Descriptions call out obvious entry points, support files, and probable legacy/orphaned files.

## Tree
```text
devilfruittcg/ - Website project root.
|-- .cache/ - Local cache and SQLite state generated during development.
|   |-- devilfruit.db - devilfruit.db project file.
|   |-- devilfruit.db-shm - devilfruit.db-shm project file.
|   `-- devilfruit.db-wal - devilfruit.db-wal project file.
|-- .env.local.example - Example environment-variable file for local setup.
|-- .force-redeploy - Sentinel file used to trigger or track forced deploys.
|-- .git/ - Git history and repository metadata (collapsed in this map, included in the zip).
|-- .gitignore - Git ignore rules for generated and local-only files.
|-- .next/ - Next.js build output (collapsed in this map, included in the zip if present).
|-- .octo-project-root - Workspace marker used by local tooling.
|-- .vercel/ - Local Vercel project-link metadata.
|   |-- project.json - Vercel project/org linkage for CLI deploys.
|   `-- README.txt - Vercel-generated explanation of the local project-link folder.
|-- app/ - Next.js App Router pages, layouts, icons, and API endpoints.
|   |-- account/ - Account page route folder.
|   |   `-- page.tsx - Account-center page for signed-in and signed-out account states.
|   |-- api/ - Server-side API route handlers.
|   |   |-- card-image/ - API route folder for Card Image.
|   |   |   `-- route.ts - API route handler for /api/card-image.
|   |   |-- cards/ - Card-search API endpoints and variant helpers.
|   |   |   |-- route.ts - API route handler for /api/cards.
|   |   |   |-- special-prints/ - API route folder for Cards Special Prints.
|   |   |   |   `-- route.ts - API route handler for /api/cards/special-prints.
|   |   |   `-- variants/ - API route folder for Cards Variants.
|   |   |       `-- route.ts - API route handler for /api/cards/variants.
|   |   |-- ebay/ - eBay-related API endpoints.
|   |   |   `-- account-deletion/ - API route folder for Ebay Account Deletion.
|   |   |       `-- route.ts - API route handler for /api/ebay/account-deletion.
|   |   |-- leaders/ - Leader-card API route folder.
|   |   |   `-- route.ts - API route handler for /api/leaders.
|   |   |-- market/ - Market data API routes.
|   |   |   |-- catalog/ - API route folder for Market Catalog.
|   |   |   |   `-- route.ts - API route handler for /api/market/catalog.
|   |   |   |-- history/ - API route folder for Market History.
|   |   |   |   `-- route.ts - API route handler for /api/market/history.
|   |   |   |-- route.ts - API route handler for /api/market.
|   |   |   `-- watch/ - API route folder for Market Watch.
|   |   |       `-- route.ts - API route handler for /api/market/watch.
|   |   |-- market-movers/ - Market-mover API routes.
|   |   |   |-- refresh/ - API route folder for Market Movers Refresh.
|   |   |   |   `-- route.ts - API route handler for /api/market-movers/refresh.
|   |   |   `-- route.ts - API route handler for /api/market-movers.
|   |   |-- matchhistory/ - Match-history ingestion and query APIs.
|   |   |   |-- ingest/ - API route folder for Matchhistory Ingest.
|   |   |   |   `-- route.ts - API route handler for /api/matchhistory/ingest.
|   |   |   |-- matches/ - API route folder for Matchhistory Matches.
|   |   |   |   `-- route.ts - API route handler for /api/matchhistory/matches.
|   |   |   |-- player-stats/ - API route folder for Matchhistory Player Stats.
|   |   |   |   `-- route.ts - API route handler for /api/matchhistory/player-stats.
|   |   |   |-- search/ - API route folder for Matchhistory Search.
|   |   |   |   `-- route.ts - API route handler for /api/matchhistory/search.
|   |   |   `-- summary/ - API route folder for Matchhistory Summary.
|   |   |       `-- route.ts - API route handler for /api/matchhistory/summary.
|   |   |-- matchups/ - Matchup matrix API routes.
|   |   |   |-- headtohead/ - API route folder for Matchups Headtohead.
|   |   |   |   `-- route.ts - API route handler for /api/matchups/headtohead.
|   |   |   `-- route.ts - API route handler for /api/matchups.
|   |   |-- me/ - User/account-scoped portfolio and holdings APIs.
|   |   |   |-- holdings/ - API route folder for Me Holdings.
|   |   |   |   |-- [holdingId]/ - API route folder for Me Holdings [HoldingId].
|   |   |   |   |   `-- route.ts - API route handler for /api/me/holdings/[holdingId].
|   |   |   |   `-- route.ts - API route handler for /api/me/holdings.
|   |   |   |-- movers/ - API route folder for Me Movers.
|   |   |   |   `-- route.ts - API route handler for /api/me/movers.
|   |   |   |-- portfolio/ - API route folder for Me Portfolio.
|   |   |   |   `-- route.ts - API route handler for /api/me/portfolio.
|   |   |   |-- transactions/ - API route folder for Me Transactions.
|   |   |   |   `-- route.ts - API route handler for /api/me/transactions.
|   |   |   `-- watchlist/ - API route folder for Me Watchlist.
|   |   |       `-- route.ts - API route handler for /api/me/watchlist.
|   |   `-- meta/ - Meta-report API routes.
|   |       |-- deck/ - API route folder for Meta Deck.
|   |       |   `-- route.ts - API route handler for /api/meta/deck.
|   |       `-- route.ts - API route handler for /api/meta.
|   |-- auth/ - Authentication callback route folder.
|   |   `-- callback/ - Route folder for /auth/callback.
|   |       `-- page.tsx - Auth callback page that finishes provider sign-in flows.
|   |-- cards/ - Dynamic card-detail route folder.
|   |   `-- [id]/ - Dynamic route segment for an individual card page.
|   |       `-- page.tsx - Individual card-detail page used by Market deep links.
|   |-- collection/ - Collection tracker page route folder.
|   |   `-- page.tsx - Collection tracker page for browsing and managing owned cards.
|   |-- deckbuilder/ - Deck Builder page route folder.
|   |   `-- page.tsx - Deck Builder page for building and saving decks.
|   |-- decks/ - Saved decks page route folder.
|   |   `-- page.tsx - Saved deck archive page.
|   |-- favicon.ico - Browser favicon asset.
|   |-- globals.css - Global styles, theme tokens, background art hooks, and shared utility classes.
|   |-- icon.svg - App icon asset served by Next.js.
|   |-- layout.tsx - Root App Router layout that wires the navbar, main shell, and footer.
|   |-- login/ - Login page route folder.
|   |   `-- page.tsx - Login and account-creation page.
|   |   `-- page.tsx - Experimental logo showcase page.
|   |-- market/ - Market browse/search page route folder.
|   |   `-- page.tsx - Market browse/search page and main catalog surface.
|   |   `-- page.tsx - Match-history search and player history page.
|   |-- matchups/ - Matchup matrix page route folder.
|   |   `-- page.tsx - Matchup matrix page for deck-vs-deck performance.
|   |-- meta/ - Meta snapshot page route folder.
|   |   `-- page.tsx - Meta snapshot and tournament meta page.
|   |-- page.tsx - Homepage entry page for the site.
|   |-- privacy/ - Privacy policy page route folder.
|   |   `-- page.tsx - Privacy policy page.
|   |-- terms/ - Terms page route folder.
|   |   `-- page.tsx - Terms of service page.
|       `-- page.tsx - Experimental theme playground page.
|-- components/ - Shared React components used by pages and layouts.
|   |-- auth/ - Authentication-related UI components.
|   |   |-- AuthNavButton.tsx - Current navbar auth/account button used by the site shell.
|   |   `-- CloudAuthButton.tsx - Legacy cloud-sync auth button; no inbound runtime references were found.
|   |-- BrandMark.tsx - Reusable DEVILFRUIT TCG brand lockup component.
|   |-- CardModal.tsx - Shared modal for rendering card details in-page.
|   |-- market/ - Market-specific UI components.
|   |   |-- BackToMarketButton.tsx - Reusable back-navigation button for Market card views.
|   |   |-- CardDetailMarketPanel.tsx - Card pricing/detail panel used in Market card views.
|   |   `-- MarketCatalogView.tsx - Market results/catalog component for search and browsing.
|   |-- Navbar.tsx - Global site navigation component.
|   `-- ui/ - Reusable presentational UI primitives.
|       |-- DashboardCard.tsx - Reusable dashboard-style card container.
|       |-- DonButton.tsx - Reusable branded call-to-action button.
|       |-- GlowTag.tsx - Reusable glowing tag/badge component.
|       |-- LeaderColorTag.tsx - Badge for leader color identity.
|       |-- LiveStatusStrip.tsx - Live-data/status strip UI component.
|       |-- TickerRow.tsx - Ticker-style row component for compact stat displays.
|       |-- TiltCard.tsx - Tilt/parallax card wrapper for premium card presentation.
|       `-- WantedPosterCard.tsx - Unused poster-style card component; no inbound runtime references were found.
|-- data/ - Canonical data exports, snapshots, and audit inputs.
|   |-- bandai-en-base-cards.json - Derived base-card snapshot generated from the official Bandai export; support/audit data, not the primary runtime source.
|   |-- bandai-en-official-cards.json - Primary official Bandai English print catalog used by runtime card APIs.
|   |-- bandai-en-official-releases.json - Official Bandai English release inventory used for audit/support workflows.
|   `-- current-site-cards-pre-fix.json - Snapshot of site card data captured before the Bandai audit fix.
|-- eslint.config.mjs - ESLint configuration for the project.
|-- lib/ - Application logic, utilities, data layers, and legacy card modules.
|   |-- .cards.ts.swp - Editor swap file left in the repo; probable orphan/noise artifact.
|   |-- abuse-protection.ts - Helpers for request-abuse/rate-protection logic.
|   |-- analytics/ - Analytics-domain types, transforms, and repository access.
|   |   |-- index.ts - Barrel export for analytics helpers.
|   |   |-- match-history.ts - Match-history analytics helpers.
|   |   |-- repository.ts - Analytics repository/data-access helpers.
|   |   |-- transform.ts - Transforms raw analytics data into site-facing view models.
|   |   `-- types.ts - Analytics-domain TypeScript types.
|   |-- card-feed.ts - Server-side card feed wrapper that exposes the official catalog through a compatibility layer.
|   |-- card-variants.ts - Variant, parallel, manga, and special-print classification helpers.
|   |-- cards.ts - Central card type definitions plus base-card search helpers backed by the official catalog.
|   |-- cloud/ - Cloud auth/sync providers and account state helpers.
|   |   |-- auth-redirect.ts - Auth redirect URL helpers.
|   |   |-- firebase.ts - Firebase configuration and helpers for cloud sync.
|   |   |-- index.ts - Barrel export for cloud-sync helpers.
|   |   |-- normalize.ts - Normalizers for cloud/user data shapes.
|   |   |-- pending-auth-action.ts - Helpers for deferring an action until after login.
|   |   |-- supabase.ts - Supabase client and auth helpers.
|   |   |-- types.ts - Type definitions for cloud-synced collections, decks, and user state.
|   |   `-- useCloudSync.ts - Main React hook for auth, collection sync, and deck sync state.
|   |-- config/ - Feature flags and configuration helpers.
|   |   `-- flags.ts - Feature-flag definitions and runtime flag helpers.
|   |-- data/ - Curated data fixtures for pages like Meta.
|   |   `-- meta.ts - Meta data fixtures and loaders used by the Meta page.
|   |-- db.ts - SQLite/database access helpers.
|   |-- deck-names.ts - Deck naming/preset label helpers.
|   |-- eb01-cards.ts - Legacy extra-booster seed data for EB01; appears superseded by the official Bandai catalog.
|   |-- eb02-cards.ts - Legacy extra-booster seed data for EB02; appears superseded by the official Bandai catalog.
|   |-- ebay.ts - eBay marketplace integration and pricing helpers.
|   |-- featured-cards.ts - Curated featured-card lists used by the homepage/market experience.
|   |-- gumgum-market-moves.ts - Helpers for GumGum-style market-mover data.
|   |-- market-catalog.ts - Market catalog query and shaping logic.
|   |-- market-navigation.ts - Market navigation state and link-building helpers.
|   |-- market-types.ts - Type definitions for market/catalog data.
|   |-- matchups.ts - Matchup data helpers and types.
|   |-- meta-decks.ts - Meta-deck curation and deck snapshot helpers.
|   |-- motion/ - Animation standards and motion constants.
|   |   `-- standards.ts - Animation timing and motion standards.
|   |-- official-cards.ts - Strict server-side access layer around the official Bandai catalog.
|   |-- op01-cards.ts - Legacy per-set seed data for OP01; appears superseded by the official Bandai catalog.
|   |-- op02-cards.ts - Legacy per-set seed data for OP02; appears superseded by the official Bandai catalog.
|   |-- op03-cards.ts - Legacy per-set seed data for OP03; appears superseded by the official Bandai catalog.
|   |-- op04-cards.ts - Legacy per-set seed data for OP04; appears superseded by the official Bandai catalog.
|   |-- op05-cards.ts - Legacy per-set seed data for OP05; appears superseded by the official Bandai catalog.
|   |-- op06-cards.ts - Legacy per-set seed data for OP06; appears superseded by the official Bandai catalog.
|   |-- op07-cards.ts - Legacy per-set seed data for OP07; appears superseded by the official Bandai catalog.
|   |-- op08-cards.ts - Legacy per-set seed data for OP08; appears superseded by the official Bandai catalog.
|   |-- op09-cards.ts - Legacy per-set seed data for OP09; appears superseded by the official Bandai catalog.
|   |-- op10-cards.ts - Legacy per-set seed data for OP10; appears superseded by the official Bandai catalog.
|   |-- op11-cards.ts - Legacy per-set seed data for OP11; appears superseded by the official Bandai catalog.
|   |-- op12-cards.ts - Legacy per-set seed data for OP12; appears superseded by the official Bandai catalog.
|   |-- op13-cards.ts - Legacy per-set seed data for OP13; appears superseded by the official Bandai catalog.
|   |-- op14-cards.ts - Legacy per-set seed data for OP14; appears superseded by the official Bandai catalog.
|   |-- sources/ - External data-source adapters and scraping bridges.
|   |   |-- external-snapshot-bridge.ts - Bridge for importing external snapshot data into local formats.
|   |   |-- gumgum-matchups.ts - External-source adapter for Gumgum Matchups; no live imports were found.
|   |   |-- gumgum.ts - External-source adapter for Gumgum; no live imports were found.
|   |   |-- limitless-matchups.ts - Adapter for matchup data from the Limitless source.
|   |   |-- limitless.ts - External-source adapter for Limitless; no live imports were found.
|   |   |-- optcg-sim.ts - External-source adapter for Optcg Sim; no live imports were found.
|   |   `-- tournaments.ts - External-source adapter for Tournaments; no live imports were found.
|   |-- st01-cards.ts - Legacy starter-deck seed data for ST01; appears superseded by the official Bandai catalog.
|   |-- st02-cards.ts - Legacy starter-deck seed data for ST02; appears superseded by the official Bandai catalog.
|   |-- st03-cards.ts - Legacy starter-deck seed data for ST03; appears superseded by the official Bandai catalog.
|   |-- st04-cards.ts - Legacy starter-deck seed data for ST04; appears superseded by the official Bandai catalog.
|   |-- st05-cards.ts - Legacy starter-deck seed data for ST05; appears superseded by the official Bandai catalog.
|   |-- st06-cards.ts - Legacy starter-deck seed data for ST06; appears superseded by the official Bandai catalog.
|   |-- st07-cards.ts - Legacy starter-deck seed data for ST07; appears superseded by the official Bandai catalog.
|   |-- st08-cards.ts - Legacy starter-deck seed data for ST08; appears superseded by the official Bandai catalog.
|   |-- st09-cards.ts - Legacy starter-deck seed data for ST09; appears superseded by the official Bandai catalog.
|   |-- st10-cards.ts - Legacy starter-deck seed data for ST10; appears superseded by the official Bandai catalog.
|   |-- st11-cards.ts - Legacy starter-deck seed data for ST11; appears superseded by the official Bandai catalog.
|   |-- st12-cards.ts - Legacy starter-deck seed data for ST12; appears superseded by the official Bandai catalog.
|   |-- st13-cards.ts - Legacy starter-deck seed data for ST13; appears superseded by the official Bandai catalog.
|   |-- st14-cards.ts - Legacy starter-deck seed data for ST14; appears superseded by the official Bandai catalog.
|   |-- st15-cards.ts - Legacy starter-deck seed data for ST15; appears superseded by the official Bandai catalog.
|   |-- st16-cards.ts - Legacy starter-deck seed data for ST16; appears superseded by the official Bandai catalog.
|   |-- st17-cards.ts - Legacy starter-deck seed data for ST17; appears superseded by the official Bandai catalog.
|   |-- st18-cards.ts - Legacy starter-deck seed data for ST18; appears superseded by the official Bandai catalog.
|   |-- st19-cards.ts - Legacy starter-deck seed data for ST19; appears superseded by the official Bandai catalog.
|   |-- st20-cards.ts - Legacy starter-deck seed data for ST20; appears superseded by the official Bandai catalog.
|   |-- st21-cards.ts - Legacy starter-deck seed data for ST21; appears superseded by the official Bandai catalog.
|   |-- starter-decks.ts - Library helper module starter-decks.
|   |-- theme/ - Theme/color helpers tied to leader color identity.
|   |   |-- color-utils.ts - Color parsing and color-theme helpers.
|   |   `-- leader-theme.ts - Leader-color-driven theme state helpers.
|   |-- use-preferred-special-prints.ts - Hook that resolves preferred special-print card IDs.
|   `-- user-context.ts - Helpers for deriving current-user request context.
|-- next-env.d.ts - Next.js TypeScript environment definitions.
|-- next.config.ts - Next.js runtime/build configuration.
|-- node_modules/ - Installed npm dependencies (collapsed in this map, included in the zip).
|-- package-lock.json - Exact npm dependency lockfile.
|-- package.json - Package manifest with scripts and dependencies.
|-- postcss.config.mjs - PostCSS configuration for the styling pipeline.
|-- public/ - Static assets served directly by Next.js.
|   |-- file.svg - Default placeholder SVG from the Next starter template; appears unused.
|   |-- globe.svg - Default globe SVG from the Next starter template; appears unused.
|   |-- images/ - Branding and art assets used by CSS or experimental pages.
|   |   |-- devilfruit-emblem.svg - Older emblem/logo asset; no live references were found.
|   |   |-- grandline-map.svg - Background map asset referenced by global CSS.
|   |   |-- logo-wordmark.svg - Standalone wordmark asset; no live references were found.
|   |   |-- manga-bg.svg - Manga-style background texture referenced by global CSS.
|   |   `-- straw-hat.png - Unused Straw Hat image asset; no live references were found.
|   |-- next.svg - Default Next.js logo asset; appears unused.
|   |-- vercel.svg - Default Vercel logo asset; appears unused.
|   `-- window.svg - Default starter-template window SVG; appears unused.
|-- README.md - Human-readable project overview and setup notes.
|-- reports/ - Generated audit reports and report artifacts.
|   |-- bandai-audit-post-fix.json - Machine-readable post-fix audit artifact.
|   |-- bandai-audit-post-fix.md - Human-readable post-fix Bandai audit report.
|   |-- bandai-audit-pre-fix.json - Machine-readable pre-fix audit artifact.
|   `-- bandai-audit-pre-fix.md - Human-readable pre-fix Bandai audit report.
|-- scripts/ - Project maintenance, ingest, validation, and smoke-test scripts.
|   |-- audit-bandai-en.mjs - Audit script that compares site cards against the official Bandai English catalog.
|   |-- ensure-canonical.sh - Shell helper to enforce canonical project state.
|   |-- fetch-bandai-official-en.mjs - Fetch/import script for the official Bandai English card catalog.
|   |-- fetch-card-data.mjs - Older card-data fetch/import script.
|   |-- parse-cards.js - Legacy card parsing script.
|   |-- smoke-market.cjs - Smoke-test script for Market endpoints.
|   |-- validate-cards.cjs - Validation script for card dataset consistency.
|   `-- validate-featured-cards.cjs - Validation script for curated featured-card entries.
|-- test-results/ - Generated test/smoke output artifacts.
|   `-- .last-run.json - Generated metadata from the last test run.
|-- tsconfig.json - TypeScript compiler configuration.
`-- tsconfig.tsbuildinfo - Incremental TypeScript build cache file.
```

## Suspected Duplicates
- `data/bandai-en-official-cards.json` + `lib/official-cards.ts` + `lib/cards.ts` vs `lib/op01-cards.ts` ... `lib/op14-cards.ts`, `lib/st01-cards.ts` ... `lib/st21-cards.ts`, `lib/eb01-cards.ts`, `lib/eb02-cards.ts`, and `lib/starter-decks.ts`: the consolidated official Bandai catalog is the current source of truth; the per-set modules look like an older seed-data layer and appear unused.
- `components/auth/AuthNavButton.tsx` vs `components/auth/CloudAuthButton.tsx`: both solve navbar/account-entry UX; `AuthNavButton.tsx` is the current one because it is imported by `components/Navbar.tsx`, while `CloudAuthButton.tsx` has no inbound references.
- `lib/official-cards.ts` vs `lib/card-feed.ts`: both expose card-feed style access to the catalog; `lib/official-cards.ts` is the authoritative low-level dataset layer, while `lib/card-feed.ts` looks like a compatibility wrapper built on top of it.
- `data/bandai-en-official-cards.json` vs `data/bandai-en-base-cards.json` vs `data/current-site-cards-pre-fix.json`: these are related card snapshots with overlapping content; `bandai-en-official-cards.json` is the most current full-print catalog, `bandai-en-base-cards.json` is a derived base-card subset, and `current-site-cards-pre-fix.json` is a historical pre-fix snapshot.

## Orphaned Files
Active by convention or reference:
- All `app/**/page.tsx` and `app/**/route.ts` files are active route/API entry points.
- `components/Navbar.tsx`, `components/BrandMark.tsx`, `components/CardModal.tsx`, the `components/market/*` files, and most `lib/cloud/*`, `lib/market-*`, `lib/official-cards.ts`, `lib/cards.ts`, and `lib/theme/*` files are actively imported by those entry points.
- `scripts/*`, `reports/*`, and some `data/*` files are support/maintenance assets rather than live runtime files.

Probable orphaned or unused files (no inbound runtime references found during static scan):
- `components/auth/CloudAuthButton.tsx`
- `components/ui/WantedPosterCard.tsx`
- `lib/.cards.ts.swp`
- `lib/eb01-cards.ts`, `lib/eb02-cards.ts`, `lib/op01-cards.ts` ... `lib/op14-cards.ts`, `lib/st01-cards.ts` ... `lib/st21-cards.ts`, and `lib/starter-decks.ts`
- `lib/sources/gumgum.ts`, `lib/sources/gumgum-matchups.ts`, `lib/sources/limitless.ts`, `lib/sources/optcg-sim.ts`, and `lib/sources/tournaments.ts`
- `public/file.svg`, `public/globe.svg`, `public/images/devilfruit-emblem.svg`, `public/images/logo-wordmark.svg`, `public/images/straw-hat.png`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg`

Support-only but intentionally retained (not orphaned runtime files):
- `data/bandai-en-base-cards.json`, `data/bandai-en-official-releases.json`, and `data/current-site-cards-pre-fix.json`
- Everything under `reports/` and `scripts/`
- `.cache/*`, `.vercel/*`, `test-results/.last-run.json`, and `tsconfig.tsbuildinfo`

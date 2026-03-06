# EN Variant Normalization Roadmap

## Scope constraints (confirmed)
- English cards only (no JP work in this rollout)
- Non-graded listings only
- Canonical rarity/variant labels:
  - Core rarities: `C`, `UC`, `R`, `SR`, `SEC`
  - Premium variants: `Alt Art`, `SP`, `Manga`, `Red Manga`, `Gold Manga`, `Anniversary`

---

## Phase 1 (foundation) — ✅ in progress

### Goals
- Introduce canonical variant taxonomy and IDs without breaking legacy `_p*` storage.
- Stop showing `_p1/_p2` style distinctions in user-facing card selection surfaces.

### Implemented
- Added `lib/card-variants.ts`:
  - derives `baseCardId`, `variantType`, `variantLabel`, `variantOrder`
  - emits canonical IDs like `OP01-120::manga_red.print1`
- Extended `Card` model with variant metadata fields.
- Variant metadata attached in card feed loading (`loadCards`).
- `/api/cards` and `/api/cards/variants` now return normalized variant metadata (EN-focused).
- Market card picker now displays variant labels (e.g., `SEC`, `Alt Art`, `SP`) instead of `_p*` style hints.

### Notes
- Legacy IDs remain intact internally for image/compatibility safety during migration.

---

## Phase 2 (pricing precision) — ✅ started
- Built variant-specific eBay query templates from canonical variant metadata.
- EN-only strict matching with non-graded filtering.
- Added hard variant signal matching to reduce cross-variant contamination.
- Added query template visibility in market payload (`ebay.queryTemplate`) for QA.

### Implemented in this pass
- `lib/ebay.ts` now:
  - derives variant template (`base/alt_art/sp/manga/manga_red/manga_gold/anniversary`)
  - builds variant-specific eBay query string with exclusion terms
  - applies strict title-level variant filters before pricing aggregation
  - excludes graded + non-EN listings
- `app/api/market/route.ts` now passes variant metadata into pricing fetch for template selection.

## Phase 2B (audit + QA) — ✅ started
- Added full-run audit tool: `scripts/audit-variant-pricing.cjs`
  - Crawls EN cards and evaluates variant pricing output from `/api/market`
  - Flags issues (`mock_source`, `low_sales`, `low_confidence`, `variant_label_mismatch`, etc.)
  - Writes resumable state + JSON report under `.cache/phase2b/`

Run:
```bash
npm run audit:variant-pricing -- --base https://devilfruittcg.gg --maxCards 300 --concurrency 3 --delayMs 250 --resume
```

## Phase 3 (migration cleanup)
- Migrate user-facing references to canonical variant IDs/labels everywhere.
- Keep compatibility adapter for legacy `_p*` data during transition window.

## Phase 4 (future / deferred)
- Graded listing support toggle and separate analytics lane.
- Optional JP lane (explicitly out of current scope).

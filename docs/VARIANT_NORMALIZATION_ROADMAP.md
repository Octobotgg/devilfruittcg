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

## Phase 2 (pricing precision) — next
- Build variant-specific eBay query templates from canonical variant metadata.
- Tighten EN-only sold listing matching and remove cross-variant contamination.
- Add per-variant confidence + sample count.

## Phase 3 (migration cleanup)
- Migrate user-facing references to canonical variant IDs/labels everywhere.
- Keep compatibility adapter for legacy `_p*` data during transition window.

## Phase 4 (future / deferred)
- Graded listing support toggle and separate analytics lane.
- Optional JP lane (explicitly out of current scope).

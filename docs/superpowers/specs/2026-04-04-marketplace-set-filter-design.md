# Marketplace Set Filter Design

**Scope:** Marketplace filter UI for `Card Set / Booster`

**Goal:** Keep the set filter familiar for users who already know TCGplayer, but remove the noisy, overlong, internal-looking flat checklist.

## Problem

The current marketplace filter renders a raw set facet list directly from catalog data:

- too many set options appear at once
- promo and event lanes overwhelm the filter
- some labels feel too database-like or dash-heavy
- the UI makes browsing harder than it needs to be

This hurts both new users who want broad categories and experienced users who already know exact set codes like `OP15`, `EB03`, or `OP14`.

## Product Direction

The new filter should feel familiar to TCGplayer users, but cleaner:

- keep the same overall mental model of a marketplace set filter
- keep exact set filtering under the hood
- group the visible options into broader product families first
- let search surface exact sets when the user knows what they want
- avoid showing the full raw set list by default

## UX Rules

### Default structure

The `Card Set / Booster` section should show:

- a search field at the top
- grouped set families underneath

Recommended groups:

- `Popular Sets`
- `Boosters`
- `Starter Decks`
- `Promos`

### Search behavior

- searching `OP15`, `EB03`, `OP14`, or a release name should surface exact matching sets
- specific promo sets should appear in search results even if they are hidden inside the default `Promos` grouping
- search should match both visible labels and exact set codes

### Promo handling

- promos should be grouped together by default in the filter UI
- this is a presentation rule only, not a data model change
- selecting a promo result should still apply the existing exact set filter value

### Familiarity

- keep the filter interaction recognizable to TCGplayer users
- do not copy TCGplayer's giant ungrouped raw set list
- preserve the current filter semantics so existing URLs and selections continue to work

## UI Direction

- keep the current marketplace visual theme
- make the set filter feel lighter and more organized
- emphasize hierarchy over quantity
- exact set codes should still be easy to scan
- raw internal-looking labels should be cleaned up before display

## Technical Direction

### Data model

Do not replace the existing set facet data model.

Instead:

- continue filtering by exact set code values
- enrich facet options with lightweight grouping metadata at render time or from the server
- keep current query params such as repeated `set=` values compatible

### Facet grouping

Each set facet should resolve to a display group:

- booster-family sets
- starter deck sets
- promo/event sets
- optionally a `Popular Sets` group derived from a small curated list

`Popular Sets` should be presentation-only and map back to the same exact underlying set codes.

### Labels

- use cleaner market-facing set labels in the filter
- avoid raw slug formatting where possible
- keep codes like `OP15`, `EB03`, and `ST10` when they help recognition
- event/promo labels may stay more descriptive, but should not dominate the default view

## Interaction Notes

- users can still multi-select exact sets
- the filter should support selecting from grouped lists and from search results
- searching should narrow the visible list across all groups instead of requiring the user to open each group manually
- if a search is active, matching exact sets may be shown in a flatter "search results" view for speed

## Edge Cases

- if a set does not map cleanly to a group, place it in the closest exact family rather than inventing a new top-level group
- if promo/event data is unusually messy, keep it inside `Promos` unless the user searches for it
- if a selected set becomes hidden by grouping, it must still render as selected and remain removable from active filters

## Implementation Notes

- start in the existing marketplace components and keep the current URL/filter plumbing intact
- prefer small helper functions for:
  - set family classification
  - popular set detection
  - filter search matching
- keep grouping logic separate from presentation so it can be tested directly
- avoid introducing a new backend dependency for phase 1 unless the current facet payload makes grouping too awkward on the client

## Testing

Add focused coverage for:

- exact set search by code and label
- grouping into `Popular Sets`, `Boosters`, `Starter Decks`, and `Promos`
- selected values staying stable through grouping and search
- legacy set query params continuing to work
- promo sets remaining hidden by default but visible through search

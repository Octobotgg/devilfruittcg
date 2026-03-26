# Market Catalog Labels Design

**Scope:** Market page only

**Goal:** Clean the market catalog so cards show trustworthy, player-facing treatment labels instead of raw internal slugs, vague fallback chips, or messy source wording.

## Problem

The current market catalog leaks internal data formatting into the UI:

- raw underscore set slugs appear in cards and filters
- generic labels like `Parallel` show up where users expect a specific treatment
- some premium variants are hidden even when the treatment is meaningful
- copy on the market page sounds tool-like instead of product-like

This makes the market feel messy even when the underlying data is mostly correct.

## Product Rules

### Set labels

- Never show raw underscore slugs like `CHAMPIONSHIP_25_26_FINALS_SEASON_1`
- Prefer clean market-facing set labels
- If a set has a compact recognizable code like `OP09`, keep the code only in facet/filter labels, not on the card tile
- Card tiles should show the readable set/release name only

### Variant/treatment chips

- Keep the rarity badge and the treatment chip as separate pieces of information
- Show a treatment chip only when the treatment is meaningful and confidently known
- Preferred source: JustTCG-style treatment wording, cleaned for display
- If the exact treatment is not confidently known, hide the chip

### Display behavior

Show chips for meaningful premium treatments such as:

- `Alternate Art`
- `SP`
- `Manga`
- `Red Manga`
- `Gold Manga`
- `Anniversary`
- `Full Art`
- `Jolly Roger Foil`
- `Treasure Rare`

Hide vague or low-signal fallback labels such as:

- `Parallel`
- `Base`
- `Special Print`
- generic messy source labels that do not clearly describe the treatment

### Consistency

The same cleaned treatment label rules should apply in:

- market grid tiles
- market list rows
- market search suggestions

## UI Direction

- Keep the deployed market page structure and overall visual direction
- Tighten copy and label hygiene without redesigning the page
- Make card tiles feel like clean storefront objects, not database rows

## Implementation Notes

- Put label-cleaning rules in a small shared formatter module
- Keep formatting logic separate from the React component so it can be tested directly
- Update the server-side set facet label generation so filters stop showing sluggy values
- Add focused tests for set formatting and treatment chip visibility rules

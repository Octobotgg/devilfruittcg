# Deck Builder Overview Layout Design

Date: 2026-04-09

## Goal
Tighten the top deck builder overview without losing any information. The section should feel like a compact dashboard instead of a second hero.

## Layout Direction
Use a leader-first summary layout.

### Top Row
- Large `Leader Overview` card on the left as the visual anchor.
- Compact summary cards on the right for:
  - `Deck Value`
  - `Deck Size`
  - `Status`

### Second Row
- `DON Curve`
- `Counter Curve`

### Third Row
- `Type Split`
- `Color Split`
- `Average Power by Cost`

## UX Rules
- Keep the same information currently shown at the top.
- Remove unnecessary supporting copy and oversized whitespace.
- Keep charts readable at their current general size.
- Make `Deck Value` clearly visible but not visually dominant over the leader.
- Preserve `Captain's Tech Board` and `Visual Stack` in the lower working area.

## Visual Hierarchy
- Leader card is the anchor.
- Value and status are supporting information.
- Charts and split cards are analytical support underneath.
- Spacing should be tighter and more dashboard-like.

## Non-Goals
- No new data.
- No changes to deck builder logic.
- No changes to lower editing workflows beyond layout separation.

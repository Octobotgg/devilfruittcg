# Price History Chart Design

**Scope:** Card detail market panel price history chart

**Goal:** Make the card price history chart trustworthy, clear, and useful by showing only exact-print history, using clean range controls, and handling sparse data honestly.

## Problem

The current card detail price chart has three overlapping issues:

- some prints have sparse or inconsistent history, so the chart looks broken or empty
- the current UX does not make it obvious when history is unavailable versus when data is simply still loading
- the overall presentation is weaker than it should be for a pricing feature where trust matters

For a card market, the chart cannot trade accuracy for visual fullness. If the history is incomplete, the UI should say so clearly instead of inventing a better-looking chart.

## Product Direction

The new chart should behave like a serious marketplace chart:

- use exact-print history only
- never borrow or merge history from the base card or another print
- use familiar range controls
- show a chart only when the selected range has enough real points
- fall back to a deliberate unavailable state when history is sparse

This keeps the chart honest and makes the market feel more credible.

## Source Of Truth

The chart should use the exact JustTCG variant already mapped to the exact print.

Current repo context:

- [CardDetailMarketPanel.tsx](/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/CardDetailMarketPanel.tsx) already renders the card detail chart
- [justtcg-store.ts](/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/justtcg-store.ts) already exposes JustTCG history arrays like `priceHistory`, `priceHistory30d`, and `priceHistory90d`

The history model should remain:

- exact print
- exact mapped JustTCG product/variant
- exact provider history only

No family fallback, no base-card fallback, no synthetic backfill.

## UX Rules

### Range controls

The chart should use fixed tabs similar to TCGplayer:

- `1M`
- `3M`
- `6M`
- `1Y`

Default selected range:

- `3M`

### Healthy history state

If the selected range has at least `2` usable points:

- show the line chart
- show current price above the chart
- show a subtle freshness note when useful
- keep interactions simple and legible

### Sparse history state

If the selected range has fewer than `2` usable points:

- do not render a fake one-point line chart
- show a clear unavailable state instead
- include:
  - current price
  - last updated time
  - short explanation that exact-print history is not available yet

### Stale data state

If enough points exist but the provider update is old:

- still show the chart
- add a small freshness note
- do not block the chart if the data is real but older

### Empty state copy

The empty state should feel intentional, not broken.

Recommended direction:

- headline: `Not enough exact-print history yet`
- support text: explain that the chart only uses history for this exact print, and more points will appear as new pricing updates arrive

## Data Rules

Before charting, exact-print history should be normalized:

- keep only points with valid timestamps and numeric prices
- sort points ascending by time
- deduplicate duplicate timestamps
- filter points to the selected range
- do not blend arrays from different prints

The chart should use the already-loaded JustTCG points where possible instead of refetching per tab change.

## UI Direction

The chart should feel cleaner and more premium than it does now.

### Header

The chart header should emphasize:

- current price
- selected range
- freshness context

### Visual style

- keep the chart restrained
- prioritize readability over decoration
- use a clear line with enough contrast against the surface
- keep tooltip formatting tight and price-first
- avoid noisy gradients or extra chrome

### Axis and labeling

- y-axis should show currency cleanly
- x-axis should be sparse and readable
- tooltip should show exact date and price
- tabular numbers are preferred for price values

## Technical Direction

### Component changes

Primary file:

- [CardDetailMarketPanel.tsx](/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/CardDetailMarketPanel.tsx)

Responsibilities:

- range tab state
- chart state selection
- sparse/stale/history-available rendering
- chart tooltip and summary presentation

### Data helper

Add a focused helper for price-history shaping, likely:

- `lib/market-history.ts`

Responsibilities:

- normalize raw provider points
- slice points by `1M / 3M / 6M / 1Y`
- detect whether a range has enough usable points
- expose freshness helpers

This keeps chart logic out of the component and makes it easier to test.

### Store behavior

Review [justtcg-store.ts](/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/justtcg-store.ts) to make sure:

- exact-print history arrays are returned consistently
- the preferred history source is stable
- sparse arrays do not get misread as full history

## Non-Goals

This redesign should not:

- merge history from related cards
- invent synthetic history points
- change provider pricing logic
- redesign the entire card detail page

## Rollout Strategy

### Phase 1

Ship the behavioral fix:

- exact-print-only history
- TCGplayer-style range tabs
- honest sparse/unavailable state
- cleaner freshness messaging

### Phase 2

Then polish the presentation if needed:

- finer visual tuning
- tooltip polish
- animation polish

Behavior correctness comes first.

## Testing

Add focused coverage for:

- exact-print history normalization
- range filtering for `1M / 3M / 6M / 1Y`
- sparse history detection
- stale data note behavior
- no-chart rendering when fewer than `2` points exist
- chart rendering when enough points exist
- guarantee that no base-card or sibling-print history is merged in

## Success Criteria

We should consider this successful when:

- charts only show exact-print history
- sparse cards display an intentional unavailable state instead of a misleading chart
- cards with healthy history feel clean and readable
- the chart behavior is easy to trust

# Quota-Aware Pricing Refresh Design

Date: 2026-04-03
Branch: `codex/card-pricing-v1`
Status: Draft for review

## Goal

Keep DevilFruit card prices fresh automatically without blowing the JustTCG quota.

The refresh system should:

- update the cards that matter most first
- stay within the monthly request budget
- auto-publish verified rows safely
- avoid full-catalog refreshes
- leave the current live published layer untouched when a run fails

## Problem

The current pricing flow works, but it is still operator-driven:

1. refresh JustTCG candidate data
2. run verification
3. publish verified rows

That is safe, but it is not automated.

The main constraint is JustTCG quota:

- practical monthly budget is the limiting factor
- a full refresh does not fit inside the budget
- the site needs freshness on the cards people care about, not equal treatment for every row every day

At the same time, the site already has useful signals we can reuse:

- latest set codes we know are important
- a manual watchlist
- live meta leader data
- community decklist data that can tell us which non-leader cards are actually showing up in current decks

## What We Want

For phase 1, the site should automatically refresh prices on a schedule using a strict priority order:

1. manual watchlist
2. latest important sets
3. cards used in current meta decks
4. stale cards from the long tail

The scheduler should spend quota where freshness matters most and still slowly improve the rest of the catalog over time.

## Constraints

### Operational constraints

- JustTCG requests are quota-limited
- the pricing pipeline must continue to use the current staged -> verify -> publish model
- failed refreshes must not wipe the published layer
- the scheduler must be observable and easy to rerun manually

### Product constraints

- latest important sets should be prioritized, starting with:
  - `OP15`
  - `EB03`
  - `OP14`
- cards in active meta decks should be prioritized
- first-party search and page-view demand signals do not exist yet, so phase 1 cannot depend on them

### Data constraints

- the repo already supports incremental JustTCG imports with `--updated-after`
- the site already has meta leader and matchup data
- the site already has a GumGum-backed decklist route that can produce card usage for current decks

## Approaches Considered

### 1. Full refresh on a schedule

Fetch the full JustTCG catalog every day or every other day.

Pros:

- simple mental model

Cons:

- does not fit quota
- wastes requests on low-value stable cards

Not recommended.

### 2. Changed-cards-only incremental refresh

Only refresh cards that JustTCG reports as changed since the last successful run.

Pros:

- efficient
- low request volume

Cons:

- does not let DevilFruit choose its own priorities
- can miss important cards if provider-side change timing does not match site demand

Useful as an implementation primitive, but not enough as the whole policy.

### 3. Quota-aware hybrid scheduler

Use a fixed per-run budget, spend it on hot cards first, then spend the remainder on stale rows from the long tail.

Pros:

- aligns refresh cost with product value
- keeps important cards fresh
- still improves low-priority coverage over time
- fits the staged verify/publish pipeline already in the repo

Cons:

- needs queue-building logic and scheduler bookkeeping

Recommended.

## Recommended Design

Run a GitHub Actions pricing refresh job every other day.

Each run:

1. builds a hot queue
2. builds a rolling stale queue
3. enforces a hard budget cap
4. refreshes hot cards first
5. uses leftover budget on the rolling queue
6. verifies changed rows
7. auto-publishes verified rows

If quota gets tight or a dependency fails, the run should degrade safely instead of trying to be clever.

## Scheduling

Recommended phase 1 schedule:

- GitHub Actions
- every other day
- plus manual `workflow_dispatch`

Why GitHub Actions:

- easy secret management
- visible logs and artifacts
- easy reruns
- consistent with the repo's existing scheduled ops pattern

## Budget Policy

The scheduler should be designed against the monthly limit, not the optimistic daily ceiling.

Recommended phase 1 behavior:

- target a conservative per-run cap instead of spending the theoretical maximum
- leave buffer for:
  - manual recoveries
  - new set drops
  - emergency reruns

Recommended policy:

- each scheduled run gets a hard request budget cap
- if the run gets close to the cap:
  - finish the hot queue
  - skip the rolling queue
  - continue through verification and publish for whatever changed successfully

The job summary should always show:

- configured cap
- requests used
- requests remaining in the run budget

## Data Sources

### Hot queue sources

Phase 1 hot queue should be built from:

- `data/pricing-watchlist.json`
- cards in the latest 3 priority sets
- cards used in current meta decks

### Meta signals

Phase 1 should reuse existing repo capabilities:

- leader/meta ranking data already exposed through the competitive insights flow
- community decklist card usage already available through the GumGum-backed meta deck route

This is better than using a third-party "most searched cards" site because:

- it reflects cards actually being played
- it already exists in the repo
- it avoids depending on a search-popularity source we do not control

### Rolling queue source

The non-hot queue should come from current site data:

- stale rows first
- extra weight for missing-price rows

This keeps the tail moving without wasting too much quota on random refreshes.

## Phase 1 Config

Add a repo-managed config file:

- `data/pricing-watchlist.json`

It should contain:

- `prioritySetCodes`
- `manualCardPrintIds`
- `manualCardIds`
- `meta`
  - default format(s)
  - region
  - deck count / list count
  - minimum usage threshold
- `budget`
  - hard cap per run
  - hot-tier reserve
  - rolling-tier reserve
  - stop threshold

This keeps phase 1 easy to review and change without building an admin UI first.

## Queue Construction

### 1. Hot queue

Build the hot queue in this order:

1. manual watchlist
2. all card prints from `OP15`, `EB03`, and `OP14`
3. cards used in current meta decklists

Then normalize and prioritize:

- de-duplicate by card number / identity where possible so one JustTCG fetch covers all relevant rows
- prioritize rows that already have:
  - active external products
  - approved exact mappings
  - previously published prices
- include unresolved missing rows only after known-good rows in the same identity family

### 2. Rolling queue

Build the non-hot queue from current site state:

- oldest stale rows first
- rows still missing prices get a priority bump

This is not random rotation.
It is a stale-first queue with a missing-price bias.

### 3. Budget trimming

The queue builder should always:

- spend budget on the hot queue first
- only use rolling queue entries if budget remains

If the hot queue alone exceeds the cap, low-priority hot entries should be trimmed by:

- unresolved promo/event rows last
- already-mapped rows first

## Refresh Flow

The scheduled refresh should not invent a new pricing stack.
It should orchestrate the existing one.

Recommended run flow:

1. load watchlist config
2. build hot queue
3. build rolling queue
4. normalize to target card numbers and card print ids
5. fetch targeted JustTCG card data only for those numbers
6. update the source/candidate layer for the affected rows only
7. run targeted verification for affected `card_prints`
8. auto-publish verified rows
9. write summary artifacts

## Verification and Publish Policy

Phase 1 should continue to trust the existing verification boundary.

The scheduler may refresh candidate data automatically, but live publication still depends on:

- verification results
- existing mapping integrity rules
- published layer safety rules

That means:

- verified rows publish automatically
- blocked rows stay blocked
- suspicious rows do not wipe the live layer

## Safe Matching Rules for Scheduled Runs

The scheduled job should be more conservative than manual recovery work.

Phase 1 scheduled runs should:

- refresh rows that already have active exact links
- refresh rows with already-approved exact mappings
- refresh rows in known-safe latest-set/base-set families

Phase 1 scheduled runs should not:

- make new speculative promo/event mappings
- infer cross-product mappings for premium variants
- try to solve ambiguous PRB or championship lanes automatically

Those should stay in the manual recovery path.

## Failure Handling

### Quota pressure

If the run approaches the configured budget cap:

- finish the current hot-tier work safely
- skip rolling refresh
- continue to verification and publish

### Source failures

If meta or decklist sources fail:

- fall back to `watchlist + latest 3 sets`
- do not fail the whole run just because the meta layer is temporarily unavailable

### Verification failures

If verification fails:

- do not publish
- keep the previous published layer untouched

### Publish failures

If publish fails:

- leave current published rows live
- mark the run failed
- capture the error in artifacts/logs

## Observability

Every scheduled run should emit a summary containing:

- run time
- configured budget cap
- requests used
- hot queue size
- rolling queue size
- target card numbers count
- target card print ids count
- refreshed rows count
- verified rows count
- published rows count
- skipped rows by reason

GitHub Actions should expose:

- human-readable job summary
- JSON artifact for deeper inspection

## Testing

### Queue builder tests

Add tests for:

- watchlist inclusion
- latest-set inclusion
- meta deck usage inclusion
- de-duplication
- stale-first rolling ordering
- budget trimming
- hot-tier priority over rolling

### Failure-path tests

Add tests for:

- missing meta source
- quota threshold reached
- empty hot queue
- empty rolling queue

### Integration tests

Add a dry-run path for the scheduler that:

- builds queues
- reports selected rows
- does not publish

This gives a safe way to validate the queue logic in CI and during manual runs.

## Phase 2

Phase 2 can improve priority quality with first-party demand signals:

- site search counts
- card page views

Those should be additive, not required for phase 1.

The intended evolution is:

- phase 1: watchlist + latest sets + meta deck usage + stale rotation
- phase 2: add site demand signals to the hot queue ranking

## Proposed Files

Expected additions or changes:

- `data/pricing-watchlist.json`
- `scripts/run-scheduled-pricing-refresh.mjs`
- `.github/workflows/pricing-refresh.yml`
- shared helper extracted from `app/api/meta/deck/route.ts`
- tests for queue construction and failure behavior

## Acceptance Criteria

This design is successful when:

- pricing refresh runs automatically every other day
- the run stays within the configured budget cap
- hot cards refresh before long-tail cards
- the latest 3 priority sets are always part of the hot queue
- cards used in current meta decks are prioritized
- failed runs do not damage the published layer
- verified rows auto-publish successfully
- operators can inspect exactly what a run did

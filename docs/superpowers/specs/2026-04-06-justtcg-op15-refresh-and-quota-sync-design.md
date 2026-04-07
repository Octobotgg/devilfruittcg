# JustTCG OP15 Refresh And Quota-Aware Sync Design

Date: 2026-04-06

## Summary

This design covers two related goals:

1. A one-time refresh for the booster set `ADVENTURE ON KAMI'S ISLAND [OP15-EB04]`
2. A recurring JustTCG sync that stays inside the Starter plan quota and safely updates live pricing

The recurring job must prioritize known cards, newest sets, and high-demand cards, while avoiding automatic discovery of new mappings or risky premium/event assumptions.

## Context

The current repo already has the trusted three-step pricing pipeline:

1. `npm run import:justtcg:db`
2. `npm run verify:pricing`
3. `npm run publish:pricing`

The current importer also supports `--updated-after`, which is the right primitive for incremental refreshes.

The JustTCG Starter plan allows:

- `10,000` monthly requests
- `1,000` daily requests
- up to `100` cards per request

The current importer still uses a conservative page size of `20`, so part of this design is making scheduled syncs plan-aware instead of leaving efficiency on the table.

## Goals

- Refresh all cards from the `OP15-EB04` booster contents
- Exclude the separate `OP15-EB04 Release Event` promo lane from that one-time booster refresh
- Keep future refreshes within the monthly and daily JustTCG plan limits
- Auto-publish only rows that pass the existing verification rules
- Restrict automation to known cards and known mappings
- Produce clear run summaries for debugging and trust

## Non-Goals

- No automatic discovery or approval of new mappings in the scheduled job
- No manual override prices
- No automatic publishing of ambiguous promo/event products
- No full-catalog refresh on a schedule

## Recommended Approach

Use a hybrid quota-aware model:

1. One-time targeted set refresh for `OP15-EB04`
2. Every-other-day scheduled refresh for newest sets, high-demand cards, and global `updated_after` changes

This is better than a pure delta-only model because it keeps the newest set reliably fresh, and better than a pure set-rotation model because it still captures broad market movement cheaply.

## One-Time OP15 Refresh

### Scope

Refresh only cards/products belonging to `ADVENTURE ON KAMI'S ISLAND [OP15-EB04]`.

Do not include:

- `OP15-EB04 Release Event`
- release-event promo products
- unrelated `Adventure on Kami's Island` promo/event rows

### Flow

1. Resolve the exact JustTCG booster set lane for `OP15-EB04`
2. Fetch the set data from JustTCG
3. Import those cards/products into current pricing tables
4. Run pricing verification
5. Publish only verified rows
6. Emit a summary with fetched, updated, verified, published, and skipped counts

### Output Requirements

The one-time run should report:

- target set code
- target set label
- number of JustTCG cards fetched
- number of current price rows changed
- number of card prints verified
- number of rows published
- number of skipped rows and why

## Recurring Scheduled Sync

### Cadence

Run every other day in GitHub Actions.

### Budget

Use the monthly cap as the real limiter.

Recommended working budget:

- hard monthly cap: `10,000`
- safe monthly target: `8,000-8,500`
- leave remaining quota for manual reruns and unexpected releases

At every-other-day cadence:

- about `15` runs per month
- recommended target: `500-550` requests per run
- hard stop for scheduled runs: `650` requests

### Queue Order

Each scheduled run should process quota in this order:

1. Newest priority sets
2. High-demand known cards
3. Global `updated_after` delta sync
4. Verification and publish

### Priority Sets

The scheduler should always prioritize the newest booster/extra sets first. Initial priority examples:

- `OP15`
- `EB04`
- `OP14`

This priority list should live in a repo config file so it can be edited without code changes.

### High-Demand Cards

Demand should come from internal site activity, using:

- search count
- card page views

Only known cards should enter the automated refresh queue. Unknown or unmapped variants should not be promoted automatically.

### Delta Sync

After spending the hot-tier quota, the job should use JustTCG `updated_after` to capture broad changes across the catalog.

This is the cheapest long-tail maintenance lane and should be used after the newest-set and demand queues.

## Safety Rules

The scheduled job must be conservative:

- refresh known cards/products only
- do not auto-discover or auto-approve new mappings
- do not publish ambiguous event, promo, or premium variants
- do not publish rows that fail verification
- stop safely when quota budget is reached

## Failure Behavior

If JustTCG errors or rate limits:

- retry with backoff
- stop early if the retry budget is exhausted

If quota is nearly exhausted:

- finish the high-priority queue
- skip the remaining delta/rolling portion

If verification fails:

- do not publish

If publish fails:

- leave the existing published layer untouched

If the targeted set refresh cannot resolve the exact booster lane:

- stop and report the issue instead of guessing

## Repo Changes

### New Script

Add a one-time/manual refresh script:

- `scripts/run-justtcg-set-refresh.mjs`

Responsibilities:

- accept a set code such as `OP15-EB04`
- resolve the booster set lane only
- fetch/import/verify/publish
- emit a structured summary

### New Scheduled Script

Add a recurring automation wrapper:

- `scripts/run-scheduled-justtcg-refresh.mjs`

Responsibilities:

- build the priority queue
- enforce quota caps
- run the trusted pipeline
- emit machine-readable summary output

### New Config

Add a repo-tracked config file, for example:

- `data/pricing-refresh-config.json`

It should define:

- newest priority sets
- per-run quota cap
- hot-tier weights
- fallback/default values

### GitHub Action

Add:

- `.github/workflows/justtcg-refresh.yml`

It should support:

- scheduled every-other-day runs
- manual dispatch
- set-refresh mode
- scheduled refresh mode

### Importer Improvement

Update the JustTCG importer so request size can use the plan capacity of `100` cards per request instead of the current fixed `20`, while still allowing a lower override when needed.

## Verification

### One-Time Set Refresh

Acceptance requires:

- only `OP15-EB04` booster products are targeted
- verification succeeds
- publish succeeds
- summary is emitted

### Scheduled Sync

Acceptance requires:

- newest set queue runs before delta sync
- quota caps are respected
- verification gates publish
- job summary clearly reports what happened

### Guardrail Verification

Tests should prove:

- merged set refresh excludes release-event promos
- quota cap trimming works
- scheduled queue prioritization is deterministic
- unknown mappings are not auto-published

## Rollout

1. Build the targeted `OP15-EB04` refresh path
2. Run the one-time booster refresh
3. Build the scheduled quota-aware runner
4. Add GitHub Actions automation
5. Observe summaries and quota use for several runs
6. Adjust priority sets and per-run caps if needed

## Recommendation

Implement the one-time `OP15-EB04` set refresh first, then build the every-other-day quota-aware sync around known cards, newest sets, and `updated_after`.

That sequence gets immediate value for `Adventure on Kami's Island` while establishing a safe automation model for the rest of the catalog.

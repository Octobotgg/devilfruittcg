# Price History Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the card detail price history chart exact-print-only, trustworthy, and clearer to use with `1M / 3M / 6M / 1Y` ranges and honest sparse-data states.

**Architecture:** Extract chart-history shaping into a small helper that normalizes exact-print JustTCG points, filters them by range, and decides whether a chart should render. Then update the card detail market panel to use that helper, default to `3M`, remove the old legacy-feeling weekly framing, and show intentional sparse/stale states instead of weak charts.

**Tech Stack:** Next.js, React client components, TypeScript, Recharts, Node test runner

---

### Task 1: Add chart-history shaping helpers

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/market-history.ts`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-history.test.ts`

- [ ] **Step 1: Write failing tests for point normalization and range slicing**

Cover:
- invalid/null prices are ignored
- duplicate timestamps collapse to one usable point
- points sort ascending
- `1M / 3M / 6M / 1Y` ranges trim correctly
- fewer than `2` usable points marks the range as sparse

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
node --experimental-strip-types --test tests/market-history.test.ts
```

Expected:
- failing assertions because the helper file does not exist yet

- [ ] **Step 3: Implement the minimal helper**

Add a helper module that exports:
- point normalization from raw `{ date, tcgMarket }` style entries
- range filtering keyed to `30 / 90 / 180 / 365` day windows
- a derived chart state such as `ready`, `sparse`, or `empty`
- freshness helpers based on `updatedAt`

Keep it exact-print only. Do not read sibling/base history here.

- [ ] **Step 4: Re-run the helper tests**

Run:
```bash
node --experimental-strip-types --test tests/market-history.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add lib/market-history.ts tests/market-history.test.ts
git commit -m "test: add market history helper coverage"
```

### Task 2: Tighten JustTCG history shaping at the store boundary

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/justtcg-store.ts`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/justtcg-variant-runtime.test.ts`

- [ ] **Step 1: Write failing tests for exact-print history selection**

Add coverage that proves:
- the store returns history only for the requested print
- sparse raw history arrays stay sparse
- no sibling/base fallback is introduced
- invalid raw points are dropped before the chart layer receives them

- [ ] **Step 2: Run the targeted tests and confirm failure**

Run:
```bash
node --experimental-strip-types --test tests/justtcg-variant-runtime.test.ts
```

Expected:
- at least one failing assertion for the new exact-print history expectations

- [ ] **Step 3: Implement the minimal store changes**

In `/lib/justtcg-store.ts`:
- keep using the mapped exact variant only
- make raw supplemental history output consistent and normalized
- avoid leaking malformed entries to the panel

Do not change provider pricing logic. Keep the change isolated to history shaping.

- [ ] **Step 4: Re-run the targeted store tests**

Run:
```bash
node --experimental-strip-types --test tests/justtcg-variant-runtime.test.ts tests/market-history.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add lib/justtcg-store.ts tests/justtcg-variant-runtime.test.ts tests/market-history.test.ts
git commit -m "fix: normalize exact-print justtcg history"
```

### Task 3: Refactor the card detail chart UI

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/CardDetailMarketPanel.tsx`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-detail-pricing.test.ts`

- [ ] **Step 1: Add failing tests for the new chart state logic where practical**

At minimum, extend existing pricing-state coverage so we have assertions around:
- JustTCG-priced cards staying in the priced mode
- unpriced cards not falling back to a misleading chart-ready state

If panel rendering tests are awkward in the current repo, keep logic in helpers and test those instead of forcing fragile component tests.

- [ ] **Step 2: Run the targeted tests and confirm failure**

Run:
```bash
node --experimental-strip-types --test tests/market-detail-pricing.test.ts tests/market-history.test.ts
```

Expected:
- failure for new expectations or missing helper usage

- [ ] **Step 3: Update the panel behavior**

In `/components/market/CardDetailMarketPanel.tsx`:
- change range tabs from `1W / 1M / 3M / 6M / 1Y` to `1M / 3M / 6M / 1Y`
- default selected range to `3M`
- use the new history helper for chart points and sparse detection
- remove the old “price tracking started — history building” fallback copy
- render:
  - chart when at least `2` usable exact-print points exist
  - intentional unavailable state otherwise
- show current price and freshness info in the sparse state
- keep stale-data messaging subtle
- preserve the rest of the market panel and recent eBay listings

- [ ] **Step 4: Re-run the targeted tests**

Run:
```bash
node --experimental-strip-types --test tests/market-detail-pricing.test.ts tests/market-history.test.ts tests/justtcg-variant-runtime.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add components/market/CardDetailMarketPanel.tsx tests/market-detail-pricing.test.ts lib/market-history.ts tests/market-history.test.ts lib/justtcg-store.ts tests/justtcg-variant-runtime.test.ts
git commit -m "feat: improve card price history chart states"
```

### Task 4: Verify chart behavior end to end

**Files:**
- Verify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/CardDetailMarketPanel.tsx`
- Verify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/market-history.ts`
- Verify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/justtcg-store.ts`

- [ ] **Step 1: Run all focused automated checks**

Run:
```bash
node --experimental-strip-types --test tests/market-history.test.ts tests/market-detail-pricing.test.ts tests/justtcg-variant-runtime.test.ts
npm run smoke:market
```

Expected:
- all tests pass
- market smoke check passes

- [ ] **Step 2: Run a local browser verification**

Check at least:
- one print with healthy exact-print history
- one print with sparse or empty history
- one stale-history print if available

Verify:
- default tab is `3M`
- no family/base history appears
- sparse cards show the honest unavailable state
- chart renders only when enough points exist

- [ ] **Step 3: Commit the verification-ready branch state**

```bash
git status
```

Expected:
- clean worktree except intentional scratch files

- [ ] **Step 4: Prepare merge handoff**

If everything passes:
- push the branch
- open a PR with screenshots or notes for:
  - healthy chart
  - sparse history state
  - stale history note if applicable

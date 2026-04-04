# Marketplace Set Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw marketplace `Card Set / Booster` checklist with a grouped TCGplayer-familiar filter that keeps exact set-code filtering intact.

**Architecture:** Add one small grouping helper for marketplace set facets, test it directly, then swap the current flat set checklist in the client component for grouped sections plus search results. Keep the existing query params and exact set selection behavior unchanged.

**Tech Stack:** Next.js, React client components, TypeScript, Node test runner

---

### Task 1: Add set-grouping helpers

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/market-set-groups.ts`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-set-groups.test.ts`

- [ ] Write failing tests for grouping, popular-set inclusion, and promo search visibility
- [ ] Run `node --experimental-strip-types --test tests/market-set-groups.test.ts` and confirm failure
- [ ] Implement minimal grouping helpers
- [ ] Re-run `node --experimental-strip-types --test tests/market-set-groups.test.ts` and confirm pass

### Task 2: Update marketplace set filter UI

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/MarketCatalogView.tsx`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/market-types.ts`

- [ ] Add any facet metadata needed by the grouped UI without changing set query semantics
- [ ] Replace the flat set list with grouped sections and search-aware results
- [ ] Keep exact set checkbox selection and active-filter counts working

### Task 3: Verify behavior

**Files:**
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-set-groups.test.ts`
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-filters.test.ts`

- [ ] Run `node --experimental-strip-types --test tests/market-set-groups.test.ts tests/market-filters.test.ts`
- [ ] Run `npm run smoke:market`
- [ ] Check `/market` locally and verify grouped sets, promo search, and exact set selection still work

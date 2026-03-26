# Market Catalog Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the market page labels so set names and premium treatment chips look polished and trustworthy.

**Architecture:** Add one shared market-display formatter for human-facing set and treatment labels, then wire it into the market catalog UI and the market read model. Keep the deployed layout direction intact and focus this pass on label hygiene, chip logic, and copy cleanup.

**Tech Stack:** Next.js, TypeScript, React, Node test runner

---

### Task 1: Add Shared Market Display Formatters

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/market-display.ts`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/market-display.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- sluggy set names becoming readable labels
- facet labels keeping compact real codes when appropriate
- vague variant labels being hidden
- meaningful labels like `SP` staying visible

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test tests/market-display.test.ts`
Expected: fail because the formatter module does not exist yet

- [ ] **Step 3: Write minimal formatter implementation**

Implement:
- `formatMarketSetLabel(...)`
- `formatMarketSetFacetLabel(...)`
- `marketVariantDisplayLabel(...)`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test tests/market-display.test.ts`
Expected: pass

### Task 2: Wire Formatters Into Market Catalog UI

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/components/market/MarketCatalogView.tsx`

- [ ] **Step 1: Replace raw tile set labels**

Update the card tile so it renders the cleaned set label instead of raw `setCode`.

- [ ] **Step 2: Replace generic treatment chip logic**

Update market card chips to use `marketVariantDisplayLabel(...)` so meaningful treatments remain visible and vague labels are hidden.

- [ ] **Step 3: Apply same treatment rule to list rows and suggestions**

Keep treatment-chip behavior consistent across all market catalog surfaces.

- [ ] **Step 4: Clean supporting market-page copy**

Adjust the market hero/helper copy and current-view wording without changing the overall layout.

### Task 3: Clean Market Set Facet Labels

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/server/market/market-search.ts`

- [ ] **Step 1: Format set facet labels through the shared formatter**

Use the shared formatter in facet construction so filter labels stop showing raw underscore slugs.

- [ ] **Step 2: Run market runtime regression tests**

Run: `node --experimental-strip-types --test tests/task4-runtime-pricing.test.ts`
Expected: pass

### Task 4: Verify the Market Page End to End

**Files:**
- No new files

- [ ] **Step 1: Run formatter tests**

Run: `node --experimental-strip-types --test tests/market-display.test.ts`
Expected: pass

- [ ] **Step 2: Run TypeScript verification**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Check local market catalog response**

Run: `curl -sS --max-time 30 'http://localhost:3001/api/market/catalog?q=P-056&sort=relevance&page=1&pageSize=5'`
Expected: readable set facet labels, no underscore slug leakage in labels

- [ ] **Step 4: Manually inspect localhost market page**

Confirm:
- no ugly underscore slugs on market cards
- premium treatment chips show only when meaningful
- generic `Parallel` chips stay hidden
- market helper copy reads cleaner

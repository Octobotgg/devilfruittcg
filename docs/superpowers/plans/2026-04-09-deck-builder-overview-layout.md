# Deck Builder Overview Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the deck builder’s top overview into a tighter leader-first dashboard while keeping the same information visible and preserving the lower editing workflow.

**Architecture:** Keep the change scoped to the existing deck builder page, but extract a small overview-summary helper so the new compact summary cards have a testable data source. The top of the page becomes a three-row dashboard: leader plus compact summaries, curves, then split/power cards. The right rail remains only for active editing tools like the tech board and visual stack.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind utility classes, Node test runner, ESLint.

---

## File Structure

- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/app/deckbuilder/page.tsx`
  - Replace the oversized top overview arrangement with the approved leader-first dashboard layout.
  - Keep `Captain's Tech Board` and `Visual Stack` in the lower builder workspace.
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/deckbuilder-overview.ts`
  - Hold compact summary-card derivation for `Deck Value`, `Deck Size`, and `Status` so the top row copy and values are testable outside JSX.
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/deckbuilder-overview.test.ts`
  - Cover the new summary-card labels and status/value text.

### Task 1: Add a Testable Overview Summary Helper

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/deckbuilder-overview.ts`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/deckbuilder-overview.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildDeckOverviewSummary } from "../lib/deckbuilder-overview.ts";

test("buildDeckOverviewSummary returns compact leader-first summary cards", () => {
  const summary = buildDeckOverviewSummary({
    mainDeckCount: 38,
    leaderName: "Monkey.D.Luffy",
    leaderSubtitle: "Red/Purple",
    deckValue: 124.53,
    deckValueStatus: "3 priced · 1 missing",
    legal: false,
  });

  assert.deepEqual(summary, [
    {
      key: "deck_value",
      label: "Deck Value",
      value: "$124.53",
      detail: "3 priced · 1 missing",
      tone: "gold",
    },
    {
      key: "deck_size",
      label: "Deck Size",
      value: "38/50",
      detail: "Leader counted separately",
      tone: "navy",
    },
    {
      key: "status",
      label: "Status",
      value: "Needs tuning",
      detail: "Monkey.D.Luffy · Red/Purple",
      tone: "amber",
    },
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
node --experimental-strip-types --test tests/deckbuilder-overview.test.ts
```

Expected: FAIL because `buildDeckOverviewSummary` does not exist yet.

- [ ] **Step 3: Write the minimal helper implementation**

```ts
export type DeckOverviewSummaryInput = {
  mainDeckCount: number;
  leaderName: string | null;
  leaderSubtitle: string | null;
  deckValue: number;
  deckValueStatus: string;
  legal: boolean;
};

export type DeckOverviewSummaryCard = {
  key: "deck_value" | "deck_size" | "status";
  label: string;
  value: string;
  detail: string;
  tone: "gold" | "navy" | "amber" | "emerald";
};

export function buildDeckOverviewSummary(input: DeckOverviewSummaryInput): DeckOverviewSummaryCard[] {
  return [
    {
      key: "deck_value",
      label: "Deck Value",
      value: formatCurrency(input.deckValue),
      detail: input.deckValueStatus,
      tone: "gold",
    },
    {
      key: "deck_size",
      label: "Deck Size",
      value: `${input.mainDeckCount}/50`,
      detail: "Leader counted separately",
      tone: "navy",
    },
    {
      key: "status",
      label: "Status",
      value: input.legal ? "Deck Legal" : "Needs tuning",
      detail: input.leaderName ? `${input.leaderName} · ${input.leaderSubtitle ?? "Leader set"}` : "Pick a leader to anchor the build",
      tone: input.legal ? "emerald" : "amber",
    },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
node --experimental-strip-types --test tests/deckbuilder-overview.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/deckbuilder-overview.ts /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/deckbuilder-overview.test.ts
git commit -m "test: add deck builder overview summary helper"
```

### Task 2: Refactor the Top Deck Overview Layout

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/app/deckbuilder/page.tsx`
- Use: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/deckbuilder-overview.ts`

- [ ] **Step 1: Wire the helper into the deck builder page**

Add an import like:
```ts
import { buildDeckOverviewSummary } from "@/lib/deckbuilder-overview";
```

Create a memoized summary array near the other derived deck state:
```ts
const deckOverviewSummary = useMemo(
  () => buildDeckOverviewSummary({
    mainDeckCount,
    leaderName: leaderCard?.name ?? null,
    leaderSubtitle: leaderCard?.color ?? null,
    deckValue: deckPriceSummary.total,
    deckValueStatus: deckPriceStatus,
    legal: validationResult.legal,
  }),
  [deckPriceStatus, deckPriceSummary.total, leaderCard, mainDeckCount, validationResult.legal],
);
```

- [ ] **Step 2: Replace the current oversized top overview with the approved structure**

Inside `/app/deckbuilder/page.tsx`, make the top section follow this shape:
```tsx
<section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
  <div>
    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-light)]">Deck Overview</p>
  </div>

  <div className="mt-4 grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
    {renderLeaderOverviewCard()}
    <div className="grid gap-3 sm:grid-cols-3">
      {deckOverviewSummary.map((card) => (
        <div key={card.key} className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
          ...compact summary card...
        </div>
      ))}
    </div>
  </div>

  <div className="mt-4 grid gap-3 sm:grid-cols-2">
    <CurveChart title="DON Curve" buckets={curveBuckets} />
    <CurveChart title="Counter Curve" buckets={counterBuckets} />
  </div>

  <div className="mt-4 grid gap-3 lg:grid-cols-3">
    ...Type Split...
    ...Color Split...
    ...Average Power by Cost...
  </div>
</section>
```

Rules while implementing:
- Remove the extra descriptive sentence under `Deck Overview`.
- Keep the leader card visually dominant.
- Keep `Deck Value` compact; do not give it full-row hero treatment.
- Preserve the existing chart cards and card copy as much as possible.

- [ ] **Step 3: Keep the lower builder workspace focused**

Make sure the right rail still only contains:
- deck name input
- drag/drop add target
- `Captain's Tech Board`
- `Visual Stack`
- save/export/clear actions

Do not reintroduce curves, splits, or the leader panel into the sidebar.

- [ ] **Step 4: Keep `Test Hand` accessible without cluttering the overview**

Keep `Test Hand` in the upper hero controls beside the alt-art toggle, with the existing `canPlaytest` gating. Do not place it back into the overview dashboard.

- [ ] **Step 5: Run lint for the deck builder file**

Run:
```bash
npx eslint app/deckbuilder/page.tsx lib/deckbuilder-overview.ts tests/deckbuilder-overview.test.ts
```

Expected: PASS with no new warnings from these files.

- [ ] **Step 6: Commit**

```bash
git add /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/app/deckbuilder/page.tsx /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/lib/deckbuilder-overview.ts /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/deckbuilder-overview.test.ts
git commit -m "feat: tighten deck builder overview layout"
```

### Task 3: Verify the Layout in the Running App

**Files:**
- Verify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/app/deckbuilder/page.tsx`

- [ ] **Step 1: Open the correct local preview**

Use:
```bash
curl -s http://127.0.0.1:3015/deckbuilder | rg "Deck Overview|Leader Overview|Deck Value"
```

Expected: output includes `Deck Overview` and `Leader Overview`, and does not include the old validation block.

- [ ] **Step 2: Browser-check the layout**

Review in the browser:
- `Leader Overview` is the strongest visual anchor.
- `Deck Value`, `Deck Size`, and `Status` are compact and aligned.
- `DON Curve` and `Counter Curve` sit directly below the summary row.
- `Type Split`, `Color Split`, and `Average Power by Cost` form the third row cleanly.
- `Captain's Tech Board` and `Visual Stack` remain lower in the working area.

- [ ] **Step 3: Run the existing smoke/build checks**

Run:
```bash
npm run smoke:market
npm run build
```

Expected:
- `smoke:market` passes.
- `build` reaches only the known repo-wide `vitest.config.ts` module-resolution blocker, not a new deck builder error.

- [ ] **Step 4: Commit any final polish**

```bash
git add /Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/app/deckbuilder/page.tsx
git commit -m "chore: polish deck builder overview spacing"
```

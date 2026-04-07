# JustTCG OP15 Refresh And Quota-Aware Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-time booster-only refresh for `ADVENTURE ON KAMI'S ISLAND [OP15-EB04]` and a safe every-other-day JustTCG automation that stays within the Starter plan quota while auto-publishing only verified known-card updates.

**Architecture:** Extend the existing JustTCG importer so it can fetch plan-aware page sizes and exact set lanes, then wrap the current import -> verify -> publish pipeline with two small orchestration scripts: one for a one-time set refresh and one for recurring quota-aware scheduled syncs. Keep risky mapping discovery out of the recurring job and let verification remain the publish gate.

**Tech Stack:** Node.js scripts, Next.js repo tooling, GitHub Actions, Postgres/Supabase-backed pricing pipeline, Node test runner

---

### Task 1: Extend the importer for set-scoped and plan-aware JustTCG fetches

**Files:**
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/import-justtcg-to-drizzle.mjs`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/import-justtcg-to-drizzle.test.ts`

- [ ] **Step 1: Write the failing tests for plan-aware and set-aware fetch helpers**

```ts
test("parseArgs accepts fetch page size and target set", async () => {
  const mod = await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
    "scripts/import-justtcg-to-drizzle.mjs",
  );

  const args = mod.parseArgs(["--apply", "--set", "OP15-EB04", "--fetch-page-size", "100"]);

  assert.equal(args.set, "OP15-EB04");
  assert.equal(args.fetchPageSize, 100);
});

test("build JustTCG page request includes exact set and updated_after when provided", async () => {
  const mod = await importModule<typeof import("../scripts/import-justtcg-to-drizzle.mjs")>(
    "scripts/import-justtcg-to-drizzle.mjs",
  );

  const url = mod.buildJusttcgCardsUrl({
    game: "one-piece-card-game",
    limit: 100,
    offset: 0,
    includeNullPrices: true,
    updatedAfter: 123,
    set: "OP15-EB04",
  });

  assert.match(url, /game=one-piece-card-game/);
  assert.match(url, /limit=100/);
  assert.match(url, /updated_after=123/);
  assert.match(url, /set=OP15-EB04/);
});
```

- [ ] **Step 2: Run the focused importer test and confirm failure**

Run: `node --experimental-strip-types --test tests/import-justtcg-to-drizzle.test.ts`

Expected: FAIL because `parseArgs` and JustTCG URL building do not yet support the new set/page-size behavior.

- [ ] **Step 3: Implement the minimal importer changes**

Update `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/import-justtcg-to-drizzle.mjs` to:
- add CLI args for `--set` and `--fetch-page-size`
- add a small exported URL builder for the JustTCG `/cards` endpoint
- thread `set` and fetch page size into `fetchJusttcgCatalogPage`
- keep `updated_after` behavior intact
- cap the default fetch page size at `100` and allow lower overrides

- [ ] **Step 4: Re-run the focused importer test and confirm pass**

Run: `node --experimental-strip-types --test tests/import-justtcg-to-drizzle.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the importer groundwork**

```bash
git add tests/import-justtcg-to-drizzle.test.ts scripts/import-justtcg-to-drizzle.mjs
git commit -m "feat: add plan-aware justtcg fetch options"
```

### Task 2: Add the one-time OP15 booster refresh runner

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/run-justtcg-set-refresh.mjs`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/run-justtcg-set-refresh.test.ts`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/package.json`

- [ ] **Step 1: Write the failing tests for booster-only set refresh orchestration**

```ts
test("set refresh resolves booster lane and excludes release event lane", async () => {
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  const target = mod.resolveSetRefreshTarget({
    requestedSetCode: "OP15-EB04",
    releases: [
      { code: "OP15EB04", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" },
      { code: "OP15_EB04_RELEASE_EVENT", name: "OP15-EB04 Release Event" },
    ],
  });

  assert.equal(target.code, "OP15-EB04");
  assert.match(target.releaseName, /ADVENTURE ON KAMI'S ISLAND/);
  assert.doesNotMatch(target.releaseName, /Release Event/);
});

test("set refresh pipeline runs import, verify, and publish in order", async () => {
  const calls: string[] = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "OP15-EB04",
    runCommand: async (label) => { calls.push(label); return { ok: true }; },
  });

  assert.deepEqual(calls, ["import", "verify", "publish"]);
});
```

- [ ] **Step 2: Run the focused set-refresh test and confirm failure**

Run: `node --experimental-strip-types --test tests/run-justtcg-set-refresh.test.ts`

Expected: FAIL because the runner does not exist yet.

- [ ] **Step 3: Implement the minimal set-refresh runner**

Create `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/run-justtcg-set-refresh.mjs` with:
- CLI input for set code
- exact booster-lane resolution for `OP15-EB04`
- import -> verify -> publish orchestration
- structured JSON summary output
- no release-event promo fallback

Update `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/package.json` with a script entry such as:

```json
"refresh:justtcg:set": "node scripts/run-justtcg-set-refresh.mjs"
```

- [ ] **Step 4: Re-run the focused set-refresh test and confirm pass**

Run: `node --experimental-strip-types --test tests/run-justtcg-set-refresh.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the one-time refresh runner**

```bash
git add scripts/run-justtcg-set-refresh.mjs tests/run-justtcg-set-refresh.test.ts package.json
git commit -m "feat: add justtcg set refresh runner"
```

### Task 3: Add quota-aware scheduled queue building

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/data/pricing-refresh-config.json`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/lib/justtcg-refresh-queue.mjs`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/justtcg-refresh-queue.test.ts`

- [ ] **Step 1: Write the failing queue tests**

```ts
test("scheduled queue prioritizes newest sets, then demand, then delta", async () => {
  const mod = await importModule<typeof import("../scripts/lib/justtcg-refresh-queue.mjs")>(
    "scripts/lib/justtcg-refresh-queue.mjs",
  );

  const queue = mod.buildScheduledRefreshQueue({
    config: {
      newestSets: ["OP15", "EB04", "OP14"],
      perRunBudget: 550,
      hotReserve: 400,
    },
    newestSetCards: ["OP15-001", "OP15-002"],
    demandCards: ["OP03-001"],
    deltaCards: ["ST10-001"],
  });

  assert.deepEqual(queue.slice(0, 4), ["OP15-001", "OP15-002", "OP03-001", "ST10-001"]);
});

test("scheduled queue trims to quota cap", async () => {
  const mod = await importModule<typeof import("../scripts/lib/justtcg-refresh-queue.mjs")>(
    "scripts/lib/justtcg-refresh-queue.mjs",
  );

  const queue = mod.trimQueueToBudget(["a", "b", "c"], 2);
  assert.deepEqual(queue, ["a", "b"]);
});
```

- [ ] **Step 2: Run the queue test and confirm failure**

Run: `node --experimental-strip-types --test tests/justtcg-refresh-queue.test.ts`

Expected: FAIL because the queue builder does not exist yet.

- [ ] **Step 3: Implement the config and queue builder**

Create `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/data/pricing-refresh-config.json` with:
- `newestSets`
- `perRunBudget`
- `hardStopBudget`
- `hotReserve`
- fallback/default values

Create `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/lib/justtcg-refresh-queue.mjs` with:
- deterministic newest-set ordering
- demand queue merge
- delta queue append
- dedupe logic
- budget trimming helpers

- [ ] **Step 4: Re-run the queue test and confirm pass**

Run: `node --experimental-strip-types --test tests/justtcg-refresh-queue.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the queue builder**

```bash
git add data/pricing-refresh-config.json scripts/lib/justtcg-refresh-queue.mjs tests/justtcg-refresh-queue.test.ts
git commit -m "feat: add quota-aware justtcg refresh queue"
```

### Task 4: Add the scheduled JustTCG refresh runner

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/run-scheduled-justtcg-refresh.mjs`
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/run-scheduled-justtcg-refresh.test.ts`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/package.json`

- [ ] **Step 1: Write the failing scheduled-runner tests**

```ts
test("scheduled runner skips rolling work when quota is nearly exhausted", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.partitionScheduledWork({
    quotaRemaining: 120,
    hotQueue: ["OP15-001"],
    deltaQueue: ["ST10-001"],
    minimumRollingBudget: 150,
  });

  assert.deepEqual(plan.hotQueue, ["OP15-001"]);
  assert.deepEqual(plan.deltaQueue, []);
});

test("scheduled runner never enables mapping discovery mode", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.buildScheduledRunPlan({ enableDiscovery: false });
  assert.equal(plan.enableDiscovery, false);
});
```

- [ ] **Step 2: Run the focused scheduled-runner test and confirm failure**

Run: `node --experimental-strip-types --test tests/run-scheduled-justtcg-refresh.test.ts`

Expected: FAIL because the runner does not exist yet.

- [ ] **Step 3: Implement the minimal scheduled runner**

Create `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/scripts/run-scheduled-justtcg-refresh.mjs` with:
- config loading
- newest-set queue
- demand queue
- `updated_after` delta queue
- quota trimming
- import -> verify -> publish orchestration
- structured run summary
- explicit guardrail: known cards only, no discovery mode

Add a package script such as:

```json
"refresh:justtcg:scheduled": "node scripts/run-scheduled-justtcg-refresh.mjs"
```

- [ ] **Step 4: Re-run the focused scheduled-runner test and confirm pass**

Run: `node --experimental-strip-types --test tests/run-scheduled-justtcg-refresh.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the scheduled runner**

```bash
git add scripts/run-scheduled-justtcg-refresh.mjs tests/run-scheduled-justtcg-refresh.test.ts package.json
git commit -m "feat: add scheduled justtcg refresh runner"
```

### Task 5: Add the GitHub Actions workflow

**Files:**
- Create: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/.github/workflows/justtcg-refresh.yml`
- Modify: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/docs/superpowers/specs/2026-04-06-justtcg-op15-refresh-and-quota-sync-design.md` (only if the workflow shape needs final doc alignment)

- [ ] **Step 1: Write the workflow file for scheduled and manual runs**

The workflow should:
- run every other day
- support `workflow_dispatch`
- accept a manual mode for set refresh
- accept a scheduled mode for quota-aware sync
- read `JUSTTCG_API_KEY` and required DB secrets from GitHub secrets
- stop cleanly when required secrets are missing

- [ ] **Step 2: Add the workflow commands**

For scheduled runs:

```bash
npm ci
npm run refresh:justtcg:scheduled
```

For manual set refresh runs:

```bash
npm ci
npm run refresh:justtcg:set -- --set OP15-EB04
```

- [ ] **Step 3: Validate the workflow YAML locally**

Run: `yamllint .github/workflows/justtcg-refresh.yml` if available, otherwise visually verify against the existing workflow style in `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/.github/workflows/match-intel-sync.yml`

Expected: valid YAML with both schedule and manual dispatch triggers

- [ ] **Step 4: Commit the workflow**

```bash
git add .github/workflows/justtcg-refresh.yml
git commit -m "ci: add justtcg refresh workflow"
```

### Task 6: Full verification and first OP15 execution handoff

**Files:**
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/import-justtcg-to-drizzle.test.ts`
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/run-justtcg-set-refresh.test.ts`
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/justtcg-refresh-queue.test.ts`
- Test: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/tests/run-scheduled-justtcg-refresh.test.ts`
- Modify if needed: `/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1/package.json`

- [ ] **Step 1: Run the complete focused test bundle**

Run:

```bash
node --experimental-strip-types --test \
  tests/import-justtcg-to-drizzle.test.ts \
  tests/run-justtcg-set-refresh.test.ts \
  tests/justtcg-refresh-queue.test.ts \
  tests/run-scheduled-justtcg-refresh.test.ts
```

Expected: all tests PASS

- [ ] **Step 2: Run existing pricing smoke verification**

Run:

```bash
npm run smoke:market
```

Expected: PASS

- [ ] **Step 3: Dry-run the one-time set refresh**

Run:

```bash
npm run refresh:justtcg:set -- --set OP15-EB04 --dry-run
```

Expected: summary output shows booster-only targeting and does not include release-event promo products

- [ ] **Step 4: Dry-run the scheduled refresh**

Run:

```bash
npm run refresh:justtcg:scheduled -- --dry-run
```

Expected: summary output shows newest-set queue first, then demand, then delta

- [ ] **Step 5: Commit any final verification-safe polish**

```bash
git add .
git commit -m "test: verify justtcg refresh automation flow"
```

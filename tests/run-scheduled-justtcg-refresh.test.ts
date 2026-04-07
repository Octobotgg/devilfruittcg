import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

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

test("scheduled runner defaults to a 20-card fetch page size", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.buildScheduledRunPlan();
  assert.equal(plan.fetchPageSize, 20);
});

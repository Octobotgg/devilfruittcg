import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("scheduled runner defaults to daily full refresh mode", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.buildScheduledRunPlan();
  assert.equal(plan.mode, "full_refresh");
  assert.equal(plan.fetchPageSize, 20);
  assert.equal(plan.enableDiscovery, false);
});

test("scheduled runner supports daily delta refresh mode", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.buildScheduledRunPlan({ mode: "delta_refresh" });
  assert.equal(plan.mode, "delta_refresh");
  assert.equal(plan.enableDiscovery, false);
});

test("scheduled runner falls back to full refresh when mode is invalid", async () => {
  const mod = await importModule<typeof import("../scripts/run-scheduled-justtcg-refresh.mjs")>(
    "scripts/run-scheduled-justtcg-refresh.mjs",
  );

  const plan = mod.buildScheduledRunPlan({ mode: "totally_invalid" });
  assert.equal(plan.mode, "full_refresh");
});

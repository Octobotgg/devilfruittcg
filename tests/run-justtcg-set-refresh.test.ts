import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("set refresh resolves booster lane and excludes release event lane", async () => {
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  const target = mod.resolveSetRefreshTarget({
    requestedSetCode: "OP15-EB04",
    releases: [
      { codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" },
      { codes: [], category: "PROMOTION", name: "OP15-EB04 Release Event" },
    ],
  });

  assert.equal(target.code, "OP15-EB04");
  assert.match(target.releaseName, /ADVENTURE ON KAMI'S ISLAND/);
  assert.doesNotMatch(target.releaseName, /Release Event/);
});

test("set refresh pipeline runs import and known-price publish in order", async () => {
  const calls: string[] = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "OP15-EB04",
    releases: [{ codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
    runCommand: async (label) => {
      calls.push(label);
      return { ok: true, code: 0 };
    },
  });

  assert.deepEqual(calls, ["import", "publish_known_prices"]);
});

test("set refresh uses a 20-card fetch page size by default", async () => {
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  const summary = await mod.runSetRefresh({
    setCode: "OP15-EB04",
    dryRun: true,
    releases: [{ codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
  });

  assert.equal(summary.fetchPageSize, 20);
});

test("set refresh scopes known-price publish to the target release name", async () => {
  const steps: Array<{ label: string; args: string[] }> = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "OP15-EB04",
    releases: [{ codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
    runCommand: async (label, step) => {
      steps.push({ label, args: step.args });
      return { ok: true, code: 0, stdout: "" };
    },
  });

  const publishStep = steps.find((step) => step.label === "publish_known_prices");
  assert.ok(publishStep);
  assert.ok(publishStep.args.includes("--release-name"));
  const releaseNameArg = publishStep.args[publishStep.args.indexOf("--release-name") + 1];
  assert.equal(releaseNameArg, "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]");
  assert.ok(publishStep.args.includes("--source"));
  assert.equal(publishStep.args[publishStep.args.indexOf("--source") + 1], "justtcg_set_refresh");
});

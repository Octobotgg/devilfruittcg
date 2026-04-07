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

test("set refresh pipeline runs import, verify, and publish in order", async () => {
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

  assert.deepEqual(calls, ["import", "verify", "publish"]);
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

test("set refresh scopes verification and publish to the target set card prints", async () => {
  const steps: Array<{ label: string; args: string[] }> = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "OP15-EB04",
    releases: [{ codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
    officialCards: [
      { id: "OP15-001", releaseCode: "OP15EB04" },
      { id: "OP15-002", releaseCode: "OP15EB04" },
      { id: "OP14-001", releaseCode: "OP14EB04" },
    ],
    runCommand: async (label, step) => {
      steps.push({ label, args: step.args });
      if (label === "verify") {
        return { ok: true, code: 0, stdout: JSON.stringify({ verificationRunId: 77 }) };
      }
      return { ok: true, code: 0, stdout: "" };
    },
  });

  const verifyStep = steps.find((step) => step.label === "verify");
  assert.ok(verifyStep);
  assert.ok(verifyStep.args.includes("--card-print-id"));
  const cardPrintArg = verifyStep.args[verifyStep.args.indexOf("--card-print-id") + 1];
  assert.match(cardPrintArg, /OP15-001/);
  assert.match(cardPrintArg, /OP15-002/);
  assert.doesNotMatch(cardPrintArg, /OP14-001/);

  const publishStep = steps.find((step) => step.label === "publish");
  assert.ok(publishStep);
  assert.deepEqual(publishStep.args, ["--verification-run-id", "77"]);
});

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

test("set refresh accepts premium booster releases like PRB01", async () => {
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  const target = mod.resolveSetRefreshTarget({
    requestedSetCode: "PRB01",
    releases: [
      { codes: ["PRB01"], category: "PREMIUM_BOOSTER", name: "ONE PIECE CARD THE BEST [PRB-01]" },
      { codes: [], category: "PROMOTION", name: "PRB-01 Release Event" },
    ],
  });

  assert.equal(target.code, "PRB01");
  assert.equal(target.normalizedCode, "PRB01");
  assert.equal(target.releaseName, "ONE PIECE CARD THE BEST [PRB-01]");
});

test("set refresh resolves fuzzy PRB01 JustTCG set names to the correct set id", async () => {
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  const resolved = await mod.resolveJusttcgSetId({
    apiKey: "test-key",
    target: {
      code: "PRB01",
      normalizedCode: "PRB01",
      releaseName: "ONE PIECE CARD THE BEST [PRB-01]",
      category: "PREMIUM_BOOSTER",
      releaseDate: "2024-11-08",
      printCount: 319,
      queryName: "ONE PIECE CARD THE BEST",
    },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "set_prb01_live",
            name: "Premium Booster -One Piece Card The Best- [PRB-01]",
            cards_count: 319,
            release_date: "2024-11-08",
          },
        ],
      }),
    }),
  });

  assert.deepEqual(resolved, {
    id: "set_prb01_live",
    name: "Premium Booster -One Piece Card The Best- [PRB-01]",
    cardsCount: 319,
    releaseDate: "2024-11-08",
  });
});

test("set refresh pipeline runs import, snapshot fetch, verify, export, apply, and known-price publish in order", async () => {
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

  assert.deepEqual(calls, [
    "import",
    "fetch_catalog_snapshot",
    "verify_missing_set",
    "export_legacy_cache",
    "apply_verified_seed",
    "publish_known_prices",
  ]);
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

test("set refresh scopes missing-set verification to the normalized release code", async () => {
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

  const verifyStep = steps.find((step) => step.label === "verify_missing_set");
  assert.ok(verifyStep);
  assert.ok(verifyStep.args.includes("--release"));
  assert.equal(verifyStep.args[verifyStep.args.indexOf("--release") + 1], "OP15EB04");
  assert.ok(verifyStep.args.includes("--write"));
});

test("set refresh refreshes the verifier snapshot for the target JustTCG set id", async () => {
  const steps: Array<{ label: string; args: string[] }> = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "OP15-EB04",
    apiKey: "test-key",
    releases: [{ codes: ["OP15EB04"], category: "BOOSTER_PACK", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        data: [{ id: "set_live_op15eb04", name: "ADVENTURE ON KAMI'S ISLAND [OP15-EB04]" }],
      }),
    }),
    runCommand: async (label, step) => {
      steps.push({ label, args: step.args });
      return { ok: true, code: 0, stdout: "" };
    },
  });

  const fetchStep = steps.find((step) => step.label === "fetch_catalog_snapshot");
  assert.ok(fetchStep);
  assert.ok(fetchStep.args.includes("--set"));
  assert.equal(fetchStep.args[fetchStep.args.indexOf("--set") + 1], "set_live_op15eb04");
});

test("set refresh falls back to the normalized release code when the JustTCG set id is unresolved", async () => {
  const steps: Array<{ label: string; args: string[] }> = [];
  const mod = await importModule<typeof import("../scripts/run-justtcg-set-refresh.mjs")>(
    "scripts/run-justtcg-set-refresh.mjs",
  );

  await mod.runSetRefresh({
    setCode: "PRB01",
    apiKey: "test-key",
    releases: [{ codes: ["PRB01"], category: "PREMIUM_BOOSTER", name: "ONE PIECE CARD THE BEST [PRB-01]" }],
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    }),
    runCommand: async (label, step) => {
      steps.push({ label, args: step.args });
      return { ok: true, code: 0, stdout: "" };
    },
  });

  const importStep = steps.find((step) => step.label === "import");
  const snapshotStep = steps.find((step) => step.label === "fetch_catalog_snapshot");
  assert.ok(importStep);
  assert.ok(snapshotStep);
  assert.equal(importStep.args[importStep.args.indexOf("--set") + 1], "PRB01");
  assert.equal(snapshotStep.args[snapshotStep.args.indexOf("--set") + 1], "PRB01");
});

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("initial auth-nav readiness stays stable across server and client bootstrap", async () => {
  const cloudHydration =
    await importModule<typeof import("../lib/cloud/hydration")>("lib/cloud/hydration.ts");

  assert.equal(cloudHydration.getInitialCloudReady(false), false);
  assert.equal(cloudHydration.getInitialCloudReady(true), false);
});

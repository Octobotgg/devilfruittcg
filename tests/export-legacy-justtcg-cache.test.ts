import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("export cache filtering drops orphaned approved mappings and price rows", async () => {
  const mod = await importModule<typeof import("../scripts/export-legacy-justtcg-cache.mjs")>(
    "scripts/export-legacy-justtcg-cache.mjs",
  );

  const filtered = mod.filterExportableLegacyRows({
    maps: [
      { devilfruit_id: "OP15-001", resolved_card_print_id: "OP15-001" },
      { devilfruit_id: "P-056_p2", resolved_card_print_id: null },
    ],
    prices: [
      { devilfruit_id: "OP15-001", justtcg_id: "justtcg:op15-001" },
      { devilfruit_id: "P-056_p2", justtcg_id: "justtcg:p-056-p2" },
    ],
  });

  assert.deepEqual(
    filtered.maps.map((row) => row.devilfruit_id),
    ["OP15-001"],
  );
  assert.deepEqual(
    filtered.prices.map((row) => row.devilfruit_id),
    ["OP15-001"],
  );
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

test("collection browse cards avoid hard seams between neighboring cards", () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, "app/collection/page.tsx"), "utf8");

  assert.equal(
    source.includes('className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6"'),
    false,
  );
  assert.equal(
    source.includes('className="aspect-[63/88] w-full rounded-xl border border-[var(--color-parchment-dark)]"'),
    false,
  );
  assert.equal(source.includes("gap-x-2 gap-y-4"), true);
  assert.equal(source.includes("rounded-[18px]"), true);
});

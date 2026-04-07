import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

test("home bounty board rows no longer render demand badges", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "components/home/HomePageClient.tsx"),
    "utf8",
  );

  assert.equal(source.includes("className={`bounty-stamp ${stamp.tone}`}"), false);
  assert.equal(source.includes("High Demand"), false);
});

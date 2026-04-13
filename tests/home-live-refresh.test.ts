import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

test("home live cards always refresh on mount and keep polling", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "components/home/HomePageClient.tsx"),
    "utf8",
  );

  assert.equal(source.includes("if (initialMatchupsAreLive) return;"), false);
  assert.equal(source.includes("if (initialBountyIsLive) return;"), false);
  assert.equal(source.includes('fetch(`/api/matchups?${params.toString()}`, { cache: "no-store" })'), true);
  assert.equal(source.includes('fetch("/api/market/watch", { cache: "no-store" })'), true);
  assert.equal(source.includes("window.setInterval(run, HOME_LIVE_REFRESH_MS)"), true);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");
const homeClientSource = fs.readFileSync(
  path.join(REPO_ROOT, "components/home/HomePageClient.tsx"),
  "utf8",
);
const appPageSource = fs.readFileSync(
  path.join(REPO_ROOT, "app/page.tsx"),
  "utf8",
);
const marketWatchRouteSource = fs.readFileSync(
  path.join(REPO_ROOT, "app/api/market/watch/route.ts"),
  "utf8",
);
const marketHomeSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/server/market/market-home.ts"),
  "utf8",
);

test("home hero stat cards use dedicated live feeds", () => {
  assert.equal(homeClientSource.includes("const marketPulseText ="), true);
  assert.equal(homeClientSource.includes("const matchSampleText ="), true);
  assert.equal(homeClientSource.includes("pricingPulseUpdatedAt"), true);
  assert.equal(homeClientSource.includes("const marketPulseText = liveBountyMeta?.updatedAt"), false);
  assert.equal(homeClientSource.includes("meta?.sampleLabel"), false);
});

test("home page wires market pulse to published pricing refreshes", () => {
  assert.equal(appPageSource.includes("initialPricingPulseUpdatedAt"), true);
  assert.equal(marketWatchRouteSource.includes("pricingPulseUpdatedAt"), true);
  assert.equal(marketHomeSource.includes("pricing_verification_runs"), true);
  assert.equal(marketHomeSource.includes("card_print_price_published"), true);
  assert.equal(marketHomeSource.includes("status = 'completed'"), true);
  assert.equal(marketHomeSource.includes("max(published_at)"), true);
});

test("home matchup sample uses the same defaults and ranking as matchup matrix", () => {
  assert.equal(homeClientSource.includes("MATCHUPS_DEFAULT_PERIOD"), true);
  assert.equal(homeClientSource.includes("MATCHUPS_DEFAULT_LIMIT"), true);
  assert.equal(homeClientSource.includes('ranking: "relevance"'), true);
  assert.equal(appPageSource.includes("MATCHUPS_DEFAULT_PERIOD"), true);
  assert.equal(appPageSource.includes("MATCHUPS_DEFAULT_LIMIT"), true);
  assert.equal(appPageSource.includes('ranking: "relevance"'), true);
  assert.equal(appPageSource.includes("forceMatchIntelV2: true"), true);
});

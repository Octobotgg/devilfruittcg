import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("home bounty state maps marketplace card movers into bounty cards", async () => {
  const { buildHomeBountyStateFromMarketWatch } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  const state = buildHomeBountyStateFromMarketWatch({
    source: "justtcg-runtime-pricing",
    updatedAt: "2026-04-07T16:00:00.000Z",
    bountyBoard: [
      {
        collectibleId: "OP15-001_p1",
        collectibleKind: "raw_card",
        cardId: "OP15-001_p1",
        name: "Krieg",
        imageUrl: "https://img.example/krieg.jpg",
        currentPrice: 20.13,
        dailyChangePct: 18.2,
      },
      {
        collectibleId: "sealed-1",
        collectibleKind: "sealed",
        cardId: null,
        name: "Adventure on Kami's Island Booster Box",
        imageUrl: "https://img.example/sealed.jpg",
        currentPrice: 119.99,
        dailyChangePct: 12.4,
      },
    ],
  });

  assert.equal(state.isLive, true);
  assert.equal(state.meta?.provider, "Marketplace");
  assert.equal(state.cards.length, 1);
  assert.deepEqual(state.cards[0], {
    key: "OP15-001_p1",
    name: "Krieg",
    displayId: "OP15-001_p1",
    cardId: "OP15-001_p1",
    imageUrl: "https://img.example/krieg.jpg",
    price: 20.13,
    delta: 18.2,
    href: "/cards/OP15-001_p1",
    external: false,
  });
});

test("home bounty state returns an empty non-live state when marketplace movers are missing", async () => {
  const { buildHomeBountyStateFromMarketWatch } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  const state = buildHomeBountyStateFromMarketWatch(null);

  assert.equal(state.isLive, false);
  assert.equal(state.cards.length, 0);
  assert.equal(state.meta?.provider, "Marketplace");
  assert.equal(state.meta?.updatedAt, null);
});

test("home bounty delta formatter shows signed dollar changes instead of percents", async () => {
  const { formatHomeBountyDelta } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  assert.equal(formatHomeBountyDelta(3.29), "+$3.29");
  assert.equal(formatHomeBountyDelta(-1.12), "-$1.12");
  assert.equal(formatHomeBountyDelta(0), "$0.00");
});

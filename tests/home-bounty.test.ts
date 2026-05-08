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
        priceChange24h: 3.29,
        previousPrice: 16.84,
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
    imageUrl: "/api/card-image?id=OP15-001_p1",
    price: 20.13,
    delta: 3.29,
    previousPrice: 16.84,
    dailyChangePct: 18.2,
    href: "/cards/OP15-001_p1",
    external: false,
  });
});

test("home bounty state keeps the exact moved print identity for special prints", async () => {
  const { buildHomeBountyStateFromMarketWatch } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  const state = buildHomeBountyStateFromMarketWatch({
    source: "justtcg-runtime-pricing",
    updatedAt: "2026-04-07T16:00:00.000Z",
    bountyBoard: [
      {
        collectibleId: "ST01-005_p2",
        collectibleKind: "raw_card",
        cardId: "ST01-005",
        name: "Jinbe",
        justtcgTitle: "Jinbe (Gift Collection 2023)",
        currentPrice: 3.45,
        priceChange24h: 2.31,
        previousPrice: 1.14,
        dailyChangePct: 202.63,
      },
    ],
  });

  assert.deepEqual(state.cards[0], {
    key: "ST01-005_p2",
    name: "Jinbe",
    displayId: "ST01-005 · Gift Collection 2023",
    cardId: "ST01-005_p2",
    imageUrl: "/api/card-image?id=ST01-005_p2",
    price: 3.45,
    delta: 2.31,
    previousPrice: 1.14,
    dailyChangePct: 202.63,
    href: "/cards/ST01-005_p2",
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
  const { formatHomeBountyDelta, formatHomeBountyPct, formatHomeBountyPrice } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  assert.equal(formatHomeBountyDelta(3.29), "+$3.29");
  assert.equal(formatHomeBountyDelta(-1.12), "-$1.12");
  assert.equal(formatHomeBountyDelta(0), "$0.00");
  assert.equal(formatHomeBountyPct(18.2), "+18.2%");
  assert.equal(formatHomeBountyPct(-4.05), "-4.1%");
  assert.equal(formatHomeBountyPrice(4.43), "$4.43");
});

test("home bounty state keeps a fuller board when more marketplace movers are available", async () => {
  const { buildHomeBountyStateFromMarketWatch } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  const bountyBoard = Array.from({ length: 10 }, (_, index) => ({
    collectibleId: `OP15-0${index + 1}_p1`,
    collectibleKind: "raw_card",
    cardId: `OP15-0${index + 1}_p1`,
    name: `Mover ${index + 1}`,
    imageUrl: `https://img.example/mover-${index + 1}.jpg`,
    currentPrice: index + 1,
    previousPrice: index + 0.5,
    priceChange24h: 0.5,
    dailyChangePct: index + 0.5,
  }));

  const state = buildHomeBountyStateFromMarketWatch({
    source: "justtcg-runtime-pricing",
    updatedAt: "2026-04-07T16:00:00.000Z",
    bountyBoard,
  });

  assert.equal(state.cards.length, 8);
  assert.deepEqual(
    state.cards.map((card) => card.key),
    bountyBoard.slice(0, 8).map((card) => card.collectibleId),
  );
});

test("home bounty state derives previous price and percent when payload omits them", async () => {
  const { buildHomeBountyStateFromMarketWatch } =
    await importModule<typeof import("../lib/home-bounty")>("lib/home-bounty.ts");

  const state = buildHomeBountyStateFromMarketWatch({
    source: "justtcg-runtime-pricing",
    updatedAt: "2026-04-07T16:00:00.000Z",
    bountyBoard: [
      {
        collectibleId: "OP11-041_p2",
        collectibleKind: "raw_card",
        cardId: "OP11-041_p2",
        name: "Nami",
        currentPrice: 93,
        priceChange24h: -7,
      },
    ],
  });

  assert.equal(state.cards[0]?.previousPrice, 100);
  assert.equal(state.cards[0]?.dailyChangePct, -7);
});

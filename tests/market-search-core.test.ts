import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

Object.assign(process.env as Record<string, string | undefined>, { NODE_ENV: "test" });

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

function buildCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "OP01-001",
    baseId: "OP01-001",
    baseCardId: "OP01-001",
    printedCardId: "OP01-001",
    canonicalId: "OP01-001",
    canonicalVariantId: "OP01-001",
    canonicalVariantKey: "base",
    variantSlug: "base",
    name: "Monkey.D.Luffy",
    set: "Romance Dawn",
    setCode: "OP01",
    number: "001",
    type: "Character",
    color: "Red",
    rarity: "SR",
    cost: 5,
    life: null,
    power: 6000,
    counter: 1000,
    attribute: "Strike",
    traits: "Straw Hat Crew",
    effect: "",
    trigger: "",
    imageUrl: "https://img.example/luffy.jpg",
    releaseDate: "2024-01-01",
    language: "EN",
    market: {
      marketPrice: 10,
      averagePrice: 10,
      lowestPrice: 9,
      highestPrice: null,
      updatedAt: "2026-04-08T00:00:00.000Z",
      stale: false,
      cached: true,
      source: "justtcg",
    },
    ...overrides,
  };
}

test("searchMarketCardsSnapshot filters and paginates client-side catalog data", async () => {
  const { searchMarketCardsSnapshot } =
    await importModule<typeof import("../lib/market-search-core")>("lib/market-search-core.ts");

  const cards = [
    buildCard({ id: "OP01-025", name: "Roronoa Zoro", number: "025", setCode: "OP01", set: "Romance Dawn" }),
    buildCard({ id: "OP05-067", name: "Zoro-Juurou", number: "067", setCode: "OP05", set: "Awakening of the New Era" }),
    buildCard({ id: "OP02-026", name: "Sanji", number: "026", setCode: "OP02", set: "Paramount War" }),
  ];

  const result = searchMarketCardsSnapshot(cards, {
    q: "zoro",
    page: 1,
    pageSize: 24,
    sort: "relevance",
  });

  assert.equal(result.total, 2);
  assert.equal(result.totalPages, 1);
  assert.equal(result.sort, "relevance");
  assert.equal(result.query, "zoro");
  assert.deepEqual(
    result.results.map((card) => card.name),
    ["Zoro-Juurou", "Roronoa Zoro"],
  );
});

test("searchMarketCardsSnapshot keeps metadata based on the full snapshot when requested", async () => {
  const { searchMarketCardsSnapshot } =
    await importModule<typeof import("../lib/market-search-core")>("lib/market-search-core.ts");

  const cards = [
    buildCard({ id: "OP01-025", name: "Roronoa Zoro", number: "025", setCode: "OP01", set: "Romance Dawn", type: "Character" }),
    buildCard({ id: "OP02-018", name: "Gum-Gum Jet Pistol", number: "018", setCode: "OP02", set: "Paramount War", type: "Event", cost: 2, power: null, counter: null }),
    buildCard({ id: "OP05-067", name: "Zoro-Juurou", number: "067", setCode: "OP05", set: "Awakening of the New Era", type: "Character" }),
  ];

  const result = searchMarketCardsSnapshot(cards, {
    types: ["Character"],
    page: 2,
    pageSize: 1,
    sort: "name_asc",
  });

  assert.equal(result.total, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.page, 2);
  assert.equal(result.results[0]?.name, "Zoro-Juurou");
  assert.deepEqual(
    result.facets.types,
    [
      { value: "Character", label: "Character", count: 2 },
      { value: "Event", label: "Event", count: 1 },
    ],
  );
});

test("searchMarketCardsSnapshot can skip metadata for lightweight client queries", async () => {
  const { searchMarketCardsSnapshot } =
    await importModule<typeof import("../lib/market-search-core")>("lib/market-search-core.ts");

  const result = searchMarketCardsSnapshot([buildCard()], {
    q: "luffy",
    includeMetadata: false,
  });

  assert.deepEqual(result.facets, {
    sets: [],
    types: [],
    colors: [],
    rarities: [],
    counters: [],
    attributes: [],
  });
  assert.deepEqual(result.ranges, {
    cost: { min: 0, max: 0 },
    life: { min: 0, max: 0 },
    power: { min: 0, max: 0 },
  });
});

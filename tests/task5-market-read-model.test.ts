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

test("searchMarketCatalog delegates to the read model response", async () => {
  const { searchMarketCatalog } =
    await importModule<typeof import("../lib/market-catalog")>("lib/market-catalog.ts");

  const result = await searchMarketCatalog(
    {
      q: "luffy",
      sort: "price_desc",
      page: 2,
      pageSize: 12,
    },
    {
      searchReadModel: async (query = {}) => {
        assert.equal(query.q, "luffy");
        assert.equal(query.sort, "price_desc");
        assert.equal(query.page, 2);
        assert.equal(query.pageSize, 12);

        return {
          total: 1,
          page: 2,
          pageSize: 12,
          totalPages: 3,
          sort: "price_desc",
          query: "luffy",
          results: [
            {
              id: "OP01-001",
              name: "Monkey D. Luffy",
              set: "Romance Dawn",
              setCode: "OP01",
              number: "001",
              type: "Leader",
              color: "Red",
              rarity: "L",
              market: {
                marketPrice: 12.5,
                averagePrice: 12.5,
                lowestPrice: 10,
                highestPrice: null,
                updatedAt: "2026-03-25T00:00:00.000Z",
                fetchedAt: "2026-03-25T00:05:00.000Z",
                stale: false,
                cached: true,
                source: "justtcg",
              },
              cardPrintId: "cp-1",
              justtcgTitle: "Monkey D. Luffy OP01-001",
              justtcgImageUrl: "https://img.example/luffy.jpg",
              official: {
                name: "Monkey D. Luffy",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
              pricingStatus: "priced",
              currentPrice: 12.5,
            },
          ],
          facets: {
            sets: [{ value: "OP01", label: "OP01 · Romance Dawn", count: 1 }],
            types: [{ value: "Leader", label: "Leader", count: 1 }],
            colors: [{ value: "Red", label: "Red", count: 1 }],
            rarities: [{ value: "L", label: "L", count: 1 }],
            counters: [{ value: "0", label: "0", count: 1 }],
            attributes: [{ value: "Strike", label: "Strike", count: 1 }],
          },
          ranges: {
            cost: { min: 5, max: 5 },
            life: { min: 5, max: 5 },
            power: { min: 5000, max: 5000 },
          },
        };
      },
    },
  );

  assert.equal(result.total, 1);
  assert.equal(result.page, 2);
  assert.equal(result.sort, "price_desc");
  assert.equal(result.results[0]?.id, "OP01-001");
  assert.equal(result.results[0]?.market?.marketPrice, 12.5);
  assert.deepEqual(result.facets.sets, [{ value: "OP01", label: "OP01 · Romance Dawn", count: 1 }]);
});

test("searchMarketCatalog preserves legacy sort and pagination normalization before delegating", async () => {
  const { searchMarketCatalog } =
    await importModule<typeof import("../lib/market-catalog")>("lib/market-catalog.ts");

  await searchMarketCatalog(
    {
      q: "luffy",
      sort: "totally_invalid" as never,
      page: 0,
      pageSize: 3,
    },
    {
      searchReadModel: async (query = {}) => {
        assert.equal(query.q, "luffy");
        assert.equal(query.sort, "relevance");
        assert.equal(query.page, 1);
        assert.equal(query.pageSize, 12);

        return {
          total: 0,
          page: 1,
          pageSize: 12,
          totalPages: 1,
          sort: "relevance",
          query: "luffy",
          results: [],
          facets: {
            sets: [],
            types: [],
            colors: [],
            rarities: [],
            counters: [],
            attributes: [],
          },
          ranges: {
            cost: { min: 0, max: 0 },
            life: { min: 0, max: 0 },
            power: { min: 0, max: 0 },
          },
        };
      },
    },
  );
});

test("getJustTcgPriceSummaries maps variant-like requests onto the active approved read-model price", async () => {
  const { getJustTcgPriceSummaries } =
    await importModule<typeof import("../lib/justtcg-store")>("lib/justtcg-store.ts");

  const summaries = await getJustTcgPriceSummaries(
    ["op01-001", "OP01-001_P1"],
    {
      loadCurrentRows: async (requestedIds) => {
        assert.deepEqual(requestedIds, ["OP01-001", "OP01-001_P1"]);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            activeExternalVariantId: "justtcg:123:nm",
            productKind: "raw_card",
            mappingApproved: true,
            priceMarket: "12.75",
            priceNm: "12.50",
            priceLp: "10.25",
            priceChange24h: "0.5",
            priceChange7d: "1.25",
            priceChange30d: "3.75",
            updatedAt: "2026-03-25T00:00:00.000Z",
            fetchedAt: "2026-03-25T00:05:00.000Z",
          },
        ];
      },
    },
  );

  assert.equal(summaries["OP01-001"]?.cardId, "OP01-001");
  assert.equal(summaries["OP01-001"]?.justtcgId, "123");
  assert.equal(summaries["OP01-001"]?.marketPrice, 12.5);
  assert.equal(summaries["OP01-001_P1"]?.marketPrice, 12.5);
  assert.equal(summaries["OP01-001_P1"]?.priceChange30d, 3.75);
});

test("getJustTcgPriceSummaries resolves hyphenated public print ids onto the base JustTCG row", async () => {
  const { getJustTcgPriceSummaries } =
    await importModule<typeof import("../lib/justtcg-store")>("lib/justtcg-store.ts");

  const summaries = await getJustTcgPriceSummaries(
    ["OP01-001-P1"],
    {
      loadCurrentRows: async (requestedIds) => {
        assert.deepEqual(requestedIds, ["OP01-001-P1"]);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            activeExternalVariantId: "justtcg:123:nm",
            productKind: "raw_card",
            mappingApproved: true,
            priceMarket: "12.75",
            priceNm: "12.50",
            priceLp: "10.25",
            priceChange24h: "0.5",
            priceChange7d: "1.25",
            priceChange30d: "3.75",
            updatedAt: "2026-03-25T00:00:00.000Z",
            fetchedAt: "2026-03-25T00:05:00.000Z",
          },
        ];
      },
    },
  );

  assert.equal(summaries["OP01-001-P1"]?.cardId, "OP01-001");
  assert.equal(summaries["OP01-001-P1"]?.marketPrice, 12.5);
  assert.equal(summaries["OP01-001-P1"]?.priceChange30d, 3.75);
});

test("getJustTcgPriceSummaries resolves canonical variant ids onto the base JustTCG row", async () => {
  const { getJustTcgPriceSummaries, getJustTcgPriceDetail } =
    await importModule<typeof import("../lib/justtcg-store")>("lib/justtcg-store.ts");

  const baseRow = {
    cardPrintId: "cp-1",
    printedCardCode: "OP01-001",
    cardId: "OP01-001",
    externalProductId: "justtcg:123",
    externalVariantId: "justtcg:123:nm",
    activeExternalVariantId: "justtcg:123:nm",
    productKind: "raw_card",
    mappingApproved: true,
    priceMarket: "12.75",
    priceNm: "12.50",
    priceLp: "10.25",
    priceChange24h: "0.5",
    priceChange7d: "1.25",
    priceChange30d: "3.75",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  };

  const summaries = await getJustTcgPriceSummaries(
    ["OP01-001_parallel_op01"],
    {
      loadCurrentRows: async (requestedIds) => {
        assert.deepEqual(requestedIds, ["OP01-001_PARALLEL_OP01"]);
        return [baseRow];
      },
    },
  );

  assert.equal(summaries["OP01-001_PARALLEL_OP01"]?.cardId, "OP01-001");
  assert.equal(summaries["OP01-001_PARALLEL_OP01"]?.marketPrice, 12.5);

  const detail = await getJustTcgPriceDetail(
    "OP01-001_parallel_op01",
    30,
    {
      loadCurrentRows: async () => [baseRow],
      loadHistoryRows: async ({ requestedIds }) => {
        assert.deepEqual(requestedIds, ["OP01-001_PARALLEL_OP01"]);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            recordedAt: "2026-03-20T00:00:00.000Z",
            priceNm: "11.25",
          },
        ];
      },
    },
  );

  assert.equal(detail.price?.marketPrice, 12.5);
  assert.equal(detail.points.length, 1);
  assert.equal(detail.points[0]?.tcgMarket, 11.25);
});

test("getJustTcgPriceDetail keeps the legacy detail shape from the new price tables", async () => {
  const { getJustTcgPriceDetail } =
    await importModule<typeof import("../lib/justtcg-store")>("lib/justtcg-store.ts");

  const detail = await getJustTcgPriceDetail(
    "op01-001_p1",
    30,
    {
      loadCurrentRows: async (requestedIds) => {
        assert.deepEqual(requestedIds, ["OP01-001_P1"]);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            activeExternalVariantId: "justtcg:123:nm",
            productKind: "raw_card",
            mappingApproved: true,
            priceMarket: "12.75",
            priceNm: "12.50",
            priceLp: "10.25",
            priceChange24h: "0.5",
            priceChange7d: "1.25",
            priceChange30d: "3.75",
            updatedAt: "2026-03-25T00:00:00.000Z",
            fetchedAt: "2026-03-25T00:05:00.000Z",
          },
        ];
      },
      loadHistoryRows: async ({ requestedIds, rangeDays }) => {
        assert.deepEqual(requestedIds, ["OP01-001_P1"]);
        assert.equal(rangeDays, 30);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            recordedAt: "2026-03-20T00:00:00.000Z",
            priceNm: "11.25",
          },
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            recordedAt: "2026-03-25T00:00:00.000Z",
            priceNm: "12.50",
          },
        ];
      },
      now: () => Date.parse("2026-03-25T12:00:00.000Z"),
    },
  );

  assert.equal(detail.price?.cardId, "OP01-001");
  assert.equal(detail.price?.justtcgId, "123");
  assert.equal(detail.price?.marketPrice, 12.5);
  assert.deepEqual(detail.points, [
    {
      ts: Date.parse("2026-03-20T00:00:00.000Z"),
      date: "2026-03-20",
      tcgMarket: 11.25,
    },
    {
      ts: Date.parse("2026-03-25T00:00:00.000Z"),
      date: "2026-03-25",
      tcgMarket: 12.5,
    },
  ]);
});

test("getJustTcgPriceDetail falls back to active-product raw history when structured history is sparse", async () => {
  const { getJustTcgPriceDetail } =
    await importModule<typeof import("../lib/justtcg-store")>("lib/justtcg-store.ts");

  const detail = await getJustTcgPriceDetail(
    "op01-001-p1",
    30,
    {
      loadCurrentRows: async (requestedIds) => {
        assert.deepEqual(requestedIds, ["OP01-001-P1"]);
        return [
          {
            cardPrintId: "cp-1",
            printedCardCode: "OP01-001",
            cardId: "OP01-001",
            externalProductId: "justtcg:123",
            externalVariantId: "justtcg:123:nm",
            activeExternalVariantId: "justtcg:123:nm",
            externalRawPayload: {
              variants: [
                {
                  condition: "Near Mint",
                  language: "English",
                  printing: "Normal",
                  priceHistory30d: [
                    { t: Math.floor(Date.parse("2026-03-20T00:00:00.000Z") / 1000), p: 11.25 },
                    { t: Math.floor(Date.parse("2026-03-25T00:00:00.000Z") / 1000), p: 12.5 },
                  ],
                },
              ],
            },
            productKind: "raw_card",
            mappingApproved: true,
            priceMarket: "12.75",
            priceNm: "12.50",
            priceLp: "10.25",
            priceChange24h: "0.5",
            priceChange7d: "1.25",
            priceChange30d: "3.75",
            updatedAt: "2026-03-25T00:00:00.000Z",
            fetchedAt: "2026-03-25T00:05:00.000Z",
          },
        ];
      },
      loadHistoryRows: async ({ requestedIds, rangeDays }) => {
        assert.deepEqual(requestedIds, ["OP01-001-P1"]);
        assert.equal(rangeDays, 30);
        return [];
      },
      now: () => Date.parse("2026-03-25T12:00:00.000Z"),
    },
  );

  assert.equal(detail.price?.cardId, "OP01-001");
  assert.equal(detail.price?.marketPrice, 12.5);
  assert.deepEqual(detail.points, [
    {
      ts: Date.parse("2026-03-20T00:00:00.000Z"),
      date: "2026-03-20",
      tcgMarket: 11.25,
    },
    {
      ts: Date.parse("2026-03-25T00:00:00.000Z"),
      date: "2026-03-25",
      tcgMarket: 12.5,
    },
  ]);
});

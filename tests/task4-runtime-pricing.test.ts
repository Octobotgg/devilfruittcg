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

test("unmapped raw card returns Unpriced", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-unmapped", {
    loadRows: async () => [],
  });

  assert.equal(result.status, "unpriced");
  assert.equal(result.kind, "raw_card");
  assert.equal(result.cardPrintId, "cp-unmapped");
  assert.equal(result.reason, "missing_active_approved_mapping");
});

test("mapped raw card returns NM USD price", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-priced", {
    loadRows: async () => [
      {
        cardPrintId: "cp-priced",
        cardId: "OP01-001",
        printedCardCode: "OP01-001",
        officialName: "Monkey D. Luffy",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:123",
        productKind: "raw_card",
        justtcgTitle: "Monkey D. Luffy OP01-001",
        justtcgImageUrl: "https://img.example/luffy.jpg",
        mappingApproved: true,
        priceMarket: "13.00",
        priceNm: "12.50",
        priceLp: "10.25",
        priceChange24h: "1.20",
        updatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
      },
    ],
  });

  assert.equal(result.status, "priced");
  assert.equal(result.kind, "raw_card");
  assert.equal(result.cardPrintId, "cp-priced");
  assert.equal(result.currentPrice, 12.5);
  assert.equal(result.currentPriceType, "near_mint");
  assert.equal(result.currency, "USD");
  assert.equal(result.justtcg.title, "Monkey D. Luffy OP01-001");
});

test("sealed and raw cards do not mix", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );
  const { getSealedProductRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/sealed-product-prices")>(
      "lib/server/pricing/sealed-product-prices.ts",
    );

  const rawResult = await getCardPrintRuntimePrice("cp-kind-mismatch", {
    loadRows: async () => [
      {
        cardPrintId: "cp-kind-mismatch",
        cardId: "OP01-050",
        printedCardCode: "OP01-050",
        officialName: "Roronoa Zoro",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:sealed-1",
        productKind: "sealed",
        justtcgTitle: "Romance Dawn Booster Box",
        justtcgImageUrl: "https://img.example/box.jpg",
        mappingApproved: true,
        priceMarket: "120.00",
        priceNm: "120.00",
        priceLp: null,
        priceChange24h: "4.00",
        updatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
      },
    ],
  });

  const sealedResult = await getSealedProductRuntimePrice("sealed-kind-mismatch", {
    loadRows: async () => [
      {
        sealedProductId: "sealed-kind-mismatch",
        sealedProductName: "Romance Dawn Booster Box",
        officialReleaseCode: "OP01",
        officialReleaseName: "Romance Dawn",
        externalProductId: "justtcg:raw-1",
        productKind: "raw_card",
        justtcgTitle: "Roronoa Zoro OP01-050",
        justtcgImageUrl: "https://img.example/zoro.jpg",
        mappingApproved: true,
        priceMarket: "15.00",
        priceChange24h: "0.40",
        updatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
      },
    ],
  });

  assert.equal(rawResult.status, "unpriced");
  assert.equal(rawResult.reason, "kind_mismatch");
  assert.equal(sealedResult.status, "unpriced");
  assert.equal(sealedResult.reason, "kind_mismatch");
});

test("deck valuation ignores unmapped cards while surfacing them as unpriced", async () => {
  const { valuateDeckByCardPrint } =
    await importModule<typeof import("../lib/server/decks/deck-valuation")>(
      "lib/server/decks/deck-valuation.ts",
    );

  const result = await valuateDeckByCardPrint(
    [
      { cardPrintId: "cp-priced", quantity: 4 },
      { cardPrintId: "cp-unmapped", quantity: 2 },
    ],
    {
      loadPrices: async () =>
        new Map([
          [
            "cp-priced",
            {
              status: "priced",
              kind: "raw_card",
              cardPrintId: "cp-priced",
              cardId: "OP01-001",
              printedCardCode: "OP01-001",
              currency: "USD",
              currentPrice: 2.5,
              currentPriceType: "near_mint",
              priceMarket: 2.75,
              priceLp: 2,
              priceChange24h: 0.1,
              updatedAt: "2026-03-25T00:00:00.000Z",
              fetchedAt: "2026-03-25T00:05:00.000Z",
              externalProductId: "justtcg:123",
              justtcg: {
                title: "Monkey D. Luffy OP01-001",
                imageUrl: "https://img.example/luffy.jpg",
              },
              official: {
                name: "Monkey D. Luffy",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
            },
          ],
          [
            "cp-unmapped",
            {
              status: "unpriced",
              kind: "raw_card",
              cardPrintId: "cp-unmapped",
              reason: "missing_active_approved_mapping",
              currency: "USD",
            },
          ],
        ]),
    },
  );

  assert.equal(result.totalPrice, 10);
  assert.equal(result.currency, "USD");
  assert.equal(result.pricedItemCount, 1);
  assert.equal(result.unpricedItemCount, 1);
  assert.deepEqual(result.unpricedItems, [
    {
      cardPrintId: "cp-unmapped",
      quantity: 2,
      reason: "missing_active_approved_mapping",
    },
  ]);
});

test("market search treats unapproved active links as unpriced", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const result = toMarketCardResultForTesting({
    cardPrintId: "cp-alt-1",
    cardId: "OP01-001",
    printedCardCode: "OP01-001",
    variantLabel: "Alt Art",
    variantSlug: "alt-art",
    cardName: "Monkey D. Luffy",
    setCode: "OP01",
    setName: "Romance Dawn",
    number: "001",
    cardType: "Leader",
    color: "Red",
    rarity: "L",
    cost: 5,
    life: 5,
    power: 5000,
    counter: 0,
    attribute: "Strike",
    traits: null,
    effectText: null,
    triggerText: null,
    imageUrl: "https://img.example/internal.jpg",
    releaseDate: "2025-01-01",
    productKind: "raw_card",
    justtcgTitle: "Monkey D. Luffy Alt Art",
    justtcgImageUrl: "https://img.example/justtcg.jpg",
    mappingApproved: false,
    priceNm: "55.00",
    priceLp: "40.00",
    priceChange7d: "5.00",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  });

  assert.equal(result.pricingStatus, "unpriced");
  assert.equal(result.market, null);
  assert.equal(result.currentPrice, null);
});

test("market search does not price raw card rows when the active product kind is sealed", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const result = toMarketCardResultForTesting({
    cardPrintId: "cp-kind-search",
    cardId: "OP01-010",
    printedCardCode: "OP01-010",
    variantLabel: "Base",
    variantSlug: "base",
    cardName: "Nami",
    setCode: "OP01",
    setName: "Romance Dawn",
    number: "010",
    cardType: "Character",
    color: "Red",
    rarity: "UC",
    cost: 1,
    life: null,
    power: 1000,
    counter: 1000,
    attribute: null,
    traits: null,
    effectText: null,
    triggerText: null,
    imageUrl: "https://img.example/internal.jpg",
    releaseDate: "2025-01-01",
    productKind: "sealed",
    justtcgTitle: "Romance Dawn Booster Box",
    justtcgImageUrl: "https://img.example/box.jpg",
    mappingApproved: true,
    priceNm: "120.00",
    priceLp: "115.00",
    priceChange7d: "6.00",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  });

  assert.equal(result.pricingStatus, "unpriced");
  assert.equal(result.market, null);
  assert.equal(result.currentPrice, null);
});

test("market search preserves public print identity for variant-aware routing and display", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const displayCardIdLikeUi = (card: { id: string; baseId?: string; canonicalId?: string }) => {
    if (card.baseId && card.id !== card.baseId && String(card.canonicalId || "").trim()) {
      return String(card.canonicalId).trim();
    }
    return card.id;
  };

  const routeCardIdLikeUi = (card: { id: string; baseId?: string; canonicalId?: string }) => {
    if (card.baseId && card.id !== card.baseId && String(card.canonicalId || "").trim()) {
      return encodeURIComponent(String(card.canonicalId).trim());
    }
    return encodeURIComponent(card.id);
  };

  const result = toMarketCardResultForTesting({
    cardPrintId: "cp-alt-2",
    cardId: "OP01-001",
    printedCardCode: "OP01-001-P1",
    variantLabel: "Alt Art",
    variantSlug: "alt-art",
    cardName: "Monkey D. Luffy",
    setCode: "OP01",
    setName: "Romance Dawn",
    number: "001",
    cardType: "Leader",
    color: "Red",
    rarity: "L",
    cost: 5,
    life: 5,
    power: 5000,
    counter: 0,
    attribute: "Strike",
    traits: null,
    effectText: null,
    triggerText: null,
    imageUrl: "https://img.example/internal.jpg",
    releaseDate: "2025-01-01",
    productKind: "raw_card",
    justtcgTitle: "Monkey D. Luffy Alt Art",
    justtcgImageUrl: "https://img.example/justtcg.jpg",
    mappingApproved: true,
    priceNm: "55.00",
    priceLp: "40.00",
    priceChange7d: "5.00",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  });

  assert.equal(result.id, "OP01-001-P1");
  assert.equal(result.baseId, "OP01-001");
  assert.equal(result.cardPrintId, "cp-alt-2");
  assert.equal(result.printedCardId, "OP01-001-P1");
  assert.equal(result.canonicalId, "OP01-001-P1");
  assert.equal(displayCardIdLikeUi(result), "OP01-001-P1");
  assert.equal(routeCardIdLikeUi(result), encodeURIComponent("OP01-001-P1"));
});

test("market home rejects remapped raw card rows that do not match the active external product", async () => {
  const { passesMarketMoverTrustFilters } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  assert.equal(
    passesMarketMoverTrustFilters(
      {
        collectibleId: "cp-remapped",
        collectibleKind: "raw_card",
        cardId: "OP01-001",
        officialName: "Monkey D. Luffy",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:old",
        activeExternalProductId: "justtcg:new",
        justtcgTitle: "Old listing",
        justtcgImageUrl: "https://img.example/old.jpg",
        currentPrice: "12.00",
        priceChange24h: "2.00",
        updatedAt: "2026-03-25T00:00:00.000Z",
        mappingApproved: true,
      },
      {
        minimumPriceFloor: 0,
        maximumAbsoluteDelta: 500,
        maximumPercentSwing: 500,
      },
    ),
    false,
  );
});

test("portfolio summary chart ends at the current total collection value", async () => {
  const { buildPortfolioSummary } =
    await importModule<typeof import("../lib/server/collection/portfolio-summary")>(
      "lib/server/collection/portfolio-summary.ts",
    );

  const today = new Date().toISOString().slice(0, 10);

  const summary = await buildPortfolioSummary(
    [{ cardPrintId: "cp-priced", quantity: 2 }],
    {
      range: "7D",
      loadPrices: async () =>
        new Map([
          [
            "cp-priced",
            {
              status: "priced",
              kind: "raw_card",
              cardPrintId: "cp-priced",
              cardId: "OP01-001",
              printedCardCode: "OP01-001",
              currency: "USD",
              currentPrice: 3,
              currentPriceType: "near_mint",
              priceMarket: 3.25,
              priceLp: 2.5,
              priceChange24h: 0.5,
              updatedAt: "2026-03-25T00:00:00.000Z",
              fetchedAt: "2026-03-25T00:05:00.000Z",
              externalProductId: "justtcg:123",
              justtcg: {
                title: "Monkey D. Luffy OP01-001",
                imageUrl: "https://img.example/luffy.jpg",
              },
              official: {
                name: "Monkey D. Luffy",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
            },
          ],
        ]),
      loadHistory: async () =>
        new Map([
          [
            "cp-priced",
            [
              {
                cardPrintId: "cp-priced",
                recordedAt: "2026-03-24T12:00:00.000Z",
                price: 2,
              },
            ],
          ],
        ]),
    },
  );

  assert.equal(summary.totalCollectionValue, 6);
  assert.deepEqual(summary.chartHistory.at(-1), {
    date: today,
    value: 6,
  });
});

test("market search price_desc sorts unpriced results after priced results", async () => {
  const { sortMarketCardsForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const sorted = sortMarketCardsForTesting(
    [
      {
        id: "cp-unpriced",
        name: "Beta",
        set: "Set",
        setCode: "OP01",
        number: "002",
        type: "Character",
        color: "Blue",
        rarity: "R",
        market: null,
      },
      {
        id: "cp-priced",
        name: "Alpha",
        set: "Set",
        setCode: "OP01",
        number: "001",
        type: "Character",
        color: "Red",
        rarity: "R",
        market: {
          marketPrice: 12,
          averagePrice: 12,
          lowestPrice: null,
          highestPrice: null,
          updatedAt: "2026-03-25T00:00:00.000Z",
          stale: false,
          cached: true,
          source: "justtcg",
        },
      },
    ],
    "price_desc",
    "alpha",
  );

  assert.equal(sorted[0]?.id, "cp-priced");
  assert.equal(sorted[1]?.id, "cp-unpriced");
});

test("blank market browse defaults to newest sorting", async () => {
  const { resolveMarketSortForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  assert.equal(resolveMarketSortForTesting("", undefined), "newest");
  assert.equal(resolveMarketSortForTesting("luffy", undefined), "relevance");
  assert.equal(resolveMarketSortForTesting("", "price_desc"), "price_desc");
});

test("legacy market watch shape keeps weekly movers separate from losers and preserves bounty union", async () => {
  const { toLegacyMarketWatchShape } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  const watch = toLegacyMarketWatchShape({
    source: "justtcg-runtime-pricing",
    updatedAt: "2026-03-25T00:00:00.000Z",
    cards: {
      topGainers24h: [
        {
          collectibleId: "card-gain",
          collectibleKind: "raw_card",
          cardId: "OP01-001",
          name: "Card Gain",
          justtcgTitle: "Card Gain",
          imageUrl: null,
          currentPrice: 15,
          priceChange24h: 3,
          previousPrice: 12,
          dailyChangePct: 25,
          updatedAt: "2026-03-25T00:00:00.000Z",
          officialSetCode: "OP01",
          officialSetName: "Romance Dawn",
          source: "justtcg-runtime-pricing",
        },
      ],
      topLosers24h: [
        {
          collectibleId: "card-loss",
          collectibleKind: "raw_card",
          cardId: "OP01-002",
          name: "Card Loss",
          justtcgTitle: "Card Loss",
          imageUrl: null,
          currentPrice: 8,
          priceChange24h: -2,
          previousPrice: 10,
          dailyChangePct: -20,
          updatedAt: "2026-03-25T00:00:00.000Z",
          officialSetCode: "OP01",
          officialSetName: "Romance Dawn",
          source: "justtcg-runtime-pricing",
        },
      ],
    },
    sealed: {
      topGainers24h: [
        {
          collectibleId: "sealed-gain",
          collectibleKind: "sealed",
          cardId: null,
          name: "Sealed Gain",
          justtcgTitle: "Sealed Gain",
          imageUrl: null,
          currentPrice: 120,
          priceChange24h: 20,
          previousPrice: 100,
          dailyChangePct: 20,
          updatedAt: "2026-03-25T00:00:00.000Z",
          officialSetCode: "OP01",
          officialSetName: "Romance Dawn",
          source: "justtcg-runtime-pricing",
        },
      ],
      topLosers24h: [],
    },
  });

  assert.equal(watch.topDaily[0]?.collectibleId, "card-gain");
  assert.equal(watch.topWeekly.some((row) => row.collectibleId === "card-loss"), true);
  assert.equal(watch.topWeekly.some((row) => row.collectibleId === "sealed-gain"), true);
  assert.equal(watch.bountyBoard.some((row) => row.collectibleId === "card-gain"), true);
  assert.equal(watch.bountyBoard.some((row) => row.collectibleId === "card-loss"), true);
});

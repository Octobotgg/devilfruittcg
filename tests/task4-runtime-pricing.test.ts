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
        externalVariantId: "justtcg:123:nm",
        activeExternalVariantId: "justtcg:123:nm",
        variantCondition: "Near Mint",
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
  assert.equal((result as { externalVariantId?: string | null }).externalVariantId, "justtcg:123:nm");
  assert.equal(result.justtcg.title, "Monkey D. Luffy OP01-001");
});

test("variant-backed raw card pricing exposes the active NM variant", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-variant-priced", {
    loadRows: async () => [
      {
        cardPrintId: "cp-variant-priced",
        cardId: "OP01-001",
        printedCardCode: "OP01-001",
        officialName: "Monkey D. Luffy",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:123",
        externalVariantId: "justtcg:123:nm",
        activeExternalVariantId: "justtcg:123:nm",
        variantCondition: "Near Mint",
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
  assert.equal(result.cardPrintId, "cp-variant-priced");
  assert.equal((result as { externalVariantId?: string | null }).externalVariantId, "justtcg:123:nm");
  assert.equal(result.currentPrice, 12.5);
  assert.equal(result.currentPriceType, "near_mint");
  assert.equal(result.currency, "USD");
  assert.equal(result.justtcg.title, "Monkey D. Luffy OP01-001");
});

test("non-NM active variants remain unpriced", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-non-nm-variant", {
    loadRows: async () => [
      {
        cardPrintId: "cp-non-nm-variant",
        cardId: "OP01-002",
        printedCardCode: "OP01-002",
        officialName: "Roronoa Zoro",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:124",
        externalVariantId: "justtcg:124-lp",
        activeExternalVariantId: "justtcg:124-lp",
        variantCondition: "Lightly Played",
        productKind: "raw_card",
        justtcgTitle: "Roronoa Zoro OP01-002",
        justtcgImageUrl: "https://img.example/zoro.jpg",
        mappingApproved: true,
        priceMarket: "11.00",
        priceNm: "10.50",
        priceLp: "9.25",
        priceChange24h: "0.75",
        updatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
      },
    ],
  });

  assert.equal(result.status, "unpriced");
  assert.equal(result.reason, "missing_active_approved_mapping");
});

test("product-level links without an active NM variant remain unpriced", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/card-print-prices")>(
      "lib/server/pricing/card-print-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-no-active-variant", {
    loadRows: async () => [
      {
        cardPrintId: "cp-no-active-variant",
        cardId: "OP01-010",
        printedCardCode: "OP01-010",
        officialName: "Nami",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:456",
        externalVariantId: null,
        activeExternalVariantId: null,
        productKind: "raw_card",
        justtcgTitle: "Nami OP01-010",
        justtcgImageUrl: "https://img.example/nami.jpg",
        mappingApproved: true,
        priceMarket: "15.00",
        priceNm: "14.50",
        priceLp: "11.25",
        priceChange24h: "0.80",
        updatedAt: "2026-03-25T00:00:00.000Z",
        fetchedAt: "2026-03-25T00:05:00.000Z",
      },
    ],
  });

  assert.equal(result.status, "unpriced");
  assert.equal(result.reason, "missing_active_approved_mapping");
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

test("market search does not price raw card rows unless the active variant is NM", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const result = toMarketCardResultForTesting({
    cardPrintId: "cp-nm-guard",
    cardId: "OP01-011",
    printedCardCode: "OP01-011",
    variantLabel: "Base",
    variantSlug: "base",
    cardName: "Usopp",
    setCode: "OP01",
    setName: "Romance Dawn",
    number: "011",
    cardType: "Character",
    color: "Red",
    rarity: "C",
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
    productKind: "raw_card",
    activeExternalVariantId: "justtcg:124-lp",
    externalVariantId: "justtcg:124-lp",
    variantCondition: "Lightly Played",
    justtcgTitle: "Usopp OP01-011",
    justtcgImageUrl: "https://img.example/usopp.jpg",
    mappingApproved: true,
    priceNm: "8.00",
    priceLp: "6.50",
    priceChange7d: "1.25",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  });

  assert.equal(result.pricingStatus, "unpriced");
  assert.equal(result.market, null);
  assert.equal(result.currentPrice, null);
});

test("market search still uses published pricing when candidate active variant state is missing", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const result = toMarketCardResultForTesting({
    cardPrintId: "cp-published-1",
    cardId: "OP01-012",
    printedCardCode: "OP01-012",
    variantLabel: "Alternate Art",
    variantSlug: "alternate-art",
    cardName: "Monkey D. Luffy",
    setCode: "OP01",
    setName: "Romance Dawn",
    number: "012",
    cardType: "Character",
    color: "Red",
    rarity: "SR",
    cost: 5,
    life: null,
    power: 6000,
    counter: 1000,
    attribute: "Strike",
    traits: "Straw Hat Crew",
    effectText: null,
    triggerText: null,
    imageUrl: "https://img.example/internal-luffy.jpg",
    releaseDate: "2025-01-01",
    productKind: "raw_card",
    activeExternalVariantId: null,
    externalVariantId: "justtcg:125:nm",
    variantCondition: "Near Mint",
    justtcgTitle: "Monkey D. Luffy (012) (Alternate Art)",
    justtcgImageUrl: "https://img.example/provider-luffy.jpg",
    mappingApproved: true,
    priceNm: "4435.99",
    priceLp: "4120.00",
    priceChange7d: "150.00",
    updatedAt: "2026-03-25T00:00:00.000Z",
    fetchedAt: "2026-03-25T00:05:00.000Z",
  });

  assert.equal(result.pricingStatus, "priced");
  assert.equal(result.market?.marketPrice, 4435.99);
  assert.equal(result.currentPrice, 4435.99);
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

test("market home trusts published raw-card rows even when candidate active product state drifts", async () => {
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
        externalProductId: "justtcg:published",
        activeExternalProductId: "justtcg:stale-candidate",
        externalVariantId: "justtcg:published:nm",
        activeExternalVariantId: null,
        variantCondition: "Near Mint",
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
    true,
  );
});

test("market home rejects remapped sealed rows that do not match the active external product", async () => {
  const { passesMarketMoverTrustFilters } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  assert.equal(
    passesMarketMoverTrustFilters(
      {
        collectibleId: "sealed-remapped",
        collectibleKind: "sealed",
        cardId: null,
        officialName: "Romance Dawn Booster Box",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:sealed-old",
        activeExternalProductId: "justtcg:sealed-new",
        justtcgTitle: "Old sealed listing",
        justtcgImageUrl: "https://img.example/old-sealed.jpg",
        currentPrice: "110.00",
        priceChange24h: "10.00",
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

test("market home rejects raw card movers unless the active variant is NM", async () => {
  const { passesMarketMoverTrustFilters } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  assert.equal(
    passesMarketMoverTrustFilters(
      {
        collectibleId: "cp-nm-guard",
        collectibleKind: "raw_card",
        cardId: "OP01-011",
        officialName: "Usopp",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:124",
        activeExternalProductId: "justtcg:124",
        externalVariantId: "justtcg:124-lp",
        activeExternalVariantId: "justtcg:124-lp",
        variantCondition: "Lightly Played",
        justtcgTitle: "Usopp OP01-011",
        justtcgImageUrl: "https://img.example/usopp.jpg",
        currentPrice: "8.00",
        priceChange24h: "1.00",
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

test("market home sealed movers stay compatible without variant gating", async () => {
  const { passesMarketMoverTrustFilters } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  assert.equal(
    passesMarketMoverTrustFilters(
      {
        collectibleId: "sealed-ok",
        collectibleKind: "sealed",
        cardId: null,
        officialName: "Romance Dawn Booster Box",
        officialSetCode: "OP01",
        officialSetName: "Romance Dawn",
        externalProductId: "justtcg:sealed-1",
        activeExternalProductId: "justtcg:sealed-1",
        justtcgTitle: "Romance Dawn Booster Box",
        justtcgImageUrl: "https://img.example/box.jpg",
        currentPrice: "110.00",
        priceChange24h: "10.00",
        updatedAt: "2026-03-25T00:00:00.000Z",
        mappingApproved: true,
      },
      {
        minimumPriceFloor: 0,
        maximumAbsoluteDelta: 500,
        maximumPercentSwing: 500,
      },
    ),
    true,
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

test("portfolio summary chart does not carry forward stale history into today when runtime price is unpriced", async () => {
  const { buildPortfolioSummary } =
    await importModule<typeof import("../lib/server/collection/portfolio-summary")>(
      "lib/server/collection/portfolio-summary.ts",
    );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(12, 0, 0, 0);

  const summary = await buildPortfolioSummary(
    [
      { cardPrintId: "cp-priced-current", quantity: 1 },
      { cardPrintId: "cp-missing-current-price", quantity: 1 },
    ],
    {
      range: "7D",
      loadPrices: async () =>
        new Map([
          [
            "cp-priced-current",
            {
              status: "priced",
              kind: "raw_card",
              cardPrintId: "cp-priced-current",
              cardId: "OP01-001",
              printedCardCode: "OP01-001",
              currency: "USD",
              currentPrice: 10,
              currentPriceType: "near_mint",
              priceMarket: 10.5,
              priceLp: 9,
              priceChange24h: 1,
              updatedAt: now.toISOString(),
              fetchedAt: now.toISOString(),
              externalProductId: "justtcg:current",
              justtcg: {
                title: "Current card",
                imageUrl: "https://img.example/current.jpg",
              },
              official: {
                name: "Current Card",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
            },
          ],
          [
            "cp-missing-current-price",
            {
              status: "unpriced",
              kind: "raw_card",
              cardPrintId: "cp-missing-current-price",
              reason: "missing_current_price",
              currency: "USD",
            },
          ],
        ]),
      loadHistory: async () =>
        new Map([
          [
            "cp-missing-current-price",
            [
              {
                cardPrintId: "cp-missing-current-price",
                recordedAt: yesterday.toISOString(),
                price: 99,
                externalProductId: "justtcg:old",
                approvedActive: true,
              },
            ],
          ],
        ]),
    },
  );

  assert.equal(summary.totalCollectionValue, 10);
  assert.deepEqual(summary.chartHistory.at(-1), {
    date: today,
    value: 10,
  });
});

test("portfolio summary ignores history rows from stale or non-approved product links", async () => {
  const { buildPortfolioSummary } =
    await importModule<typeof import("../lib/server/collection/portfolio-summary")>(
      "lib/server/collection/portfolio-summary.ts",
    );

  const now = new Date();
  const activeRecordedAt = new Date(now);
  activeRecordedAt.setUTCDate(activeRecordedAt.getUTCDate() - 3);
  activeRecordedAt.setUTCHours(12, 0, 0, 0);

  const staleRecordedAt = new Date(now);
  staleRecordedAt.setUTCDate(staleRecordedAt.getUTCDate() - 2);
  staleRecordedAt.setUTCHours(12, 0, 0, 0);

  const today = now.toISOString().slice(0, 10);
  const activeDay = activeRecordedAt.toISOString().slice(0, 10);
  const staleDay = staleRecordedAt.toISOString().slice(0, 10);

  const summary = await buildPortfolioSummary(
    [{ cardPrintId: "cp-remapped-history", quantity: 1 }],
    {
      range: "ALL",
      loadPrices: async () =>
        new Map([
          [
            "cp-remapped-history",
            {
              status: "priced",
              kind: "raw_card",
              cardPrintId: "cp-remapped-history",
              cardId: "OP01-099",
              printedCardCode: "OP01-099",
              currency: "USD",
              currentPrice: 12,
              currentPriceType: "near_mint",
              priceMarket: 12.5,
              priceLp: 11,
              priceChange24h: 1,
              updatedAt: now.toISOString(),
              fetchedAt: now.toISOString(),
              externalProductId: "justtcg:active",
              justtcg: {
                title: "Approved active listing",
                imageUrl: "https://img.example/active.jpg",
              },
              official: {
                name: "Approved Card",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
            },
          ],
        ]),
      loadHistory: async () =>
        new Map([
          [
            "cp-remapped-history",
            [
              {
                cardPrintId: "cp-remapped-history",
                recordedAt: activeRecordedAt.toISOString(),
                price: 10,
                externalProductId: "justtcg:active",
                approvedActive: true,
              },
              {
                cardPrintId: "cp-remapped-history",
                recordedAt: staleRecordedAt.toISOString(),
                price: 50,
                externalProductId: "justtcg:stale",
                approvedActive: false,
              },
            ],
          ],
        ]),
    },
  );

  assert.deepEqual(summary.chartHistory, [
    {
      date: activeDay,
      value: 10,
    },
    {
      date: today,
      value: 12,
    },
  ]);
  assert.equal(summary.chartHistory.some((point) => point.date === staleDay), false);
});

test("portfolio summary carries forward the last approved active price at the selected range boundary", async () => {
  const { buildPortfolioSummary } =
    await importModule<typeof import("../lib/server/collection/portfolio-summary")>(
      "lib/server/collection/portfolio-summary.ts",
    );

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 7);

  const carriedForwardRecordedAt = new Date(rangeStart);
  carriedForwardRecordedAt.setDate(carriedForwardRecordedAt.getDate() - 1);
  carriedForwardRecordedAt.setUTCHours(12, 0, 0, 0);
  const inRangeRecordedAt = new Date(rangeStart);
  inRangeRecordedAt.setDate(inRangeRecordedAt.getDate() + 2);
  inRangeRecordedAt.setUTCHours(12, 0, 0, 0);

  const rangeStartDay = rangeStart.toISOString().slice(0, 10);
  const inRangeDay = inRangeRecordedAt.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const summary = await buildPortfolioSummary(
    [{ cardPrintId: "cp-carry-forward", quantity: 1 }],
    {
      range: "7D",
      loadPrices: async () =>
        new Map([
          [
            "cp-carry-forward",
            {
              status: "priced",
              kind: "raw_card",
              cardPrintId: "cp-carry-forward",
              cardId: "OP01-100",
              printedCardCode: "OP01-100",
              currency: "USD",
              currentPrice: 8,
              currentPriceType: "near_mint",
              priceMarket: 8.5,
              priceLp: 7.5,
              priceChange24h: 1,
              updatedAt: now.toISOString(),
              fetchedAt: now.toISOString(),
              externalProductId: "justtcg:active",
              justtcg: {
                title: "Boundary card",
                imageUrl: "https://img.example/boundary.jpg",
              },
              official: {
                name: "Boundary Card",
                setCode: "OP01",
                setName: "Romance Dawn",
              },
            },
          ],
        ]),
      loadHistory: async () =>
        new Map([
          [
            "cp-carry-forward",
            [
              {
                cardPrintId: "cp-carry-forward",
                recordedAt: carriedForwardRecordedAt.toISOString(),
                price: 4,
                externalProductId: "justtcg:active",
                approvedActive: true,
              },
              {
                cardPrintId: "cp-carry-forward",
                recordedAt: inRangeRecordedAt.toISOString(),
                price: 6,
                externalProductId: "justtcg:active",
                approvedActive: true,
              },
            ],
          ],
        ]),
    },
  );

  assert.deepEqual(summary.chartHistory, [
    {
      date: rangeStartDay,
      value: 4,
    },
    {
      date: inRangeDay,
      value: 6,
    },
    {
      date: today,
      value: 8,
    },
  ]);
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

test("legacy market watch shape builds the homepage bounty board from raw-card 24h dollar movers", async () => {
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
          collectibleId: "card-big-dollar",
          collectibleKind: "raw_card",
          cardId: "OP01-003",
          name: "Card Big Dollar",
          justtcgTitle: "Card Big Dollar",
          imageUrl: null,
          currentPrice: 110,
          priceChange24h: 10,
          previousPrice: 100,
          dailyChangePct: 10,
          updatedAt: "2026-03-25T00:00:00.000Z",
          officialSetCode: "OP01",
          officialSetName: "Romance Dawn",
          source: "justtcg-runtime-pricing",
        },
        {
          collectibleId: "card-high-pct",
          collectibleKind: "raw_card",
          cardId: "OP01-001",
          name: "Card High Pct",
          justtcgTitle: "Card High Pct",
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
          collectibleId: "sealed-huge",
          collectibleKind: "sealed",
          cardId: null,
          name: "Sealed Huge",
          justtcgTitle: "Sealed Huge",
          imageUrl: null,
          currentPrice: 220,
          priceChange24h: 40,
          previousPrice: 180,
          dailyChangePct: 22.22,
          updatedAt: "2026-03-25T00:00:00.000Z",
          officialSetCode: "OP01",
          officialSetName: "Romance Dawn",
          source: "justtcg-runtime-pricing",
        },
      ],
      topLosers24h: [],
    },
  });

  assert.deepEqual(
    watch.bountyBoard.map((row) => row.collectibleId),
    ["card-big-dollar", "card-high-pct", "card-loss"],
  );
  assert.equal(watch.bountyBoard.every((row) => row.collectibleKind === "raw_card"), true);
});

test("market home mover queries exclude inactive raw and sealed collectibles", async () => {
  const { getMarketHomeMoverQueriesForTesting } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  const queries = getMarketHomeMoverQueriesForTesting();

  assert.match(queries.rawCardQuery, /where published\.source_id = 'justtcg'\s+and cp\.is_active = true/i);
  assert.match(queries.sealedQuery, /where current_prices\.source_id = 'justtcg'\s+and sealed\.is_active = true/i);
});

test("market home mover queries read published rows without candidate active-state joins", async () => {
  const { getMarketHomeMoverQueriesForTesting } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  const queries = getMarketHomeMoverQueriesForTesting();

  assert.match(queries.rawCardQuery, /on cp\.id = published\.card_print_id/i);
  assert.doesNotMatch(queries.rawCardQuery, /cp\.active_external_product_id = published\.external_product_id/i);
  assert.doesNotMatch(queries.rawCardQuery, /cp\.active_external_variant_id = published\.external_variant_id/i);
  assert.match(queries.sealedQuery, /link\.mapping_status = 'exact'/i);
});

test("portfolio history boundary query preserves external variant ids in boundary rows", async () => {
  const { getPortfolioHistoryQueryForTesting } =
    await importModule<typeof import("../lib/server/collection/portfolio-summary")>(
      "lib/server/collection/portfolio-summary.ts",
    );

  const query = getPortfolioHistoryQueryForTesting(true);

  assert.match(
    query,
    /boundary_seed as \(\s*select distinct on \(card_print_id\)\s*card_print_id,\s*external_product_id,\s*external_variant_id,/iu,
  );
  assert.match(query, /select \* from boundary_seed/iu);
});

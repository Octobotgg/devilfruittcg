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

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

type PublishedRowFixture = {
  cardPrintId: string;
  cardId?: string | null;
  printedCardCode?: string | null;
  officialName?: string | null;
  officialSetCode?: string | null;
  officialSetName?: string | null;
  externalProductId?: string | null;
  externalVariantId?: string | null;
  activeExternalVariantId?: string | null;
  productKind?: string | null;
  variantCondition?: string | null;
  justtcgTitle?: string | null;
  justtcgImageUrl?: string | null;
  displayTitle?: string | null;
  displaySetName?: string | null;
  displaySetCode?: string | null;
  displayRarity?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
  labelStatus?: string | null;
  priceMarket?: string | number | null;
  priceNm?: string | number | null;
  priceLp?: string | number | null;
  verificationStatus?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

function createPublishedRow(
  overrides: Partial<PublishedRowFixture> = {},
): PublishedRowFixture {
  return {
    cardPrintId: "cp-1",
    cardId: "OP01-001",
    printedCardCode: "OP01-001",
    officialName: "Monkey D. Luffy",
    officialSetCode: "OP01",
    officialSetName: "Romance Dawn",
    externalProductId: "product-1",
    externalVariantId: "variant-1",
    activeExternalVariantId: "variant-1",
    productKind: "raw_card",
    variantCondition: "Near Mint",
    justtcgTitle: "Monkey D. Luffy OP01-001",
    justtcgImageUrl: "https://img.example/luffy-provider.jpg",
    displayTitle: "Monkey D. Luffy",
    displaySetName: "Romance Dawn",
    displaySetCode: "OP01",
    displayRarity: "SR",
    displayTreatmentLabel: "Alternate Art",
    displayImageUrl: "https://img.example/luffy-display.jpg",
    labelStatus: "normalized",
    priceMarket: "14.25",
    priceNm: "12.50",
    priceLp: "10.25",
    verificationStatus: "verified",
    updatedAt: "2026-03-27T00:00:00.000Z",
    publishedAt: "2026-03-27T00:05:00.000Z",
    ...overrides,
  };
}

test("published runtime pricing returns a priced card from published rows", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/published-card-prices")>(
      "lib/server/pricing/published-card-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-1", {
    loadRows: async () => [createPublishedRow()],
  });

  assert.equal(result.status, "priced");
  assert.equal(result.cardPrintId, "cp-1");
  assert.equal(result.currentPrice, 12.5);
  assert.equal(result.currentPriceType, "near_mint");
  assert.equal(result.currency, "USD");
  assert.equal(result.justtcg.title, "Monkey D. Luffy");
  assert.equal(result.justtcg.imageUrl, "https://img.example/luffy-display.jpg");
});

test("published runtime pricing returns Unpriced when no published row exists", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/published-card-prices")>(
      "lib/server/pricing/published-card-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-missing", {
    loadRows: async () => [],
  });

  assert.equal(result.status, "unpriced");
  assert.equal(result.reason, "missing_active_approved_mapping");
});

test("published runtime pricing falls back to safe internal labels when display rows are missing", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/published-card-prices")>(
      "lib/server/pricing/published-card-prices.ts",
    );

  const result = await getCardPrintRuntimePrice("cp-1", {
    loadRows: async () => [
      createPublishedRow({
        displayTitle: null,
        displaySetName: null,
        displaySetCode: null,
        displayRarity: null,
        displayTreatmentLabel: null,
        displayImageUrl: null,
        labelStatus: null,
      }),
    ],
  });

  assert.equal(result.status, "priced");
  assert.equal(result.justtcg.title, "Monkey D. Luffy");
  assert.equal(result.justtcg.imageUrl, "https://img.example/luffy-provider.jpg");
  assert.deepEqual(result.official, {
    name: "Monkey D. Luffy",
    setCode: "OP01",
    setName: "Romance Dawn",
  });
});

test("published runtime pricing blocks product-kind mismatches and non-NM variants", async () => {
  const { getCardPrintRuntimePrice } =
    await importModule<typeof import("../lib/server/pricing/published-card-prices")>(
      "lib/server/pricing/published-card-prices.ts",
    );

  const kindMismatch = await getCardPrintRuntimePrice("cp-kind", {
    loadRows: async () => [createPublishedRow({ cardPrintId: "cp-kind", productKind: "sealed" })],
  });
  const nonNmVariant = await getCardPrintRuntimePrice("cp-lp", {
    loadRows: async () => [createPublishedRow({ cardPrintId: "cp-lp", variantCondition: "Lightly Played" })],
  });

  assert.equal(kindMismatch.status, "unpriced");
  assert.equal(kindMismatch.reason, "kind_mismatch");
  assert.equal(nonNmVariant.status, "unpriced");
  assert.equal(nonNmVariant.reason, "missing_active_approved_mapping");
});

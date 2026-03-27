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

function createMarketSearchRow(overrides: Record<string, unknown> = {}) {
  return {
    cardPrintId: "cp-1",
    cardId: "OP13-120",
    printedCardCode: "OP13-120",
    variantLabel: "Alternate Art",
    variantSlug: "alt-art",
    cardName: "Sabo",
    setCode: "OP13",
    setName: "A Fist of Divine Speed",
    number: "120",
    cardType: "Character",
    color: "Red",
    rarity: "SEC",
    cost: 6,
    life: null,
    power: 7000,
    counter: 1000,
    attribute: "Special",
    traits: "Revolutionary Army",
    effectText: null,
    triggerText: null,
    imageUrl: "https://img.example/internal-sabo.jpg",
    releaseDate: "2026-03-01",
    productKind: "raw_card",
    activeExternalVariantId: "variant-1",
    externalVariantId: "variant-1",
    variantCondition: "Near Mint",
    justtcgTitle: "Sabo (120) (Red Super Alternate Art)",
    justtcgImageUrl: "https://img.example/provider-sabo.jpg",
    mappingApproved: true,
    priceNm: "4749.97",
    priceLp: "4388.00",
    priceChange7d: "120.00",
    updatedAt: "2026-03-27T00:00:00.000Z",
    fetchedAt: "2026-03-27T00:05:00.000Z",
    ...overrides,
  };
}

test("market row mapping prefers published display payload when present", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const card = toMarketCardResultForTesting(
    createMarketSearchRow({
      displayTitle: "Sabo",
      displaySetName: "Carrying On His Will",
      displaySetCode: "OP13",
      displayRarity: "SEC",
      displayTreatmentLabel: "Red Super Alternate Art",
      displayImageUrl: "https://img.example/published-sabo.jpg",
      labelStatus: "verified",
    }) as never,
  );

  assert.equal(card.name, "Sabo");
  assert.equal(card.set, "Carrying On His Will");
  assert.equal(card.setCode, "OP13");
  assert.equal(card.rarity, "SEC");
  assert.equal(card.variantLabel, "Red Super Alternate Art");
  assert.equal(card.imageUrl, "https://img.example/published-sabo.jpg");
});

test("market row mapping falls back to safe internal fields when no published display exists", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );

  const card = toMarketCardResultForTesting(createMarketSearchRow() as never);

  assert.equal(card.name, "Sabo");
  assert.equal(card.set, "A Fist of Divine Speed");
  assert.equal(card.variantLabel, "Alternate Art");
  assert.equal(card.imageUrl, "https://img.example/internal-sabo.jpg");
});

test("market row mapping suppresses treatment chips when the published display row leaves the treatment blank", async () => {
  const { toMarketCardResultForTesting } =
    await importModule<typeof import("../lib/server/market/market-search")>(
      "lib/server/market/market-search.ts",
    );
  const { marketVariantDisplayLabel } =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  const card = toMarketCardResultForTesting(
    createMarketSearchRow({
      displayTitle: "Sabo",
      displaySetName: "Carrying On His Will",
      displaySetCode: "OP13",
      displayRarity: "SEC",
      displayTreatmentLabel: null,
      labelStatus: "verified",
    }) as never,
  );

  assert.equal(card.variantLabel, undefined);
  assert.equal(marketVariantDisplayLabel(card), null);
});

test("market home raw-card query reads published pricing and display rows", async () => {
  const { getMarketHomeMoverQueriesForTesting } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  const { rawCardQuery } = getMarketHomeMoverQueriesForTesting();

  assert.match(rawCardQuery, /card_print_price_published/u);
  assert.match(rawCardQuery, /card_print_display_published/u);
  assert.match(rawCardQuery, /published\.price_nm as "currentPrice"/u);
  assert.match(rawCardQuery, /current_prices\.price_change_24h as "priceChange24h"/u);
  assert.match(rawCardQuery, /variant\.id = published\.external_variant_id/u);
  assert.match(rawCardQuery, /variant\.external_product_id = published\.external_product_id/u);
});

test("market home mover mapping does not leak provider images when no published or internal image exists", async () => {
  const { toMarketMoverForTesting } =
    await importModule<typeof import("../lib/server/market/market-home")>(
      "lib/server/market/market-home.ts",
    );

  const mover = toMarketMoverForTesting({
    collectibleId: "cp-1",
    collectibleKind: "raw_card",
    cardId: "OP13-120",
    officialName: "Sabo",
    officialSetCode: "OP13",
    officialSetName: "Carrying On His Will",
    externalProductId: "product-1",
    activeExternalProductId: null,
    externalVariantId: "variant-1",
    activeExternalVariantId: null,
    variantCondition: "Near Mint",
    justtcgTitle: "Sabo (120) (Red Super Alternate Art)",
    justtcgImageUrl: "https://img.example/provider-sabo.jpg",
    displayTitle: "Sabo",
    displayImageUrl: null,
    internalImageUrl: null,
    currentPrice: "4749.97",
    priceChange24h: "150.00",
    updatedAt: "2026-03-27T00:00:00.000Z",
    mappingApproved: true,
  });

  assert.equal(mover?.imageUrl, null);
});

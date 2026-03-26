import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Card } from "../lib/cards";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("formatMarketSetLabel strips bracket codes and humanizes sluggy set names", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  assert.equal(marketDisplay.formatMarketSetLabel("ROMANCE DAWN [OP01]"), "Romance Dawn");
  assert.equal(
    marketDisplay.formatMarketSetLabel("CHAMPIONSHIP_25_26_FINALS_SEASON_1"),
    "Championship 25-26 Finals Season 1",
  );
  assert.equal(
    marketDisplay.formatMarketSetLabel("Premium Card Collection -Live Action Edition-"),
    "Premium Card Collection -Live Action Edition-",
  );
});

test("formatMarketSetFacetLabel keeps compact real codes and hides sluggy internal ones", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  assert.equal(
    marketDisplay.formatMarketSetFacetLabel("OP09", "EMPERORS IN THE NEW WORLD [OP-09]"),
    "OP09 · Emperors In The New World",
  );
  assert.equal(
    marketDisplay.formatMarketSetFacetLabel(
      "CHAMPIONSHIP_25_26_FINALS_SEASON_1",
      "CHAMPIONSHIP_25_26_FINALS_SEASON_1",
    ),
    "Championship 25-26 Finals Season 1",
  );
});

test("formatMarketSetLabel supports compact market card labels for long event names", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  assert.equal(
    marketDisplay.formatMarketSetLabel("Championship 25-26 Finals Season 1", { compact: true }),
    "Championship 25-26 Finals S1",
  );
  assert.equal(
    marketDisplay.formatMarketSetLabel("Championship 25-26 Offline Regionals Season 2", { compact: true }),
    "Championship 25-26 Regionals S2",
  );
  assert.equal(
    marketDisplay.formatMarketSetLabel("BANDAI CARD GAMES Fest 25-26", { compact: true }),
    "BANDAI Fest 25-26",
  );
  assert.equal(
    marketDisplay.formatMarketSetLabel("2025 NEW YEAR EVENT", { compact: true }),
    "2025 New Year Event",
  );
});

test("marketVariantDisplayLabel shows exact premium treatments and hides vague generic labels", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  const genericParallel: Pick<Card, "id" | "baseId" | "rarity" | "variantLabel"> = {
    id: "OP09-004_p4",
    baseId: "OP09-004",
    rarity: "SR",
    variantLabel: "Parallel",
  };

  const genericAltArt: Pick<Card, "id" | "baseId" | "rarity" | "variantLabel"> = {
    id: "OP09-004_p4",
    baseId: "OP09-004",
    rarity: "SR",
    variantLabel: "Alternate Art",
  };

  const specificSp: Pick<Card, "id" | "baseId" | "rarity" | "variantLabel"> = {
    id: "OP09-004_sp",
    baseId: "OP09-004",
    rarity: "SP",
    variantLabel: "SP",
  };

  assert.equal(marketDisplay.marketVariantDisplayLabel(genericParallel), null);
  assert.equal(marketDisplay.marketVariantDisplayLabel(genericAltArt), "Alternate Art");
  assert.equal(marketDisplay.marketVariantDisplayLabel(specificSp), "SP");
});

test("marketVariantDisplayLabel prefers exact JustTCG treatment wording when available", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  const fullArtCard = {
    id: "OP01-052_p3",
    baseId: "OP01-052",
    rarity: "UC",
    variantLabel: "Alternate Art",
    justtcgTitle: "Raizo (Full Art)",
  };

  const jollyRogerCard = {
    id: "OP01-033_p5",
    baseId: "OP01-033",
    rarity: "UC",
    variantLabel: "Parallel",
    justtcgTitle: "Izo (OP01-033) (Jolly Roger Foil)",
  };

  assert.equal(marketDisplay.marketVariantDisplayLabel(fullArtCard), "Full Art");
  assert.equal(marketDisplay.marketVariantDisplayLabel(jollyRogerCard), "Jolly Roger Foil");
});

test("marketVariantDisplayLabel cleans anniversary wording from JustTCG titles", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  const japaneseAnniversaryCard = {
    id: "ST13-015_p2",
    baseId: "ST13-015",
    rarity: "SR",
    variantLabel: "Anniversary",
    justtcgTitle: "Monkey.D.Luffy (One Piece Japanese Version 2nd Anniversary Set)",
  };

  assert.equal(marketDisplay.marketVariantDisplayLabel(japaneseAnniversaryCard), "Japanese 2nd Anniversary");
});

test("marketPriceDisplay uses an explicit unpriced state when no market price exists", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  assert.deepEqual(marketDisplay.marketPriceDisplay(null), {
    label: "Unpriced",
    sublabel: "No approved JustTCG price yet",
    tone: "muted",
  });

  assert.deepEqual(
    marketDisplay.marketPriceDisplay({
      marketPrice: 123.45,
      averagePrice: 123.45,
      lowestPrice: null,
      highestPrice: null,
      updatedAt: "2026-03-25T00:00:00.000Z",
      stale: false,
      cached: true,
      source: "justtcg",
    }),
    {
      label: "$123.45",
      sublabel: "TCG Market",
      tone: "priced",
    },
  );
});

test("marketEmptyStateCopy adapts to search and active filters", async () => {
  const marketDisplay =
    await importModule<typeof import("../lib/market-display")>("lib/market-display.ts");

  assert.deepEqual(marketDisplay.marketEmptyStateCopy({ query: "", activeFilterCount: 0 }), {
    title: "No cards found",
    body: "Try adjusting your filters or clearing the search to widen the results.",
    actionLabel: "Clear All Filters",
  });

  assert.deepEqual(marketDisplay.marketEmptyStateCopy({ query: "Shanks", activeFilterCount: 0 }), {
    title: 'No cards found for "Shanks"',
    body: "Try a different card name, set code, or number.",
    actionLabel: "Clear Search",
  });

  assert.deepEqual(marketDisplay.marketEmptyStateCopy({ query: "Shanks", activeFilterCount: 3 }), {
    title: "No cards match these filters",
    body: 'Clear a few filters or widen the search for "Shanks".',
    actionLabel: "Clear All Filters",
  });
});

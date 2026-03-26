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

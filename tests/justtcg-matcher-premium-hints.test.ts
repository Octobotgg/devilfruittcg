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

test("detectVariantHints recognizes richer premium treatments from official card metadata", async () => {
  const { detectVariantHints } =
    await importModule<typeof import("../scripts/lib/justtcg-matcher.mjs")>(
      "scripts/lib/justtcg-matcher.mjs",
    );

  assert.deepEqual(
    detectVariantHints({
      id: "OP13-120_p2",
      variantLabel: "Red Super Alternate Art",
      variantSlug: "red_super_alternate_art_op13_print_2",
      rarity: "SEC",
      name: "Sabo",
    }),
    ["red_super_alt", "super_alt", "alt"],
  );

  assert.deepEqual(
    detectVariantHints({
      id: "EB01-001_p2",
      variantLabel: "Jolly Roger Foil",
      variantSlug: "jolly_roger_foil",
      rarity: "L",
      name: "Monkey.D.Luffy",
    }),
    ["jolly_roger_foil"],
  );

  assert.deepEqual(
    detectVariantHints({
      id: "EB01-001_p3",
      variantLabel: "Full Art",
      variantSlug: "full_art",
      rarity: "L",
      name: "Monkey.D.Luffy",
    }),
    ["full_art"],
  );

  assert.deepEqual(
    detectVariantHints({
      id: "OP06-118_p2",
      variantLabel: "Treasure Rare",
      variantSlug: "treasure_rare",
      rarity: "TR",
      name: "Roronoa Zoro",
    }),
    ["treasure_rare"],
  );

  assert.deepEqual(
    detectVariantHints({
      id: "OP13-118_p4",
      variantLabel: "Wanted Poster",
      variantSlug: "wanted_poster_op13",
      rarity: "SEC",
      name: "Monkey.D.Luffy",
    }),
    ["wanted_poster"],
  );
});

test("candidatePremiumHints recognizes richer premium treatments from JustTCG titles", async () => {
  const { candidatePremiumHints } =
    await importModule<typeof import("../scripts/lib/justtcg-matcher.mjs")>(
      "scripts/lib/justtcg-matcher.mjs",
    );

  assert.deepEqual(
    candidatePremiumHints({
      id: "one-piece-card-game-carrying-on-his-will-sabo-120-red-super-alternate-art-secret-rare",
      name: "Sabo (120) (Red Super Alternate Art)",
      set: "Carrying On His Will",
    }),
    ["red_super_alt", "super_alt", "alt"],
  );

  assert.deepEqual(
    candidatePremiumHints({
      id: "one-piece-card-game-the-best-monkey-d-luffy-jolly-roger-foil",
      name: "Monkey.D.Luffy (Jolly Roger Foil)",
      set: "Premium Booster -One Piece Card The Best-",
    }),
    ["jolly_roger_foil"],
  );

  assert.deepEqual(
    candidatePremiumHints({
      id: "one-piece-card-game-the-best-monkey-d-luffy-full-art",
      name: "Monkey.D.Luffy (Full Art)",
      set: "Premium Booster -One Piece Card The Best-",
    }),
    ["full_art"],
  );

  assert.deepEqual(
    candidatePremiumHints({
      id: "one-piece-card-game-awakening-of-the-new-era-shanks-treasure-rare",
      name: "Shanks (Treasure Rare)",
      set: "Awakening of the New Era",
    }),
    ["treasure_rare"],
  );

  assert.deepEqual(
    candidatePremiumHints({
      id: "one-piece-card-game-carrying-on-his-will-monkey-d-luffy-118-wanted-poster-secret-rare",
      name: "Monkey.D.Luffy (118) (Wanted Poster)",
      set: "Carrying On His Will",
    }),
    ["wanted_poster"],
  );
});

test("detectVariantLane treats explicit special-print metadata as premium even without a variant suffix", async () => {
  const { detectVariantLane, classifyCatalogCard } =
    await importModule<typeof import("../scripts/lib/justtcg-matcher.mjs")>(
      "scripts/lib/justtcg-matcher.mjs",
    );

  assert.equal(
    detectVariantLane({
      id: "OP13-008",
      isVariant: true,
      variantType: "anniversary",
      variantLabel: "3rd Anniversary Tournament",
      variantSlug: "third_anniversary_tournament_op13",
    }),
    "premium",
  );

  assert.deepEqual(
    classifyCatalogCard({
      id: "one-piece-card-game-carrying-on-his-will-3rd-anniversary-tournament-cards-emporio-ivankov-common",
      name: "Emporio.Ivankov",
      set_name: "Carrying On His Will: 3rd Anniversary Tournament Cards",
    }),
    {
      bucket: "premium_candidate",
      reason: "premium_hint:anniversary",
    },
  );
});

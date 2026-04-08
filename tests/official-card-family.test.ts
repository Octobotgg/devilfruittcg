import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

test("official OP09-093 variants expose the corrected p1/p2/p3 family labels", async () => {
  const cardsModule = await import(pathToFileURL(path.join(REPO_ROOT, "data", "bandai-en-official-cards.json")).href, {
    with: { type: "json" },
  });
  const cards = cardsModule.default as Array<{
    id: string;
    variantType?: string;
    variantLabel?: string;
    variantSlug?: string;
  }>;
  const byId = new Map(cards.filter((card) => card.id.startsWith("OP09-093")).map((card) => [card.id, card]));

  assert.deepEqual(
    {
      id: "OP09-093_p1",
      variantType: byId.get("OP09-093_p1")?.variantType,
      variantLabel: byId.get("OP09-093_p1")?.variantLabel,
      variantSlug: byId.get("OP09-093_p1")?.variantSlug,
    },
    {
      id: "OP09-093_p1",
      variantType: "alt_art",
      variantLabel: "Alternate Art",
      variantSlug: "alternate_art_op09_print_1",
    },
  );

  assert.deepEqual(
    {
      id: "OP09-093_p2",
      variantType: byId.get("OP09-093_p2")?.variantType,
      variantLabel: byId.get("OP09-093_p2")?.variantLabel,
      variantSlug: byId.get("OP09-093_p2")?.variantSlug,
    },
    {
      id: "OP09-093_p2",
      variantType: "manga",
      variantLabel: "Manga",
      variantSlug: "manga_op09",
    },
  );

  assert.deepEqual(
    {
      id: "OP09-093_p3",
      variantType: byId.get("OP09-093_p3")?.variantType,
      variantLabel: byId.get("OP09-093_p3")?.variantLabel,
      variantSlug: byId.get("OP09-093_p3")?.variantSlug,
    },
    {
      id: "OP09-093_p3",
      variantType: "sp",
      variantLabel: "Wanted Poster",
      variantSlug: "wanted_poster_op09",
    },
  );
});

test("official OP14-112 variants expose the corrected alternate art and SP family labels", async () => {
  const cardsModule = await import(pathToFileURL(path.join(REPO_ROOT, "data", "bandai-en-official-cards.json")).href, {
    with: { type: "json" },
  });
  const cards = cardsModule.default as Array<{
    id: string;
    variantType?: string;
    variantLabel?: string;
    variantSlug?: string;
  }>;
  const byId = new Map(cards.filter((card) => card.id.startsWith("OP14-112")).map((card) => [card.id, card]));

  assert.deepEqual(
    {
      id: "OP14-112_p1",
      variantType: byId.get("OP14-112_p1")?.variantType,
      variantLabel: byId.get("OP14-112_p1")?.variantLabel,
      variantSlug: byId.get("OP14-112_p1")?.variantSlug,
    },
    {
      id: "OP14-112_p1",
      variantType: "alt_art",
      variantLabel: "Alternate Art",
      variantSlug: "alternate_art_op14",
    },
  );

  assert.deepEqual(
    {
      id: "OP14-112_p2",
      variantType: byId.get("OP14-112_p2")?.variantType,
      variantLabel: byId.get("OP14-112_p2")?.variantLabel,
      variantSlug: byId.get("OP14-112_p2")?.variantSlug,
    },
    {
      id: "OP14-112_p2",
      variantType: "sp",
      variantLabel: "SP",
      variantSlug: "sp_op14_print_2",
    },
  );
});

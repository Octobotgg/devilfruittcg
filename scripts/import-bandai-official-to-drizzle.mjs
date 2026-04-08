#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OFFICIAL_CARDS_PATH = path.join(ROOT, "data", "bandai-en-official-cards.json");
const OFFICIAL_RELEASES_PATH = path.join(ROOT, "data", "bandai-en-official-releases.json");

const GAME = {
  id: "one-piece-card-game",
  slug: "one-piece-card-game",
  name: "One Piece Card Game",
};

const DEFAULT_CHUNK_SIZE = 250;
const STANDARD_RELEASE_TYPES = new Set(["booster", "starter_deck", "premium_booster"]);
const OP13_THIRD_ANNIVERSARY_CARD_IDS = [
  "OP13-008",
  "OP13-010",
  "OP13-018",
  "OP13-020",
  "OP13-033",
  "OP13-041",
  "OP13-048",
  "OP13-052",
  "OP13-055",
  "OP13-056",
  "OP13-059",
  "OP13-060",
  "OP13-062",
  "OP13-068",
  "OP13-070",
  "OP13-088",
  "OP13-093",
  "OP13-103",
  "OP13-105",
  "OP13-106",
  "OP13-107",
  "OP13-111",
];
const OP13_VARIANT_OVERRIDES = new Map(
  [
    ["OP09-118_p3", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
    ["OP09-004_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op09" }],
    ["OP09-051_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op09" }],
    ["OP09-119_p2", { variantType: "manga", variantFamily: "manga", variantLabel: "Manga", variantSlug: "manga_op09" }],
    ["OP14-112_p1", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Alternate Art", variantSlug: "alternate_art_op14" }],
    ["OP14-112_p2", { variantType: "sp", variantFamily: "sp", variantLabel: "SP", variantSlug: "sp_op14_print_2" }],
    ["ST18-004_p1", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Treasure Rare", variantSlug: "treasure_rare_op09" }],
    ["OP11-058_p1", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Treasure Rare", variantSlug: "treasure_rare_op13" }],
    ...OP13_THIRD_ANNIVERSARY_CARD_IDS.map((id) => [
      id,
      {
        variantType: "anniversary",
        variantFamily: "anniversary",
        variantLabel: "3rd Anniversary Tournament",
        variantSlug: "third_anniversary_tournament_op13",
      },
    ]),
    ["OP13-080_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
    ["OP13-083_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
    ["OP13-084_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
    ["OP13-089_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
    ["OP13-091_p2", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Parallel", variantSlug: "parallel_op13_print_2" }],
    ["OP13-118_p2", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
    ["OP13-118_p3", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
    ["OP13-118_p4", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
    ["OP13-119_p2", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
    ["OP13-119_p3", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
    ["OP13-119_p4", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
    ["OP13-120_p2", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Super Alternate Art", variantSlug: "super_alternate_art_op13_print_2" }],
    ["OP13-120_p3", { variantType: "alternate_art", variantFamily: "alternate_art", variantLabel: "Red Super Alternate Art", variantSlug: "red_super_alternate_art_op13_print_3" }],
    ["OP13-120_p4", { variantType: "parallel", variantFamily: "parallel", variantLabel: "Wanted Poster", variantSlug: "wanted_poster_op13" }],
  ].map(([id, override]) => [id, Object.freeze(override)]),
);

function parseArgs(argv) {
  const args = {
    apply: false,
    seedOut: null,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--seed-out") {
      args.seedOut = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (token === "--chunk-size") {
      const parsed = Number.parseInt(argv[index + 1] || "", 10);
      if (Number.isFinite(parsed) && parsed > 0) args.chunkSize = parsed;
      index += 1;
    }
  }

  return args;
}

function cleanText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLookupKey(value) {
  return cleanText(value).toLowerCase();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function getConnectionString() {
  const raw = String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "")
    .replace(/\\n/g, "")
    .trim();

  if (!raw) {
    throw new Error("Missing DATABASE_URL or SUPABASE_DB_URL");
  }

  return raw;
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function mapReleaseType(release) {
  const category = String(release.category || "");
  const upperName = cleanText(release.name).toUpperCase();

  if (upperName.includes("PRE-RELEASE")) return "pre_release";
  if (upperName.includes("ANNIVERSARY")) return "anniversary";
  if (
    upperName.includes("TREASURE CUP") ||
    upperName.includes("CHAMPIONSHIP") ||
    upperName.includes("REGIONAL") ||
    upperName.includes("FINALIST") ||
    upperName.includes("PARTICIPATION") ||
    upperName.includes("WINNER") ||
    upperName.includes("EVENT PACK") ||
    upperName.includes("STORE 2-ON-2") ||
    upperName.includes("BANDAI CARD GAMES FEST")
  ) {
    return "event";
  }
  if (upperName.includes("DEMO DECK")) return "demo_deck";

  switch (category) {
    case "BOOSTER_PACK":
    case "EXTRA_BOOSTER":
      return "booster";
    case "PREMIUM_BOOSTER":
      return "premium_booster";
    case "STARTER_DECK":
    case "ULTRA_DECK":
      return "starter_deck";
    case "PROMOTION":
      return "promo";
    default:
      return "other";
  }
}

function deriveVariantType(card, releaseType) {
  const label = cleanText(card.variantLabel).toLowerCase();
  const slug = String(card.variantSlug || "").toLowerCase();
  const rawType = String(card.variantType || "").toLowerCase();
  const variantCode = String(card.variantCode || "").toLowerCase();

  if (!card.isVariant) return "base";
  if (label.includes("pre-release") || slug.includes("pre_release") || releaseType === "pre_release") return "pre_release";
  if (label.includes("jolly roger foil") || slug.includes("jolly_roger_foil")) return "jolly_roger_foil";
  if (label.includes("textured foil") || slug.includes("textured_foil")) return "textured_foil";
  if (label.includes("full art") || slug.includes("full_art")) return "full_art";
  if (label.includes("box topper") || slug.includes("box_topper")) return "box_topper";
  if (label.includes("treasure cup") || slug.includes("treasure_cup")) return "treasure_cup";
  if (label === "manga" || rawType === "manga") return "manga";
  if (label.includes("anniversary") || rawType === "anniversary") return "anniversary";
  if (label.startsWith("sp") || rawType === "sp") return "sp";
  if (label.includes("alternate art") || label.includes("super alternate art") || rawType === "alt_art") {
    return "alternate_art";
  }
  if (label.includes("reprint") || slug.startsWith("reprint_") || variantCode.startsWith("r")) return "reprint";
  if (rawType === "parallel") return "parallel";
  if (releaseType === "promo" || releaseType === "event") return "promo";
  return "other";
}

function deriveVariantFamily(card, variantType, releaseType) {
  const label = cleanText(card.variantLabel).toLowerCase();
  const slug = String(card.variantSlug || "").toLowerCase();

  if (!card.isVariant) return "base";
  if (variantType !== "parallel" && variantType !== "promo" && variantType !== "other") return variantType;
  if (label.includes("reprint") || slug.startsWith("reprint_")) return "reprint";
  if (label.includes("pre-release") || slug.includes("pre_release")) return "pre_release";
  if (label.includes("jolly roger foil") || slug.includes("jolly_roger_foil")) return "jolly_roger_foil";
  if (label.includes("textured foil") || slug.includes("textured_foil")) return "textured_foil";
  if (label.includes("full art") || slug.includes("full_art")) return "full_art";
  if (label.includes("box topper") || slug.includes("box_topper")) return "box_topper";
  if (label.includes("treasure cup") || slug.includes("treasure_cup")) return "treasure_cup";
  if (releaseType === "promo" || releaseType === "event") return "promo";
  if (variantType === "promo") return "promo";
  if (variantType === "other") return "other";
  return "parallel";
}

function deriveVariantLabel(card, variantType) {
  if (card.variantLabel) return cleanText(card.variantLabel);
  if (!card.isVariant) return "Base";
  if (variantType === "reprint") return "Reprint";
  if (variantType === "pre_release") return "Pre-Release";
  if (variantType === "alternate_art") return "Alternate Art";
  if (variantType === "full_art") return "Full Art";
  if (variantType === "jolly_roger_foil") return "Jolly Roger Foil";
  if (variantType === "textured_foil") return "Textured Foil";
  if (variantType === "box_topper") return "Box Topper";
  if (variantType === "treasure_cup") return "Treasure Cup";
  if (variantType === "anniversary") return "Anniversary";
  if (variantType === "manga") return "Manga";
  if (variantType === "sp") return "SP";
  if (variantType === "promo") return "Promo";
  return "Parallel";
}

function deriveVariantSlug(card, variantType, release) {
  if (card.variantSlug) return String(card.variantSlug).trim();
  if (!card.isVariant) return "base";
  return `${variantType}_${slugify(release.code || release.name || "release")}`;
}

function getVariantOverride(cardId) {
  return OP13_VARIANT_OVERRIDES.get(String(cardId || "").trim()) || null;
}

function buildSearchText(card) {
  return [
    card.name,
    card.set,
    card.setCode,
    card.number,
    card.type,
    card.color,
    card.rarity,
    card.attribute,
    card.traits,
    card.effect,
    card.trigger,
    ...(card.notes || []),
    ...(card.cardSetNames || []),
  ]
    .filter(Boolean)
    .map(cleanText)
    .join(" ");
}

function buildReleaseId(release) {
  return `release_${slugify(release.key || release.name)}`;
}

function createReleaseRows(releases) {
  const rows = [];
  const byName = new Map();
  const byCode = new Map();
  const byGameCodeLanguage = new Map();

  for (const release of releases) {
    const code = release.codes?.[0] || String(release.key || release.name || "release").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const compositeKey = [GAME.id, code, "EN"].join("::");
    const existingRow = byGameCodeLanguage.get(compositeKey);
    const row = existingRow || {
      id: buildReleaseId(release),
      game_id: GAME.id,
      code,
      name: cleanText(release.name),
      release_type: mapReleaseType(release),
      release_date: release.releaseDate || null,
      language: "EN",
      official_url: release.productUrl || null,
      is_active: true,
    };

    if (!existingRow) {
      rows.push(row);
      byGameCodeLanguage.set(compositeKey, row);
    }

    byName.set(normalizeLookupKey(release.name), row);
    if (release.codes?.[0]) byCode.set(release.codes[0], row);
  }

  return { rows, byName, byCode };
}

function resolveReleaseRow(card, releaseLookup) {
  const byName = releaseLookup.byName.get(normalizeLookupKey(card.set));
  if (byName) return byName;

  const byCode = card.releaseCode ? releaseLookup.byCode.get(card.releaseCode) : null;
  if (byCode) return byCode;

  throw new Error(`Unable to resolve release for ${card.id} (${card.set || "unknown set"})`);
}

function createCardRows(cards) {
  const baseCards = new Map();

  for (const card of cards) {
    const current = baseCards.get(card.baseId);
    if (!current || (!card.isVariant && current.isVariant)) {
      baseCards.set(card.baseId, card);
    }
  }

  return [...baseCards.values()].map((card) => ({
    id: card.baseId,
    game_id: GAME.id,
    base_card_code: card.baseId,
    name: cleanText(card.name),
    set_code: card.setCode,
    number: card.number,
    card_type: card.type,
    color: card.color,
    rarity: card.rarity,
    cost: card.cost ?? null,
    life: card.life ?? null,
    power: card.power ?? null,
    counter: card.counter ?? null,
    attribute: card.attribute ?? null,
    traits: card.traits ?? null,
    effect_text: card.effect ?? null,
    trigger_text: card.trigger ?? null,
    block_icon: card.blockIcon ?? null,
    search_text: buildSearchText(card),
    metadata: {
      set: card.set,
      cardSetNames: card.cardSetNames || [],
      notes: card.notes || [],
      seriesIds: card.seriesIds || [],
      seriesLabels: card.seriesLabels || [],
      seriesCategories: card.seriesCategories || [],
      releaseDatePrecision: card.releaseDatePrecision || null,
      releaseDateRaw: card.releaseDateRaw || null,
      manualReview: card.manualReview || [],
    },
  }));
}

function createCardPrintRows(cards, releaseLookup) {
  return cards.map((card) => {
    const release = resolveReleaseRow(card, releaseLookup);
    const variantOverride = getVariantOverride(card.id);
    const derivedVariantType = deriveVariantType(card, release.release_type);
    const variantType = variantOverride?.variantType || derivedVariantType;
    const variantFamily =
      variantOverride?.variantFamily || deriveVariantFamily(card, derivedVariantType, release.release_type);
    const releaseDateOverride = card.releaseDate && card.releaseDate !== release.release_date ? card.releaseDate : null;

    return {
      id: card.id,
      card_id: card.baseId,
      release_id: release.id,
      print_code: card.variantCode || "base",
      printed_card_code: card.id,
      variant_family: variantFamily,
      variant_type: variantType,
      variant_label: variantOverride?.variantLabel || deriveVariantLabel(card, variantType),
      variant_slug: variantOverride?.variantSlug || deriveVariantSlug(card, variantType, release),
      is_reprint: Boolean(card.isReprint),
      is_pre_release: variantType === "pre_release" || variantFamily === "pre_release",
      is_alt_art: variantType === "alternate_art",
      is_special_print: card.isVariant || variantType !== "base" || !STANDARD_RELEASE_TYPES.has(release.release_type),
      is_active: true,
      image_url: card.imageUrl || null,
      release_date_override: releaseDateOverride,
      official_source_id: card.id,
      metadata: {
        printedCardId: card.printedCardId,
        baseId: card.baseId,
        variantCode: card.variantCode,
        isVariant: Boolean(card.isVariant),
        set: card.set,
        cardSetNames: card.cardSetNames || [],
        notes: card.notes || [],
        seriesId: card.seriesId || null,
        seriesLabel: card.seriesLabel || null,
        seriesCategory: card.seriesCategory || null,
        releaseCode: card.releaseCode || null,
        releaseUrl: card.releaseUrl || null,
        releaseDatePrecision: card.releaseDatePrecision || null,
        releaseDateRaw: card.releaseDateRaw || null,
        originCardId: card.originCardId || null,
        originSet: card.originSet || null,
        canonicalId: card.canonicalId || null,
        manualReview: card.manualReview || [],
      },
    };
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeParamValue(column, value) {
  if (value === undefined) return null;
  if (column === "metadata") return value == null ? null : JSON.stringify(value);
  return value;
}

async function upsertRows(sql, tableName, rows, conflictColumns, chunkSize) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

  for (const group of chunk(rows, chunkSize)) {
    const params = [];
    let paramIndex = 1;
    const valuesSql = group
      .map((row) => {
        const placeholders = columns.map((column) => {
          const cast = column === "metadata" ? "::jsonb" : "";
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}${cast}`;
          paramIndex += 1;
          return token;
        });

        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const insertSql = [
      `insert into ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})`,
      `values ${valuesSql}`,
      `on conflict (${conflictColumns.map(quoteIdentifier).join(", ")}) do update set`,
      updateColumns.map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`).join(", "),
    ].join(" ");

    await sql.unsafe(insertSql, params);
  }
}

async function applySeed(seed, chunkSize) {
  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    await sql.begin(async (tx) => {
      await upsertRows(tx, "games", seed.games, ["id"], chunkSize);
      await upsertRows(tx, "releases", seed.releases, ["id"], chunkSize);
      await upsertRows(tx, "cards", seed.cards, ["id"], chunkSize);
      await upsertRows(tx, "card_prints", seed.cardPrints, ["id"], chunkSize);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function buildSeed(cards, releases) {
  const releaseLookup = createReleaseRows(releases);

  return {
    games: [GAME],
    releases: releaseLookup.rows,
    cards: createCardRows(cards),
    cardPrints: createCardPrintRows(cards, releaseLookup),
  };
}

function summarizeSeed(seed) {
  return {
    games: seed.games.length,
    releases: seed.releases.length,
    cards: seed.cards.length,
    cardPrints: seed.cardPrints.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cards = await readJson(OFFICIAL_CARDS_PATH);
  const releases = await readJson(OFFICIAL_RELEASES_PATH);
  const seed = buildSeed(cards, releases);
  const summary = summarizeSeed(seed);

  console.log("Bandai -> Drizzle seed summary");
  console.log(JSON.stringify(summary, null, 2));

  if (args.seedOut) {
    await fs.mkdir(path.dirname(args.seedOut), { recursive: true });
    await fs.writeFile(args.seedOut, JSON.stringify(seed, null, 2));
    console.log(`Wrote seed payload to ${args.seedOut}`);
  }

  if (!args.apply) return;

  await applySeed(seed, args.chunkSize);
  console.log("Applied Bandai seed to Postgres");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

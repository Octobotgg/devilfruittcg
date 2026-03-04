/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const CARD_FILE_RE = /^(op|st|eb)\d{2}-cards\.ts$|^p-cards\.ts$/i;
const VALID_TYPES = new Set(["Leader", "Character", "Event", "Stage"]);

function loadCardsFromTs(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: () => ({}),
  };

  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  return mod.exports.default || mod.exports || [];
}

function normalizeNumber(n) {
  return String(n).padStart(3, "0");
}

function isAllowedCrossSetVariant(card, idSetCode) {
  const rarity = String(card.rarity || "").trim().toUpperCase();
  const id = String(card.id || "");
  const hasVariantSuffix = /_P\d+$/i.test(id);
  const showcaseRarity = rarity === "SP" || rarity === "TR" || rarity === "SP CARD";
  return hasVariantSuffix && showcaseRarity && card.setCode.trim().toUpperCase() !== idSetCode;
}

function validateCard(card) {
  const issues = [];
  const requiredStrings = ["id", "name", "set", "setCode", "number", "type", "color", "rarity"];

  for (const field of requiredStrings) {
    if (typeof card[field] !== "string" || !card[field].trim()) issues.push(`missing_${field}`);
  }
  if (issues.length) return issues;

  const idMatch = /^([A-Z0-9]{1,4})-(\d{3,4})(?:_P\d+)?$/.exec(card.id.trim().toUpperCase());
  if (!idMatch) {
    issues.push("bad_id_format");
    return issues;
  }

  const [, idSetCode, idNumberRaw] = idMatch;
  const setCode = card.setCode.trim().toUpperCase();
  const number = card.number.trim();

  if (setCode !== idSetCode && !isAllowedCrossSetVariant(card, idSetCode)) issues.push("setCode_mismatch_with_id");
  if (!/^\d{1,4}$/.test(number)) issues.push("bad_number_format");
  else if (normalizeNumber(number) !== normalizeNumber(idNumberRaw)) issues.push("number_mismatch_with_id");

  if (!VALID_TYPES.has(card.type)) issues.push("invalid_type");
  return issues;
}

function main() {
  const files = fs.readdirSync(LIB_DIR).filter((name) => CARD_FILE_RE.test(name)).sort();
  if (!files.length) {
    console.error("No card set files found.");
    process.exit(1);
  }

  const allCards = [];
  for (const file of files) {
    const filePath = path.join(LIB_DIR, file);
    const cards = loadCardsFromTs(filePath);
    if (!Array.isArray(cards)) {
      console.error(`Expected array export in ${file}`);
      process.exit(1);
    }
    allCards.push(...cards.map((card) => ({ card, file })));
  }

  const errors = [];
  const byId = new Map();

  for (const { card, file } of allCards) {
    const issues = validateCard(card);
    if (issues.length) errors.push({ id: card.id || "<missing>", file, issues });

    const idKey = (card.id || "").toUpperCase();
    if (!byId.has(idKey)) byId.set(idKey, []);
    byId.get(idKey).push({ id: card.id, name: card.name, file, imageUrl: card.imageUrl });
  }

  for (const [idKey, entries] of byId.entries()) {
    if (!idKey || entries.length < 2) continue;
    // Allow intentional duplicates if they have different imageUrls (alt arts, variants)
    const uniqueImages = new Set(entries.map((e) => e.imageUrl || "base")).size;
    if (uniqueImages > 1) continue; // Different images = intentional variants, not duplicates
    errors.push({
      id: idKey,
      file: entries.map((e) => e.file).join(","),
      issues: [`duplicate_id: ${entries.map((e) => `${e.id} (${e.name})`).join(" | ")}`],
    });
  }

  if (errors.length) {
    console.error(`\n❌ Card validation failed with ${errors.length} issue group(s):\n`);
    for (const err of errors.slice(0, 80)) {
      console.error(`- ${err.id} [${err.file}] -> ${err.issues.join(", ")}`);
    }
    process.exit(1);
  }

  console.log(`✅ Card validation passed (${allCards.length} cards checked across ${files.length} set files).`);
}

main();

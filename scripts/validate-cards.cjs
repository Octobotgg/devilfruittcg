const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OFFICIAL_PATH = path.join(ROOT, "data", "bandai-en-official-cards.json");
const BASE_PATH = path.join(ROOT, "data", "bandai-en-base-cards.json");
const VALID_TYPES = new Set(["Leader", "Character", "Event", "Stage", "DON!!"]);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeNumber(value) {
  return String(value).padStart(3, "0");
}

function validateCard(card) {
  const issues = [];
  const requiredStrings = ["id", "name", "set", "setCode", "number", "type", "color", "rarity"];

  for (const field of requiredStrings) {
    if (typeof card[field] !== "string" || !card[field].trim()) issues.push(`missing_${field}`);
  }
  if (issues.length) return issues;

  const id = String(card.id).trim().toUpperCase();
  const baseId = String(card.baseId || id).trim().toUpperCase();

  if (!/^[A-Z0-9]{1,6}-\d{3}(?:_[A-Z0-9]+)?$/.test(id)) issues.push("bad_id_format");
  if (!/^[A-Z0-9]{1,6}-\d{3}$/.test(baseId)) issues.push("bad_base_id_format");

  const idMatch = /^([A-Z0-9]{1,6})-(\d{3})(?:_([A-Z0-9]+))?$/.exec(id);
  const baseMatch = /^([A-Z0-9]{1,6})-(\d{3})$/.exec(baseId);

  if (!idMatch || !baseMatch) return issues;

  const [, idSetCode, idNumberRaw] = baseMatch;
  if (String(card.setCode).trim().toUpperCase() !== idSetCode) issues.push("setCode_mismatch_with_id");
  if (normalizeNumber(card.number) !== normalizeNumber(idNumberRaw)) issues.push("number_mismatch_with_id");
  if (!VALID_TYPES.has(card.type)) issues.push("invalid_type");

  return issues;
}

function main() {
  if (!fs.existsSync(OFFICIAL_PATH) || !fs.existsSync(BASE_PATH)) {
    console.error("Bandai JSON exports are missing. Run `npm run fetch:bandai` first.");
    process.exit(1);
  }

  const official = loadJson(OFFICIAL_PATH);
  const base = loadJson(BASE_PATH);

  const errors = [];
  const byId = new Map();
  const baseById = new Map(base.map((card) => [card.id, card]));

  for (const card of official) {
    const issues = validateCard(card);
    if (issues.length) errors.push({ id: card.id || "<missing>", issues });

    const idKey = String(card.id || "").toUpperCase();
    if (!byId.has(idKey)) byId.set(idKey, 0);
    byId.set(idKey, byId.get(idKey) + 1);

    if (card.id === card.baseId && !baseById.has(card.id)) {
      errors.push({ id: card.id, issues: ["missing_from_base_dataset"] });
    }
  }

  for (const [id, count] of byId.entries()) {
    if (id && count > 1) errors.push({ id, issues: [`duplicate_id (${count})`] });
  }

  for (const card of base) {
    const issues = validateCard(card);
    if (issues.length) errors.push({ id: card.id || "<missing>", issues: issues.map((issue) => `base_${issue}`) });

    if (!official.find((entry) => entry.id === card.id)) {
      errors.push({ id: card.id, issues: ["base_card_missing_from_official_dataset"] });
    }
  }

  if (errors.length) {
    console.error(`\nCard validation failed with ${errors.length} issue group(s):\n`);
    for (const err of errors.slice(0, 120)) {
      console.error(`- ${err.id} -> ${err.issues.join(", ")}`);
    }
    process.exit(1);
  }

  console.log(`Card validation passed (${official.length} official prints, ${base.length} base cards).`);
}

main();

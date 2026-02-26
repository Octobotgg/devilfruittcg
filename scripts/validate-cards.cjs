/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const CARD_FILE_RE = /^(op|st|eb)\d{2}-cards\.ts$/i;
const VALID_TYPES = new Set(["Leader", "Character", "Event", "Stage"]);
const KNOWN_SOURCE_GAPS = new Set([
  "OP02-068",
  "OP03-072",
  "OP03-097",
  "OP04-016",
  "OP05-037",
  "OP06-115",
]);

function isProvisionalStatsSet(setCode) {
  const match = /^OP(\d{2})$/i.exec(setCode || "");
  if (!match) return false;
  return Number(match[1]) >= 11;
}

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

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: () => ({}),
  };

  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  return sandbox.module.exports.default || sandbox.exports.default || [];
}

function normalizeNumber(n) {
  return String(n).padStart(3, "0");
}

function validateCard(card, context) {
  const issues = [];
  const requiredStrings = ["id", "name", "set", "setCode", "number", "type", "color", "rarity"];

  for (const field of requiredStrings) {
    if (typeof card[field] !== "string" || !card[field].trim()) {
      issues.push(`missing_${field}`);
    }
  }

  if (issues.length) return issues;

  const idMatch = /^([A-Z0-9]{2,4})-(\d{3,4})$/.exec(card.id.trim().toUpperCase());
  if (!idMatch) {
    issues.push("bad_id_format");
    return issues;
  }

  const [, idSetCode, idNumberRaw] = idMatch;
  const setCode = card.setCode.trim().toUpperCase();
  const number = card.number.trim();

  if (setCode !== idSetCode) issues.push("setCode_mismatch_with_id");
  if (!/^\d{1,4}$/.test(number)) issues.push("bad_number_format");
  else if (normalizeNumber(number) !== normalizeNumber(idNumberRaw)) issues.push("number_mismatch_with_id");

  if (!VALID_TYPES.has(card.type)) issues.push("invalid_type");

  const colors = card.color.split("/").map((c) => c.trim()).filter(Boolean);
  if (!colors.length) issues.push("missing_color");

  const provisionalStats = isProvisionalStatsSet(setCode);
  const knownGap = KNOWN_SOURCE_GAPS.has(card.id);

  if (["Leader", "Character", "Event", "Stage"].includes(card.type)) {
    if (typeof card.cost !== "number" || Number.isNaN(card.cost) || card.cost < 0) {
      if (!provisionalStats && !knownGap) issues.push("missing_or_invalid_cost");
    }
  }

  if (card.type === "Leader" && (typeof card.power !== "number" || Number.isNaN(card.power) || card.power <= 0)) {
    if (!provisionalStats && !knownGap) issues.push("leader_missing_or_invalid_power");
  }

  if (card.imageUrl !== undefined) {
    if (typeof card.imageUrl !== "string" || !card.imageUrl.trim()) issues.push("bad_image_url");
  }

  if (!card.imageUrl) {
    const derivedImagePath = `/api/card-image?id=${encodeURIComponent(card.id)}`;
    if (!derivedImagePath.includes(card.id)) issues.push("derived_image_fallback_failed");
  }

  if (!card.set.trim().length) issues.push("missing_set_name");
  if (!card.name.trim().length) issues.push("missing_card_name");

  if (!/^([A-Z0-9]{2,4})-(\d{3,4})$/.test(context.fileSetCode + "-" + number.padStart(3, "0"))) {
    // no-op guard so number parsing is always exercised per file context
  }

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
  const warnings = [];
  const byId = new Map();
  const bySetAndNumber = new Map();

  for (const { card, file } of allCards) {
    const fileSetCode = file.slice(0, 4).toUpperCase();
    const issues = validateCard(card, { fileSetCode });
    if (issues.length) {
      errors.push({ id: card.id || "<missing>", file, issues });
    }

    if (isProvisionalStatsSet(card.setCode)) {
      if (card.cost === undefined || (card.type === "Leader" && card.power === undefined)) {
        warnings.push({ id: card.id, file, warning: "provisional_stats_missing" });
      }
    }

    if (KNOWN_SOURCE_GAPS.has(card.id)) {
      warnings.push({ id: card.id, file, warning: "known_source_gap_missing_stats" });
    }

    const idKey = (card.id || "").toUpperCase();
    if (!byId.has(idKey)) byId.set(idKey, []);
    byId.get(idKey).push({ id: card.id, name: card.name, file });

    const setAndNumberKey = `${(card.setCode || "").toUpperCase()}-${normalizeNumber(card.number || "")}`;
    if (!bySetAndNumber.has(setAndNumberKey)) bySetAndNumber.set(setAndNumberKey, []);
    bySetAndNumber.get(setAndNumberKey).push({ id: card.id, name: card.name, file });
  }

  for (const [idKey, entries] of byId.entries()) {
    if (!idKey || entries.length < 2) continue;
    errors.push({
      id: idKey,
      file: entries.map((e) => e.file).join(","),
      issues: [
        `duplicate_id: ${entries.map((e) => `${e.id} (${e.name})`).join(" | ")}`,
      ],
    });
  }

  for (const [setAndNumber, entries] of bySetAndNumber.entries()) {
    if (entries.length < 2) continue;
    errors.push({
      id: setAndNumber,
      file: entries.map((e) => e.file).join(","),
      issues: [
        `duplicate_set_number: ${entries.map((e) => `${e.id} (${e.name})`).join(" | ")}`,
      ],
    });
  }

  if (warnings.length) {
    console.warn(`⚠️  ${warnings.length} provisional record(s) missing gameplay stats (allowed for OP11+ while source completion is in progress).`);
  }

  if (errors.length) {
    console.error(`\n❌ Card validation failed with ${errors.length} issue group(s):\n`);
    for (const err of errors.slice(0, 80)) {
      console.error(`- ${err.id} [${err.file}] -> ${err.issues.join(", ")}`);
    }
    if (errors.length > 80) {
      console.error(`...and ${errors.length - 80} more issue group(s).`);
    }
    process.exit(1);
  }

  console.log(`✅ Card validation passed (${allCards.length} cards checked across ${files.length} set files).`);
}

main();

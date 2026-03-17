/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const OFFICIAL_CARDS_PATH = path.join(ROOT, "data", "bandai-en-official-cards.json");

function transpileAndRun(filePath) {
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
  return mod.exports.default || mod.exports || {};
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadCanonicalCards() {
  const cards = JSON.parse(fs.readFileSync(OFFICIAL_CARDS_PATH, "utf8"));
  const map = new Map();
  if (!Array.isArray(cards)) return map;

  for (const c of cards) {
    const id = String(c.id || "").toUpperCase();
    const baseId = String(c.baseId || c.id || "").toUpperCase();
    if (!id || id !== baseId) continue;
    map.set(id, { name: c.name, setCode: c.setCode });
  }
  return map;
}

function main() {
  const featured = transpileAndRun(path.join(ROOT, "lib", "featured-cards.ts"));
  const lists = {
    HOME_FEATURED_CARDS: featured.HOME_FEATURED_CARDS || [],
    MARKET_HOT_CARDS: featured.MARKET_HOT_CARDS || [],
  };

  const canonical = loadCanonicalCards();
  const errors = [];

  for (const [listName, list] of Object.entries(lists)) {
    for (const item of list) {
      const id = String(item.id || "").toUpperCase();
      const expected = canonical.get(id);
      if (!expected) {
        errors.push(`${listName}: unknown id ${id}`);
        continue;
      }
      if (norm(item.name) !== norm(expected.name)) {
        errors.push(`${listName}: name mismatch for ${id} (listed='${item.name}' canonical='${expected.name}')`);
      }
      if (item.set && String(item.set).toUpperCase() !== String(expected.setCode).toUpperCase()) {
        errors.push(`${listName}: set mismatch for ${id} (listed='${item.set}' canonical='${expected.setCode}')`);
      }
    }
  }

  if (errors.length) {
    console.error(`\n❌ Featured card validation failed (${errors.length} issue(s)):`);
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  const total = Object.values(lists).reduce((n, arr) => n + arr.length, 0);
  console.log(`✅ Featured card validation passed (${total} entries checked).`);
}

main();

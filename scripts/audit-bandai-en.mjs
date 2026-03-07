#!/usr/bin/env node

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const REPORT_DIR = path.join(ROOT, "reports");
const OFFICIAL_CARDS_PATH = path.join(DATA_DIR, "bandai-en-official-cards.json");
const OFFICIAL_RELEASES_PATH = path.join(DATA_DIR, "bandai-en-official-releases.json");
const CURRENT_EXPORT_PATH = path.join(DATA_DIR, "current-site-cards-pre-fix.json");
const REPORT_JSON_PATH = path.join(REPORT_DIR, "bandai-audit-pre-fix.json");
const REPORT_MD_PATH = path.join(REPORT_DIR, "bandai-audit-pre-fix.md");
const require = createRequire(import.meta.url);

function normalizeValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "missing";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function compareValue(currentValue, officialValue) {
  const current = normalizeValue(currentValue);
  const official = normalizeValue(officialValue);

  if (current === null && official === null) return false;
  if (typeof current === "number" || typeof official === "number") return Number(current) !== Number(official);

  return String(current) !== String(official);
}

function currentImageProxyUrl(card) {
  return card.imageUrl || `https://limitlesstcg.nyc3.digitaloceanspaces.com/one-piece/${card.setCode}/${card.id}_EN.webp`;
}

function transpileTs(filePath) {
  return ts.transpileModule(fsSync.readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
}

function loadTsModule(filePath, cache = new Map()) {
  if (cache.has(filePath)) return cache.get(filePath).exports;

  const mod = { exports: {} };
  cache.set(filePath, mod);
  const dirname = path.dirname(filePath);

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: (specifier) => {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        let resolved = path.resolve(dirname, specifier);
        if (!resolved.endsWith(".ts") && fsSync.existsSync(`${resolved}.ts`)) resolved = `${resolved}.ts`;
        if (fsSync.existsSync(resolved)) return loadTsModule(resolved, cache);
      }

      if (specifier === "./cards" || specifier === "./cards.ts") return {};
      return require(specifier);
    },
  };

  vm.runInNewContext(transpileTs(filePath), sandbox, { filename: filePath });
  mod.exports = mod.exports.default || mod.exports;
  return mod.exports;
}

function loadCurrentSiteCards() {
  const cardsModule = loadTsModule(path.join(ROOT, "lib", "cards.ts"));
  const cards = cardsModule.SEED_CARDS || [];
  return cards.map((card) => ({
    ...card,
    life: null,
    counter: null,
    effect: null,
    trigger: null,
    traits: null,
    releaseDate: null,
    printedCardId: card.id,
    baseId: card.id,
    imageCandidateUrl: currentImageProxyUrl(card),
  }));
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await task(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function checkCurrentImages(cards) {
  return mapLimit(cards, 16, async (card) => {
    const url = currentImageProxyUrl(card);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 DevilFruitTCG.gg audit bot",
        },
      });

      if (!response.ok) {
        return {
          id: card.id,
          currentUrl: url,
          status: response.status,
        };
      }

      return null;
    } catch (error) {
      return {
        id: card.id,
        currentUrl: url,
        status: "network_error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

function pushGrouped(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function releaseOrderLookup(releases) {
  return new Map(releases.map((release, index) => [release.name, index]));
}

function sortByReleaseOrder(entries, orderMap) {
  return [...entries].sort((a, b) => {
    const orderA = orderMap.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
    const orderB = orderMap.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a[0].localeCompare(b[0]);
  });
}

function buildMarkdownReport(report, releases) {
  const lines = [];
  const generatedAt = new Date().toISOString();
  const releaseOrder = releaseOrderLookup(releases);
  const missingEntries = sortByReleaseOrder(Object.entries(report.missingBySet), releaseOrder);
  const errorEntries = sortByReleaseOrder(Object.entries(report.dataErrorsBySet), releaseOrder);
  const imageEntries = sortByReleaseOrder(Object.entries(report.imageIssuesBySet), releaseOrder);
  const extraEntries = sortByReleaseOrder(Object.entries(report.extraBySet), releaseOrder);

  lines.push("# DevilFruitTCG.gg vs Bandai Official English Audit");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push("");
  lines.push("## Summary Stats");
  lines.push("");
  lines.push(`- Official English print records checked: ${report.summary.officialCardCount}`);
  lines.push(`- Current site cards checked: ${report.summary.siteCardCount}`);
  lines.push(`- Missing cards: ${report.summary.missingCards}`);
  lines.push(`- Extra/unknown cards: ${report.summary.extraCards}`);
  lines.push(`- Cards with data errors: ${report.summary.cardsWithDataErrors}`);
  lines.push(`- Total field discrepancies: ${report.summary.totalFieldErrors}`);
  lines.push(`- Image issues: ${report.summary.imageIssues}`);
  lines.push("");

  lines.push("## Missing Cards");
  lines.push("");
  for (const [setName, items] of missingEntries) {
    lines.push(`### ${setName}`);
    if (!items.length) {
      lines.push("- none");
      lines.push("");
      continue;
    }

    for (const item of items) {
      lines.push(`- ${item.id} | ${item.name}`);
    }
    lines.push("");
  }

  lines.push("## Data Errors");
  lines.push("");
  for (const [setName, items] of errorEntries) {
    lines.push(`### ${setName}`);
    if (!items.length) {
      lines.push("- none");
      lines.push("");
      continue;
    }

    for (const item of items) {
      lines.push(`- ${item.id} | ${item.name}`);
      for (const fieldError of item.fieldErrors) {
        lines.push(`  - ${fieldError.field}: current="${fieldError.current}" | should="${fieldError.official}"`);
      }
    }
    lines.push("");
  }

  lines.push("## Image Issues");
  lines.push("");
  for (const [setName, items] of imageEntries) {
    lines.push(`### ${setName}`);
    if (!items.length) {
      lines.push("- none");
      lines.push("");
      continue;
    }

    for (const item of items) {
      lines.push(`- ${item.id} | ${item.name} | ${item.issue}`);
    }
    lines.push("");
  }

  lines.push("## Extra/Unknown Cards");
  lines.push("");
  if (!extraEntries.length) {
    lines.push("- none");
    lines.push("");
  } else {
    for (const [setName, items] of extraEntries) {
      lines.push(`### ${setName}`);
      for (const item of items) {
        lines.push(`- ${item.id} | ${item.name}`);
      }
      lines.push("");
    }
  }

  if (report.manualReviewReleases.length) {
    lines.push("## Manual Review Releases");
    lines.push("");
    for (const item of report.manualReviewReleases) {
      lines.push(`- ${item.name}: ${item.manualReview.join(" | ")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const officialCards = JSON.parse(await fs.readFile(OFFICIAL_CARDS_PATH, "utf8"));
  const officialReleases = JSON.parse(await fs.readFile(OFFICIAL_RELEASES_PATH, "utf8"));
  const currentCards = loadCurrentSiteCards();

  await fs.writeFile(CURRENT_EXPORT_PATH, `${JSON.stringify(currentCards, null, 2)}\n`, "utf8");

  const currentById = new Map(currentCards.map((card) => [card.id, card]));
  const officialById = new Map(officialCards.map((card) => [card.id, card]));

  const missingBySet = new Map();
  const dataErrorsBySet = new Map();
  const imageIssuesBySet = new Map();
  const extraBySet = new Map();

  for (const officialCard of officialCards) {
    if (currentById.has(officialCard.id)) continue;

    pushGrouped(missingBySet, officialCard.set, {
      id: officialCard.id,
      name: officialCard.name,
    });
  }

  const extraCards = [];
  const dataErrorCards = [];

  const fieldComparisons = [
    ["name", "Card name"],
    ["cost", "Cost"],
    ["life", "Life"],
    ["power", "Power"],
    ["counter", "Counter"],
    ["effect", "Effect"],
    ["trigger", "Trigger"],
    ["color", "Color"],
    ["type", "Type"],
    ["attribute", "Attribute"],
    ["traits", "Type line"],
    ["set", "Set name"],
    ["setCode", "Set code"],
    ["number", "Card number"],
    ["releaseDate", "Release date"],
    ["rarity", "Rarity"],
  ];

  for (const currentCard of currentCards) {
    const officialCard = officialById.get(currentCard.id);

    if (!officialCard) {
      extraCards.push(currentCard);
      pushGrouped(extraBySet, currentCard.set, {
        id: currentCard.id,
        name: currentCard.name,
      });
      continue;
    }

    const fieldErrors = [];
    for (const [fieldKey, label] of fieldComparisons) {
      if (!compareValue(currentCard[fieldKey], officialCard[fieldKey])) continue;

      fieldErrors.push({
        field: label,
        current: formatValue(currentCard[fieldKey]),
        official: formatValue(officialCard[fieldKey]),
      });
    }

    if (fieldErrors.length) {
      const payload = {
        id: currentCard.id,
        name: currentCard.name,
        fieldErrors,
      };
      dataErrorCards.push(payload);
      pushGrouped(dataErrorsBySet, officialCard.set, payload);
    }
  }

  const imageChecks = await checkCurrentImages(currentCards);
  const imageIssues = imageChecks.filter(Boolean);
  for (const issue of imageIssues) {
    const currentCard = currentById.get(issue.id);
    const officialCard = officialById.get(issue.id);
    const setName = officialCard?.set || currentCard?.set || "Unknown";
    pushGrouped(imageIssuesBySet, setName, {
      id: issue.id,
      name: currentCard?.name || officialCard?.name || "Unknown",
      issue: `Current image proxy returned ${issue.status} for ${issue.currentUrl}`,
    });
  }

  const report = {
    summary: {
      officialCardCount: officialCards.length,
      siteCardCount: currentCards.length,
      missingCards: officialCards.length - currentCards.filter((card) => officialById.has(card.id)).length,
      extraCards: extraCards.length,
      cardsWithDataErrors: dataErrorCards.length,
      totalFieldErrors: dataErrorCards.reduce((sum, card) => sum + card.fieldErrors.length, 0),
      imageIssues: imageIssues.length,
    },
    missingBySet: Object.fromEntries(sortByReleaseOrder([...missingBySet.entries()], releaseOrderLookup(officialReleases))),
    dataErrorsBySet: Object.fromEntries(sortByReleaseOrder([...dataErrorsBySet.entries()], releaseOrderLookup(officialReleases))),
    imageIssuesBySet: Object.fromEntries(sortByReleaseOrder([...imageIssuesBySet.entries()], releaseOrderLookup(officialReleases))),
    extraBySet: Object.fromEntries(sortByReleaseOrder([...extraBySet.entries()], releaseOrderLookup(officialReleases))),
    manualReviewReleases: officialReleases.filter((release) => release.manualReview?.length),
  };

  const markdown = buildMarkdownReport(report, officialReleases);

  await fs.writeFile(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(REPORT_MD_PATH, markdown, "utf8");

  console.log(
    JSON.stringify(
      {
        reportJson: REPORT_JSON_PATH,
        reportMarkdown: REPORT_MD_PATH,
        currentExport: CURRENT_EXPORT_PATH,
        summary: report.summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

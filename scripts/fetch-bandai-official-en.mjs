#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data");

const CARDLIST_URL = "https://en.onepiece-cardgame.com/cardlist/";
const PRODUCTS_URL = "https://en.onepiece-cardgame.com/products/";
const BASE_URL = "https://en.onepiece-cardgame.com/";

const COMMON_PRODUCT_PREFIXES = [
  "BOOSTER PACK",
  "EXTRA BOOSTER",
  "PREMIUM BOOSTER",
  "STARTER DECK EX",
  "STARTER DECK",
  "ULTRA DECK",
];

const ENTITY_MAP = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(input) {
  return String(input || "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const raw = isHex ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(raw, isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    }

    return ENTITY_MAP[entity] ?? _;
  });
}

function stripTags(input) {
  return decodeHtmlEntities(
    String(input || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  );
}

function cleanInlineText(input) {
  return stripTags(input).replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanupReleaseName(input) {
  const text = cleanInlineText(input);

  if (/^-[^-].*-\s*\[[^\]]+\]$/u.test(text)) {
    return text.replace(/^-/, "").replace(/-\s*(\[[^\]]+\])$/, " $1").trim();
  }

  return text;
}

function normalizeCode(input) {
  return String(input || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeName(input) {
  return decodeHtmlEntities(String(input || ""))
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeProductKey(input) {
  let out = normalizeName(input);

  for (const prefix of COMMON_PRODUCT_PREFIXES) {
    const pattern = new RegExp(`^${prefix}\\s+`, "i");
    out = out.replace(pattern, "");
  }

  return out.replace(/^-+/, "").replace(/-+$/, "").replace(/[ -]+/g, " ").trim();
}

function extractBracketCodes(input) {
  const raw = decodeHtmlEntities(String(input || ""));
  const codes = new Set();

  for (const match of raw.matchAll(/\[([^\]]+)\]/g)) {
    const normalized = normalizeCode(match[1]);
    if (normalized) codes.add(normalized);
  }

  return [...codes];
}

function toTitleCase(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function normalizeCardType(raw) {
  const upper = cleanInlineText(raw).toUpperCase();
  if (!upper) return "";
  if (upper === "DON!!") return "DON!!";
  if (upper === "CHARACTER") return "Character";
  if (upper === "EVENT") return "Event";
  if (upper === "LEADER") return "Leader";
  if (upper === "STAGE") return "Stage";
  return toTitleCase(upper);
}

function parseNumericValue(raw) {
  const text = cleanInlineText(raw).replace(/,/g, "");
  if (!text || text === "-") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw) {
  const text = cleanInlineText(raw);
  if (!text) return { releaseDate: null, releaseDatePrecision: null, releaseDateRaw: null };

  const exact = new Date(text);
  if (!Number.isNaN(exact.valueOf()) && /,\s*\d{4}$/.test(text)) {
    return {
      releaseDate: exact.toISOString().slice(0, 10),
      releaseDatePrecision: "day",
      releaseDateRaw: text,
    };
  }

  const monthYear = /^[A-Za-z]+\s+\d{4}$/;
  if (monthYear.test(text)) {
    return {
      releaseDate: null,
      releaseDatePrecision: "month",
      releaseDateRaw: text,
    };
  }

  return {
    releaseDate: null,
    releaseDatePrecision: null,
    releaseDateRaw: text,
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 DevilFruitTCG.gg audit bot",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function resolveUrl(relativeOrAbsolute) {
  return new URL(relativeOrAbsolute, BASE_URL).toString();
}

function parseSeriesOptions(html) {
  const match = html.match(/<select name="series"[^>]*id="series"[^>]*>([\s\S]*?)<\/select>/i);
  if (!match) throw new Error("Could not locate cardlist series selector");

  const options = [];
  const optionRe = /<option(?:[^>]*value="([^"]*)")?[^>]*>([\s\S]*?)<\/option>/gi;

  for (const opt of match[1].matchAll(optionRe)) {
    const value = opt[1] || "";
    const label = cleanInlineText(opt[2]);
    if (!value || value === "ALL") continue;

    options.push({
      seriesId: value,
      label,
      codes: extractBracketCodes(label),
      category: (() => {
        if (label === "Promotion card") return "PROMOTION";
        if (label === "Other Product Card") return "OTHER_PRODUCT";
        if (label.startsWith("STARTER DECK")) return "STARTER_DECK";
        if (label.startsWith("ULTRA DECK")) return "ULTRA_DECK";
        if (label.startsWith("EXTRA BOOSTER")) return "EXTRA_BOOSTER";
        if (label.startsWith("PREMIUM BOOSTER")) return "PREMIUM_BOOSTER";
        if (label.startsWith("BOOSTER PACK")) return "BOOSTER_PACK";
        return "UNKNOWN";
      })(),
      normalizedLabel: normalizeProductKey(label),
    });
  }

  return options;
}

function parseProducts(html) {
  const productBlocks = [...html.matchAll(/<li class="productsDetail"[^>]*>([\s\S]*?)<\/li>/gi)];

  return productBlocks
    .map((match) => {
      const block = match[1];
      const href = block.match(/<a href="([^"]+)"/i)?.[1];
      const title = block.match(/<span class="js_productsTit">([\s\S]*?)<\/span>/i)?.[1];
      const category = block.match(/<dd class="productsCategory">[\s\S]*?<a [^>]*>([\s\S]*?)<\/a>/i)?.[1];
      const releaseDateRaw = block.match(/<span class="productsDateHead">Release Date<\/span>([\s\S]*?)(?:<br|<\/dd>)/i)?.[1];

      if (!href || !title) return null;

      const dateInfo = parseDate(releaseDateRaw);
      const cleanedTitle = cleanInlineText(title);

      return {
        title: cleanedTitle,
        category: cleanInlineText(category),
        href: resolveUrl(`products/${href.replace(/^\.\//, "")}`),
        codes: extractBracketCodes(cleanedTitle),
        normalizedTitle: normalizeName(cleanedTitle),
        normalizedKey: normalizeProductKey(cleanedTitle),
        ...dateInfo,
      };
    })
    .filter(Boolean);
}

function buildProductIndexes(products) {
  const byCode = new Map();
  const byTitle = new Map();
  const byKey = new Map();

  for (const product of products) {
    for (const code of product.codes) {
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(product);
    }

    if (!byTitle.has(product.normalizedTitle)) byTitle.set(product.normalizedTitle, []);
    byTitle.get(product.normalizedTitle).push(product);

    if (!byKey.has(product.normalizedKey)) byKey.set(product.normalizedKey, []);
    byKey.get(product.normalizedKey).push(product);
  }

  return { byCode, byTitle, byKey };
}

function pickSingleProduct(candidates) {
  if (!candidates || candidates.length === 0) return null;
  return candidates[0];
}

function findProductForRelease(release, productIndexes) {
  for (const code of release.codes || []) {
    const byCode = pickSingleProduct(productIndexes.byCode.get(code));
    if (byCode) return byCode;
  }

  const byTitle = pickSingleProduct(productIndexes.byTitle.get(normalizeName(release.name)));
  if (byTitle) return byTitle;

  const byKey = pickSingleProduct(productIndexes.byKey.get(normalizeProductKey(release.name)));
  if (byKey) return byKey;

  return null;
}

function choosePrimaryRelease(releaseEntries) {
  if (!releaseEntries || releaseEntries.length === 0) return null;

  return [...releaseEntries].sort((a, b) => {
    const dateA = a.releaseDate || "9999-99-99";
    const dateB = b.releaseDate || "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.name.localeCompare(b.name);
  })[0];
}

function parseCardBlocks(seriesHtml, seriesMeta) {
  const cards = [];
  const blockRe = /<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/gi;

  for (const match of seriesHtml.matchAll(blockRe)) {
    const exactId = cleanInlineText(match[1]);
    const block = match[2];

    const infoMatch = block.match(
      /<div class="infoCol">\s*<span>([\s\S]*?)<\/span>\s*\|\s*<span>([\s\S]*?)<\/span>\s*\|\s*<span>([\s\S]*?)<\/span>\s*<\/div>/i,
    );

    const infoId = cleanInlineText(infoMatch?.[1] || exactId);
    const rarity = cleanInlineText(infoMatch?.[2] || "").toUpperCase();
    const type = normalizeCardType(infoMatch?.[3] || "");
    const name = cleanInlineText(block.match(/<div class="cardName">([\s\S]*?)<\/div>/i)?.[1] || "");
    const imagePath =
      block.match(/<img[^>]+data-src="([^"]+)"/i)?.[1] ||
      block.match(/<img[^>]+src="([^"]+)"/i)?.[1] ||
      "";
    const costLabel = cleanInlineText(block.match(/<div class="cost"><h3>([\s\S]*?)<\/h3>/i)?.[1] || "");
    const costValue = cleanInlineText(block.match(/<div class="cost"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const powerValue = parseNumericValue(block.match(/<div class="power"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const counterValue = parseNumericValue(block.match(/<div class="counter"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const attribute = cleanInlineText(
      block.match(/<div class="attribute">[\s\S]*?<i>([\s\S]*?)<\/i>/i)?.[1] ||
        block.match(/<div class="attribute">[\s\S]*?alt="([^"]+)"/i)?.[1] ||
        "",
    );
    const color = cleanInlineText(block.match(/<div class="color"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const blockIcon = cleanInlineText(block.match(/<div class="block"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const traits = cleanInlineText(block.match(/<div class="feature"><h3>[\s\S]*?<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const effect = cleanInlineText(block.match(/<div class="text"><h3>Effect<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");
    const trigger = cleanInlineText(block.match(/<div class="trigger"><h3>Trigger<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "");

    const cardSetHtml = block.match(/<div class="getInfo"><h3>Card Set\(s\)<\/h3>([\s\S]*?)<\/div>/i)?.[1] || "";
    const cardSetNames = stripTags(cardSetHtml)
      .split("\n")
      .map((entry) => cleanupReleaseName(entry))
      .filter(Boolean);

    const noteMatches = [...block.matchAll(/<div class="getInfo remarks"><h3>Notes<\/h3>([\s\S]*?)<\/div>/gi)];
    const notes = noteMatches.map((note) => cleanInlineText(note[1])).filter(Boolean);

    const id = exactId;
    const baseId = id.replace(/_[A-Za-z0-9]+$/u, "");
    const variantCode = id === baseId ? null : id.slice(baseId.length + 1);
    const [setCodeRaw = "", numberRaw = ""] = baseId.split("-");
    const number = numberRaw.padStart(3, "0");
    const costOrLife = parseNumericValue(costValue);

    cards.push({
      id,
      printedCardId: infoId,
      baseId,
      variantCode,
      isVariant: variantCode !== null,
      name,
      set: cardSetNames[0] || seriesMeta.label,
      cardSetNames,
      setCode: normalizeCode(setCodeRaw),
      number,
      type,
      color,
      rarity,
      cost: costLabel === "Cost" ? costOrLife : null,
      life: costLabel === "Life" ? costOrLife : null,
      power: powerValue,
      counter: counterValue,
      attribute: attribute || null,
      blockIcon: blockIcon || null,
      traits: traits || null,
      effect: effect && effect !== "-" ? effect : null,
      trigger: trigger && trigger !== "-" ? trigger : null,
      imageUrl: imagePath ? resolveUrl(imagePath.replace(/^\.\.\//, "")) : null,
      notes,
      seriesId: seriesMeta.seriesId,
      seriesLabel: seriesMeta.label,
      seriesCategory: seriesMeta.category,
      releaseCode: extractBracketCodes(cardSetNames[0] || "")[0] || seriesMeta.codes[0] || null,
      releaseDate: null,
      releaseDatePrecision: null,
      releaseDateRaw: null,
      releaseUrl: null,
      isReprint: variantCode !== null || seriesMeta.category === "PROMOTION" || seriesMeta.category === "OTHER_PRODUCT",
      originCardId: null,
      originSet: null,
      manualReview: [],
    });
  }

  return cards;
}

function summarizeReleaseCategory(name, seriesCategory) {
  if (seriesCategory === "PROMOTION") return "PROMOTION";
  if (seriesCategory === "OTHER_PRODUCT") return "OTHER_PRODUCT";

  if (/winner pack/i.test(name)) return "WINNER_PACK";
  if (/participation pack/i.test(name)) return "PARTICIPATION_PACK";
  if (/champion card set/i.test(name)) return "CHAMPIONSHIP_PRIZE";
  if (/finalist card set/i.test(name)) return "CHAMPIONSHIP_PRIZE";
  if (/treasure cup/i.test(name)) return "TREASURE_CUP";
  if (/tournament kit/i.test(name)) return "TOURNAMENT_KIT";
  if (/celebration pack/i.test(name)) return "CELEBRATION_PACK";
  if (/gift collection/i.test(name)) return "GIFT_COLLECTION";
  if (/double pack/i.test(name)) return "DOUBLE_PACK";
  if (/tin pack/i.test(name)) return "TIN_PACK";
  if (/special don/i.test(name)) return "SPECIAL_DON";
  if (/illustration box/i.test(name)) return "ILLUSTRATION_BOX";
  if (/premium card collection/i.test(name)) return "PREMIUM_CARD_COLLECTION";
  if (/anniversary set/i.test(name)) return "ANNIVERSARY_SET";
  if (/binder set/i.test(name)) return "BINDER_SET";

  return seriesCategory;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log("Fetching Bandai English cardlist index...");
  const cardlistHtml = await fetchHtml(CARDLIST_URL);
  const seriesOptions = parseSeriesOptions(cardlistHtml);

  console.log("Fetching Bandai products index...");
  const productsHtml = await fetchHtml(PRODUCTS_URL);
  const products = parseProducts(productsHtml);
  const productIndexes = buildProductIndexes(products);

  const cards = [];

  for (const series of seriesOptions) {
    const url = `${CARDLIST_URL}?series=${encodeURIComponent(series.seriesId)}`;
    console.log(`Fetching ${series.seriesId} ${series.label}`);
    const seriesHtml = await fetchHtml(url);
    const parsedCards = parseCardBlocks(seriesHtml, series);
    cards.push(...parsedCards);
    console.log(`  -> ${parsedCards.length} cards`);
  }

  const releaseMap = new Map();

  for (const card of cards) {
    const releaseNames = card.cardSetNames.length ? card.cardSetNames : [card.set];

    for (const releaseName of releaseNames) {
      const releaseKey = normalizeName(releaseName);
      const existing = releaseMap.get(releaseKey) || {
        key: releaseKey,
        name: releaseName,
        codes: new Set(),
        seriesIds: new Set(),
        seriesLabels: new Set(),
        seriesCategories: new Set(),
        cardIds: new Set(),
        baseCardIds: new Set(),
        category: null,
        productTitle: null,
        productUrl: null,
        releaseDate: null,
        releaseDatePrecision: null,
        releaseDateRaw: null,
        manualReview: new Set(),
      };

      extractBracketCodes(releaseName).forEach((code) => existing.codes.add(code));
      if (card.releaseCode) existing.codes.add(card.releaseCode);
      existing.seriesIds.add(card.seriesId);
      existing.seriesLabels.add(card.seriesLabel);
      existing.seriesCategories.add(card.seriesCategory);
      existing.cardIds.add(card.id);
      existing.baseCardIds.add(card.baseId);
      existing.category = summarizeReleaseCategory(releaseName, card.seriesCategory);

      releaseMap.set(releaseKey, existing);
    }
  }

  const releases = [...releaseMap.values()].map((release) => {
    const match = findProductForRelease(
      {
        name: release.name,
        codes: [...release.codes],
      },
      productIndexes,
    );

    if (match) {
      release.productTitle = match.title;
      release.productUrl = match.href;
      release.releaseDate = match.releaseDate;
      release.releaseDatePrecision = match.releaseDatePrecision;
      release.releaseDateRaw = match.releaseDateRaw;
    } else if (release.category === "PROMOTION") {
      release.manualReview.add("No direct Bandai product page match on /products/; release date needs manual review.");
    }

    return {
      key: release.key,
      name: release.name,
      codes: [...release.codes].sort(),
      category: release.category,
      seriesIds: [...release.seriesIds].sort(),
      seriesLabels: [...release.seriesLabels].sort(),
      seriesCategories: [...release.seriesCategories].sort(),
      printCount: release.cardIds.size,
      baseCardCount: release.baseCardIds.size,
      productTitle: release.productTitle,
      productUrl: release.productUrl,
      releaseDate: release.releaseDate,
      releaseDatePrecision: release.releaseDatePrecision,
      releaseDateRaw: release.releaseDateRaw,
      manualReview: [...release.manualReview].sort(),
    };
  });

  const releaseLookup = new Map(releases.map((release) => [normalizeName(release.name), release]));
  const mergedCardMap = new Map();

  for (const card of cards) {
    const existing = mergedCardMap.get(card.id);

    if (!existing) {
      mergedCardMap.set(card.id, {
        ...card,
        cardSetNames: [...card.cardSetNames],
        notes: [...card.notes],
        seriesIds: [card.seriesId],
        seriesLabels: [card.seriesLabel],
        seriesCategories: [card.seriesCategory],
        manualReview: [...card.manualReview],
      });
      continue;
    }

    existing.cardSetNames = [...new Set([...existing.cardSetNames, ...card.cardSetNames])];
    existing.notes = [...new Set([...existing.notes, ...card.notes])];
    existing.seriesIds = [...new Set([...existing.seriesIds, card.seriesId])];
    existing.seriesLabels = [...new Set([...existing.seriesLabels, card.seriesLabel])];
    existing.seriesCategories = [...new Set([...existing.seriesCategories, card.seriesCategory])];
    existing.manualReview = [...new Set([...existing.manualReview, ...card.manualReview])];
    existing.isReprint = existing.isReprint || card.isReprint;
  }

  const mergedCards = [...mergedCardMap.values()];
  const baseCardLookup = new Map(
    mergedCards
      .filter((card) => card.id === card.baseId)
      .map((card) => [card.baseId, card]),
  );

  const enrichedCards = mergedCards.map((card) => {
    const relatedReleases = card.cardSetNames
      .map((name) => releaseLookup.get(normalizeName(name)))
      .filter(Boolean);
    const primaryRelease = choosePrimaryRelease(relatedReleases);
    const baseCard = baseCardLookup.get(card.baseId) || null;
    const manualReview = [...card.manualReview];

    if (card.isVariant && !baseCard) {
      manualReview.push("Variant/reprint print found without a matching base card in the official export.");
    }

    if (card.seriesCategories.includes("OTHER_PRODUCT") && card.cardSetNames.some((name) => /Japanese /i.test(name))) {
      manualReview.push("Listed on the English official cardlist, but product naming suggests non-English regional origin. Verify distribution scope manually.");
    }

    return {
      ...card,
      set: primaryRelease?.name || card.cardSetNames[0] || card.set,
      releaseCode: primaryRelease?.codes?.[0] || card.releaseCode,
      releaseDate: primaryRelease?.releaseDate || null,
      releaseDatePrecision: primaryRelease?.releaseDatePrecision || null,
      releaseDateRaw: primaryRelease?.releaseDateRaw || null,
      releaseUrl: primaryRelease?.productUrl || null,
      seriesId: card.seriesIds[0] || card.seriesId,
      seriesLabel: card.seriesLabels[0] || card.seriesLabel,
      seriesCategory: card.seriesCategories[0] || card.seriesCategory,
      originCardId: card.isVariant ? card.baseId : null,
      originSet: card.isVariant && baseCard ? baseCard.set : null,
      manualReview: [...new Set(manualReview)].sort(),
    };
  });

  enrichedCards.sort((a, b) => {
    const releaseA = a.releaseDate || "9999-99-99";
    const releaseB = b.releaseDate || "9999-99-99";
    if (releaseA !== releaseB) return releaseA.localeCompare(releaseB);
    if (a.setCode !== b.setCode) return a.setCode.localeCompare(b.setCode);
    if (a.number !== b.number) return a.number.localeCompare(b.number);
    return a.id.localeCompare(b.id);
  });

  releases.sort((a, b) => {
    const dateA = a.releaseDate || "9999-99-99";
    const dateB = b.releaseDate || "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.name.localeCompare(b.name);
  });

  const baseCards = enrichedCards
    .filter((card) => card.id === card.baseId)
    .map((card) => ({
      id: card.id,
      baseId: card.baseId,
      name: card.name,
      set: card.set,
      setCode: card.setCode,
      number: card.number,
      type: card.type,
      color: card.color,
      rarity: card.rarity,
      cost: card.cost,
      life: card.life,
      power: card.power,
      counter: card.counter,
      attribute: card.attribute,
      releaseDate: card.releaseDate,
    }));

  await fs.writeFile(
    path.join(OUT_DIR, "bandai-en-official-releases.json"),
    `${JSON.stringify(releases, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(OUT_DIR, "bandai-en-official-cards.json"),
    `${JSON.stringify(enrichedCards, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(
    path.join(OUT_DIR, "bandai-en-base-cards.json"),
    `${JSON.stringify(baseCards, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Wrote ${releases.length} releases, ${enrichedCards.length} official card records, and ${baseCards.length} base-card records.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

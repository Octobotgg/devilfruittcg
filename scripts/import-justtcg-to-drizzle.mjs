#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CATALOG_PATH = path.join(ROOT, ".cache", "justtcg", "one-piece-catalog.latest.json");
const DEFAULT_MAPPING_REPORT_PATH = path.join(ROOT, ".cache", "justtcg", "released-mapping-report.json");
const DEFAULT_PRICE_DATA_PATH = path.join(ROOT, ".cache", "justtcg", "approved-price-sync-data.json");
const DEFAULT_DESKTOP_CATALOG_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/one-piece-catalog.latest.json";
const DEFAULT_DESKTOP_PRICE_DATA_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/approved-price-sync-data.json";
const OFFICIAL_RELEASES_PATH = path.join(ROOT, "data", "bandai-en-official-releases.json");
const DEFAULT_CHUNK_SIZE = 250;

const GAME_ID = "one-piece-card-game";
const JUSTTCG_SOURCE = {
  id: "justtcg",
  code: "justtcg",
  name: "JustTCG",
  base_url: "https://api.justtcg.com/v1/cards",
  is_active: true,
};

const TCGPLAYER_SOURCE = {
  id: "tcgplayer",
  code: "tcgplayer",
  name: "TCGplayer",
  base_url: "https://www.tcgplayer.com",
  is_active: true,
};

const SEALED_TYPE_KEYWORDS = [
  ["booster box", "booster_box"],
  ["booster pack", "booster_pack"],
  ["starter deck", "starter_deck"],
  ["premium booster", "premium_booster"],
  ["gift collection", "gift_collection"],
  ["double pack", "double_pack"],
  ["booster", "booster"],
  ["deck", "deck"],
  ["collection", "collection"],
  ["tin", "tin"],
  ["case", "case"],
  ["display", "display"],
  ["box", "box"],
  ["pack", "pack"],
];

function parseArgs(argv) {
  const args = {
    apply: false,
    includeTcgplayerSource: true,
    catalog: DEFAULT_CATALOG_PATH,
    mappingReport: DEFAULT_MAPPING_REPORT_PATH,
    priceData: DEFAULT_PRICE_DATA_PATH,
    seedOut: null,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--apply") {
      args.apply = true;
      continue;
    }

    if (value === "--no-tcgplayer-source") {
      args.includeTcgplayerSource = false;
      continue;
    }

    if (value === "--catalog") {
      args.catalog = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.catalog;
      index += 1;
      continue;
    }

    if (value === "--mapping-report") {
      args.mappingReport = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.mappingReport;
      index += 1;
      continue;
    }

    if (value === "--price-data") {
      args.priceData = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : args.priceData;
      index += 1;
      continue;
    }

    if (value === "--seed-out") {
      args.seedOut = argv[index + 1] ? path.resolve(process.cwd(), argv[index + 1]) : null;
      index += 1;
      continue;
    }

    if (value === "--chunk-size") {
      const parsed = Number.parseInt(argv[index + 1] || "", 10);
      if (Number.isFinite(parsed) && parsed > 0) args.chunkSize = parsed;
      index += 1;
    }
  }

  return args;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function normalizeConfidence(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value.toFixed(4);
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed.toFixed(4) : cleanText(value);
}

function normalizedReasonSet(entry) {
  return new Set(
    (Array.isArray(entry?.confidenceReasons) ? entry.confidenceReasons : []).map((value) =>
      normalizeLookupKey(value),
    ),
  );
}

function hasAllReasons(entry, expected) {
  const reasons = normalizedReasonSet(entry);
  return expected.every((value) => reasons.has(normalizeLookupKey(value)));
}

function isBasePrintContext(entry) {
  const context = getCardPrintContext(entry);
  const variantSlug = normalizeLookupKey(context?.variantSlug);
  const variantLabel = normalizeLookupKey(context?.variantLabel);
  return variantSlug === "base" || variantLabel === "base";
}

function isTrustedBaseApproval(entry) {
  if (normalizeLookupKey(entry?.status) !== "auto_approved") return false;
  if (!isBasePrintContext(entry)) return false;

  const searchMethod = normalizeLookupKey(entry?.searchMethod);
  if (!["number_exact", "number_exact_live", "live_number_lookup"].includes(searchMethod)) {
    return false;
  }

  return (
    hasAllReasons(entry, ["single_plain_base_candidate"]) ||
    hasAllReasons(entry, ["single_clean_base_match"]) ||
    hasAllReasons(entry, [
      "review_pass_auto_approved",
      "clear_best_candidate",
      "single_set_matched_base_after_review",
    ])
  );
}

function isTrustedEventApproval(entry) {
  if (normalizeLookupKey(entry?.status) !== "auto_approved") return false;

  if (hasAllReasons(entry, ["tcgplayer_verified", "exact_number_match", "exact_product_match"])) {
    return true;
  }

  if (
    hasAllReasons(entry, [
      "official_event_verified",
      "event_label_match",
      "name_exact_match",
      "number_exact_match",
      "tcgplayer_verified",
    ])
  ) {
    return true;
  }

  if (
    hasAllReasons(entry, [
      "manual_set_match",
      "tcgplayer_verified",
      "exact_number_match",
      "explicit_variant_label",
    ])
  ) {
    return true;
  }

  return false;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
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

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readJsonWithFallback(filePath, fallbackPaths = []) {
  for (const candidate of [filePath, ...fallbackPaths]) {
    const data = await readJsonIfExists(candidate);
    if (data != null) return data;
  }
  return null;
}

function inferTcgplayerId(candidate) {
  return candidate?.tcgplayerId || candidate?.tcgplayer_id || candidate?.tcgplayer?.id || null;
}

function inferProductUrl(tcgplayerId) {
  return tcgplayerId ? `https://www.tcgplayer.com/product/${tcgplayerId}` : null;
}

function extractImageUrl(raw) {
  return raw?.image || raw?.imageUrl || raw?.image_url || raw?.image_url_small || null;
}

function inferProductKind(product) {
  const explicitKind = normalizeLookupKey(
    product?.product_kind ||
      product?.productKind ||
      product?.kind ||
      product?.type ||
      product?.category ||
      product?.category_name ||
      "",
  );
  const name = normalizeLookupKey(product?.name);
  const setName = normalizeLookupKey(product?.set_name || product?.set);

  if (explicitKind === "sealed" || explicitKind === "sealed_product") return "sealed";
  if (explicitKind === "raw_card" || explicitKind === "single" || explicitKind === "card") return "raw_card";
  if (explicitKind === "graded" || explicitKind.includes("graded")) return "graded";
  if (
    name.includes("booster") ||
    name.includes("starter deck") ||
    name.includes("double pack") ||
    name.includes("collection") ||
    name.includes("premium booster") ||
    name.includes("gift") ||
    name.includes("box") ||
    name.includes("pack") ||
    name.includes("case")
  ) {
    return "sealed";
  }
  if (setName && !product?.number) return "sealed";
  return "raw_card";
}

function inferSealedProductType(product) {
  const haystack = `${cleanText(product?.name)} ${cleanText(product?.set_name || product?.set)} ${cleanText(product?.category || product?.type)}`.toLowerCase();
  for (const [needle, productType] of SEALED_TYPE_KEYWORDS) {
    if (haystack.includes(needle)) return productType;
  }
  return "other";
}

function buildReleaseLookup(releases) {
  const byName = new Map();
  const byCode = new Map();

  for (const release of releases || []) {
    const releaseId = `release_${slugify(release.key || release.name)}`;
    const row = {
      id: releaseId,
      code: cleanText(release.codes?.[0] || ""),
      name: cleanText(release.name),
    };
    if (row.name) byName.set(normalizeLookupKey(row.name), row);
    if (row.code) byCode.set(row.code, row);
  }

  return { byName, byCode };
}

function resolveReleaseId(product, releaseLookup) {
  const setName = cleanText(product?.set_name || product?.set);
  const setCode = cleanText(product?.set_code || product?.setCode || "");

  if (setName) {
    const byName = releaseLookup.byName.get(normalizeLookupKey(setName));
    if (byName) return byName.id;
  }

  if (setCode) {
    const byCode = releaseLookup.byCode.get(setCode);
    if (byCode) return byCode.id;
  }

  return null;
}

function buildExternalProductRow(raw, overrides = {}) {
  const justtcgId = cleanText(overrides.justtcgId || raw?.id);
  if (!justtcgId) return null;

  const productKind =
    Object.prototype.hasOwnProperty.call(overrides, "productKind") ? overrides.productKind : inferProductKind(raw);
  const tcgplayerId = cleanText(overrides.tcgplayerId || inferTcgplayerId(raw)) || null;
  const name = cleanText(overrides.name || raw?.name);
  if (!name) return null;

  return {
    id: `justtcg:${justtcgId}`,
    source_id: JUSTTCG_SOURCE.id,
    external_product_id: justtcgId,
    product_kind: productKind,
    name,
    set_name: cleanText(overrides.setName || raw?.set_name || raw?.set) || null,
    number: cleanText(overrides.number || raw?.number || raw?.cardNumber) || null,
    rarity: cleanText(overrides.rarity || raw?.rarity) || null,
    language: cleanText(overrides.language || raw?.language || "English") || "English",
    condition_model: overrides.conditionModel || (Array.isArray(raw?.variants) && raw.variants.length ? "condition_variant" : null),
    printing: cleanText(overrides.printing || raw?.printing) || null,
    image_url: overrides.imageUrl || extractImageUrl(raw),
    product_url: overrides.productUrl || inferProductUrl(tcgplayerId),
    raw_payload: overrides.rawPayload || raw || null,
    last_seen_at: normalizeTimestamp(overrides.lastSeenAt || raw?.updated_at || raw?.lastUpdated || raw?.last_updated || raw?.fetched_at) || null,
  };
}

function stripVariantsFromRawProduct(raw) {
  if (!raw || typeof raw !== "object") return raw || null;
  if (!Array.isArray(raw.variants)) return raw;

  const { variants: _ignoredVariants, ...card } = raw;
  return card;
}

function buildExternalProductVariantRow(product, rawVariant, overrides = {}) {
  const providerVariantId = cleanText(
    overrides.providerVariantId || rawVariant?.variantId || rawVariant?.variant_id || rawVariant?.id || "",
  );
  if (!providerVariantId) return null;

  const condition = cleanText(overrides.condition || rawVariant?.condition || "");
  const printing = cleanText(overrides.printing || rawVariant?.printing || "");
  const language = cleanText(overrides.language || rawVariant?.language || "");
  const price = overrides.price ?? rawVariant?.price ?? null;
  const lastUpdatedAt =
    normalizeTimestamp(overrides.lastUpdatedAt || rawVariant?.lastUpdated || rawVariant?.last_updated || product?.last_seen_at) ||
    null;

  if (!condition || !printing || !language || !lastUpdatedAt) return null;

  return {
    id: `justtcg:${providerVariantId}`,
    external_product_id: product.id,
    source_id: product.source_id,
    provider_variant_id: providerVariantId,
    condition,
    printing,
    language,
    price,
    last_updated_at: lastUpdatedAt,
    price_history_payload: overrides.priceHistoryPayload || rawVariant?.priceHistory || rawVariant?.price_history || null,
    raw_payload: overrides.rawPayload || rawVariant || null,
  };
}

function mergeExternalProductVariantRows(existing, nextRow) {
  if (!existing) return nextRow;

  return {
    ...existing,
    ...nextRow,
    external_product_id: preferNonEmpty(existing.external_product_id, nextRow.external_product_id),
    source_id: preferNonEmpty(existing.source_id, nextRow.source_id),
    provider_variant_id: preferNonEmpty(existing.provider_variant_id, nextRow.provider_variant_id),
    condition: preferNonEmpty(existing.condition, nextRow.condition),
    printing: preferNonEmpty(existing.printing, nextRow.printing),
    language: preferNonEmpty(existing.language, nextRow.language),
    price: preferNonEmpty(existing.price, nextRow.price),
    last_updated_at: preferNonEmpty(existing.last_updated_at, nextRow.last_updated_at),
    price_history_payload: mergeRawPayload(existing.price_history_payload, nextRow.price_history_payload),
    raw_payload: mergeRawPayload(existing.raw_payload, nextRow.raw_payload),
  };
}

function preferNonEmpty(currentValue, nextValue) {
  if (nextValue == null) return currentValue;
  if (typeof nextValue === "string" && nextValue.trim() === "") return currentValue;
  return nextValue;
}

function mergeStructuredValue(currentValue, nextValue) {
  if (nextValue == null) return currentValue;
  if (currentValue == null) return nextValue;

  if (Array.isArray(currentValue) || Array.isArray(nextValue)) {
    return nextValue;
  }

  if (typeof currentValue === "object" && typeof nextValue === "object") {
    const merged = { ...currentValue };
    for (const [key, value] of Object.entries(nextValue)) {
      merged[key] = mergeStructuredValue(currentValue[key], value);
    }
    return merged;
  }

  return nextValue;
}

function mergeRawPayload(currentValue, nextValue) {
  return mergeStructuredValue(currentValue, nextValue);
}

function mergeExternalProductRows(existing, nextRow) {
  if (!existing) return nextRow;

  return {
    ...existing,
    ...nextRow,
    product_kind: preferNonEmpty(existing.product_kind, nextRow.product_kind),
    name: preferNonEmpty(existing.name, nextRow.name),
    set_name: preferNonEmpty(existing.set_name, nextRow.set_name),
    number: preferNonEmpty(existing.number, nextRow.number),
    rarity: preferNonEmpty(existing.rarity, nextRow.rarity),
    language: preferNonEmpty(existing.language, nextRow.language),
    condition_model: preferNonEmpty(existing.condition_model, nextRow.condition_model),
    printing: preferNonEmpty(existing.printing, nextRow.printing),
    image_url: preferNonEmpty(existing.image_url, nextRow.image_url),
    product_url: preferNonEmpty(existing.product_url, nextRow.product_url),
    raw_payload: mergeRawPayload(existing.raw_payload, nextRow.raw_payload),
    last_seen_at: preferNonEmpty(existing.last_seen_at, nextRow.last_seen_at),
  };
}

function buildTcgplayerProductRow(product) {
  const tcgplayerId = cleanText(inferTcgplayerId(product));
  if (!tcgplayerId) return null;

  return {
    id: `tcgplayer:${tcgplayerId}`,
    source_id: TCGPLAYER_SOURCE.id,
    external_product_id: tcgplayerId,
    product_kind: product.product_kind,
    name: product.name,
    set_name: product.set_name,
    number: product.number,
    rarity: product.rarity,
    language: "English",
    condition_model: null,
    printing: null,
    image_url: product.image_url,
    product_url: inferProductUrl(tcgplayerId),
    raw_payload: { linkedJustTcgId: product.external_product_id },
    last_seen_at: product.last_seen_at,
  };
}

function buildExternalProducts(catalog, mappingReport, priceData, options) {
  const products = new Map();
  const variants = new Map();
  const tcgplayerProducts = new Map();

  const addProduct = (raw, overrides = {}) => {
    const row = buildExternalProductRow(raw, overrides);
    if (!row) return null;

    const existing = products.get(row.id);
    products.set(row.id, mergeExternalProductRows(existing, row));

    if (options.includeTcgplayerSource) {
      const tcgRow = buildTcgplayerProductRow(products.get(row.id));
      if (tcgRow) tcgplayerProducts.set(tcgRow.id, tcgRow);
    }

    return products.get(row.id);
  };

  const addVariants = (productRow, rawProduct) => {
    if (!productRow || !Array.isArray(rawProduct?.variants)) return;

    for (const rawVariant of rawProduct.variants) {
      const variantRow = buildExternalProductVariantRow(productRow, rawVariant, {
        rawPayload: rawVariant,
        priceHistoryPayload: rawVariant?.priceHistory || rawVariant?.price_history || null,
      });
      if (!variantRow) continue;

      const existing = variants.get(variantRow.id);
      variants.set(variantRow.id, mergeExternalProductVariantRows(existing, variantRow));
    }
  };

  for (const product of Array.isArray(catalog?.cards) ? catalog.cards : []) {
    const importedProduct = addProduct(product, {
      rawPayload: stripVariantsFromRawProduct(product),
      lastSeenAt: catalog?.fetchedAt || null,
    });
    addVariants(importedProduct, product);
  }

  for (const entry of Array.isArray(mappingReport?.results) ? mappingReport.results : []) {
    if (!entry?.bestCandidate) continue;
    const importedProduct = addProduct(entry.bestCandidate, {
      productKind: entry.product_kind || entry.productKind || "raw_card",
      rawPayload: {
        source: "mapping_report",
        generatedAt: mappingReport?.generatedAt || null,
        entry,
      },
      lastSeenAt: entry.bestCandidate?.lastUpdated || mappingReport?.generatedAt || null,
    });
    addVariants(importedProduct, entry.bestCandidate);
  }

  for (const row of Array.isArray(priceData?.priceRows) ? priceData.priceRows : []) {
    const raw = row?.raw_response || row?.rawResponse || null;
    const justtcgId = cleanText(row?.justtcg_id || raw?.id);
    if (!justtcgId) continue;

    const overrides = {
      justtcgId,
      rawPayload: stripVariantsFromRawProduct(raw || row),
      lastSeenAt: row?.last_updated_justtcg || row?.fetched_at || priceData?.generatedAt || null,
      productKind: "raw_card",
    };

    const importedProduct = addProduct(raw || { id: justtcgId, name: row?.name || justtcgId }, overrides);
    addVariants(importedProduct, raw);
  }

  const variantRowsByProductId = new Map();
  for (const variantRow of variants.values()) {
    const list = variantRowsByProductId.get(variantRow.external_product_id) || [];
    list.push(variantRow);
    variantRowsByProductId.set(variantRow.external_product_id, list);
  }

  return {
    externalProducts: [...products.values(), ...tcgplayerProducts.values()],
    externalProductVariants: [...variants.values()],
    productMap: products,
    variantMap: variants,
    variantRowsByProductId,
  };
}

function mappingStatusFromEntry(entry) {
  const confidence = normalizeConfidence(entry?.confidence);
  const confidenceValue = confidence == null ? null : Number.parseFloat(confidence);

  switch (entry?.status) {
    case "auto_approved":
    case "manually_approved":
      if (isTrustedBaseApproval(entry)) return "exact";
      if (isTrustedEventApproval(entry)) return "exact";
      if (Number.isFinite(confidenceValue) && confidenceValue < 0.95) return "probable";
      return "exact";
    case "rejected":
      return "rejected";
    default:
      return "manual_review";
  }
}

function normalizeSetFingerprint(value) {
  return normalizeLookupKey(
    String(value || "")
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\bvol\.?\s*\d+\b/gi, " ")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim(),
  );
}

function getCardPrintContext(entry) {
  const context = entry?.cardPrintContext;
  return context && typeof context === "object" ? context : {};
}

function getEntryNotes(entry) {
  if (Array.isArray(entry?.notes)) {
    return entry.notes.filter(Boolean).join(" | ");
  }
  return cleanText(entry?.notes) || null;
}

function setNamesMatch(left, right) {
  const normalizedLeft = normalizeSetFingerprint(left);
  const normalizedRight = normalizeSetFingerprint(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function confidenceRank(value) {
  switch (normalizeLookupKey(value)) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function approvedCandidatePriority(candidate) {
  const entry = candidate.entry;
  const context = getCardPrintContext(entry);
  const notes = normalizeLookupKey(getEntryNotes(entry));
  const candidateSet = entry?.bestCandidate?.set;
  const printSetName = context?.setName;

  return {
    setMatch: setNamesMatch(candidateSet, printSetName) ? 1 : 0,
    manualCorrection: normalizeLookupKey(entry?.searchMethod) === "tcgplayer_verified_manual_correction" ? 1 : 0,
    reviewed: entry?.reviewedAt ? 1 : 0,
    manualApproval: normalizeLookupKey(entry?.status) === "manually_approved" ? 1 : 0,
    confidence: confidenceRank(entry?.confidence),
    mismatchPenalty:
      (notes.includes("set_mismatch") ? 1 : 0) + (notes.includes("premium_hint_mismatch") ? 1 : 0),
    timestamp: Date.parse(String(entry?.reviewedAt || entry?.mappedAt || entry?.bestCandidate?.lastUpdated || "")) || 0,
  };
}

function compareApprovedCandidates(left, right) {
  const leftPriority = approvedCandidatePriority(left);
  const rightPriority = approvedCandidatePriority(right);

  return (
    rightPriority.setMatch - leftPriority.setMatch ||
    rightPriority.manualCorrection - leftPriority.manualCorrection ||
    rightPriority.reviewed - leftPriority.reviewed ||
    rightPriority.manualApproval - leftPriority.manualApproval ||
    rightPriority.confidence - leftPriority.confidence ||
    leftPriority.mismatchPenalty - rightPriority.mismatchPenalty ||
    rightPriority.timestamp - leftPriority.timestamp ||
    left.card_print_id.localeCompare(right.card_print_id)
  );
}

function appendReviewNote(currentValue, nextValue) {
  const parts = [cleanText(currentValue), cleanText(nextValue)].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(" | ") : null;
}

function collectRawCardMappings(mappingReport, externalProducts) {
  const approvedRawAssignments = [];
  const approvedByCardPrintId = new Map();
  const approvedCandidatesByExternalProductId = new Map();
  const candidates = [];

  for (const entry of Array.isArray(mappingReport?.results) ? mappingReport.results : []) {
    const cardPrintId = cleanText(entry?.cardId);
    const candidateId = cleanText(entry?.bestCandidate?.id);
    if (!cardPrintId || !candidateId) continue;

    const externalProductId = `justtcg:${candidateId}`;
    const product = externalProducts.get(externalProductId);
    const productKind = product?.product_kind || "raw_card";
    if (productKind !== "raw_card") continue;

    const mappingStatus = mappingStatusFromEntry(entry);
    const approved =
      (entry.status === "auto_approved" || entry.status === "manually_approved") &&
      mappingStatus === "exact";
    const approvedAt = normalizeTimestamp(mappingReport?.generatedAt || entry?.generatedAt || entry?.bestCandidate?.lastUpdated);
    const candidate = {
      id: `card_print_market_link:${cardPrintId}:${candidateId}`,
      card_print_id: cardPrintId,
      external_product_id: externalProductId,
      mapping_status: mappingStatus,
      confidence: normalizeConfidence(entry?.confidence),
      match_method: cleanText(entry?.searchMethod) || null,
      review_notes: getEntryNotes(entry),
      approved_by: approved ? (entry.status === "manually_approved" ? "manual_review" : "auto_approval") : null,
      approved_at: approved ? approvedAt : null,
      entry: {
        ...entry,
        mappedAt: entry?.mappedAt || null,
        reviewedAt: entry?.reviewedAt || null,
      },
    };
    candidates.push(candidate);

    if (approved) {
      const existingApproved = approvedByCardPrintId.get(cardPrintId);
      if (existingApproved && existingApproved !== externalProductId) {
        throw new Error(
          `Conflicting approved raw-card mappings for ${cardPrintId}: ${existingApproved} vs ${externalProductId}`,
        );
      }
      approvedByCardPrintId.set(cardPrintId, externalProductId);
      const approvedCandidates = approvedCandidatesByExternalProductId.get(externalProductId) || [];
      approvedCandidates.push(candidate);
      approvedCandidatesByExternalProductId.set(externalProductId, approvedCandidates);
    }
  }

  const winningCardPrintByExternalProductId = new Map();
  for (const [externalProductId, approvedCandidates] of approvedCandidatesByExternalProductId.entries()) {
    const [winner] = [...approvedCandidates].sort(compareApprovedCandidates);
    winningCardPrintByExternalProductId.set(externalProductId, winner.card_print_id);
    approvedRawAssignments.push({
      card_print_id: winner.card_print_id,
      external_product_id: externalProductId,
    });
  }

  const cardPrintMarketLinks = candidates.map((candidate) => {
    const isApprovedCandidate = candidate.approved_by != null;
    const winningCardPrintId = winningCardPrintByExternalProductId.get(candidate.external_product_id) || null;
    const demotedDuplicateApproval =
      isApprovedCandidate && winningCardPrintId != null && winningCardPrintId !== candidate.card_print_id;

    const { entry: _ignoredEntry, ...link } = candidate;
    if (!demotedDuplicateApproval) return link;

    return {
      ...link,
      mapping_status: "manual_review",
      review_notes: appendReviewNote(
        link.review_notes,
        `Demoted during import because ${candidate.external_product_id} is shared across multiple approved prints; keeping ${winningCardPrintId} as the active mapping.`,
      ),
      approved_by: null,
      approved_at: null,
    };
  });

  return { cardPrintMarketLinks, approvedRawAssignments };
}

function indexPriceRows(priceData) {
  const byCardPrintId = new Map();
  const byJusttcgId = new Map();

  for (const row of Array.isArray(priceData?.priceRows) ? priceData.priceRows : []) {
    const cardPrintId = cleanText(row?.devilfruit_id);
    if (cardPrintId && !byCardPrintId.has(cardPrintId)) {
      byCardPrintId.set(cardPrintId, row);
    }

    const justtcgId = cleanText(row?.justtcg_id || row?.raw_response?.id || row?.rawResponse?.id);
    if (justtcgId && !byJusttcgId.has(justtcgId)) {
      byJusttcgId.set(justtcgId, row);
    }
  }

  return { byCardPrintId, byJusttcgId };
}

function compareVariantCandidates(left, right) {
  return (
    String(left?.provider_variant_id || "").localeCompare(String(right?.provider_variant_id || "")) ||
    String(left?.id || "").localeCompare(String(right?.id || ""))
  );
}

function selectCanonicalVariant(variants) {
  const pool = Array.isArray(variants) ? variants : [];
  const englishNearMint = pool.filter(
    (variant) =>
      normalizeLookupKey(variant?.language) === "english" &&
      normalizeLookupKey(variant?.condition) === "near mint",
  );
  return [...englishNearMint].sort(compareVariantCandidates)[0] || null;
}

function buildPriceSnapshotRow(externalProductId, externalVariantId, priceRow, rawPayloadOverride = null) {
  const capturedAt = normalizeTimestamp(priceRow?.fetched_at || priceRow?.last_updated_justtcg);
  if (!capturedAt) return null;

  return {
    external_product_id: externalProductId,
    external_variant_id: externalVariantId || null,
    captured_at: capturedAt,
    price_market: priceRow?.price_market ?? priceRow?.price_nm ?? null,
    price_low: priceRow?.price_low ?? null,
    price_mid: priceRow?.price_mid ?? null,
    price_high: priceRow?.price_high ?? null,
    price_nm: priceRow?.price_nm ?? null,
    price_lp: priceRow?.price_lp ?? null,
    currency: cleanText(priceRow?.currency || "USD") || "USD",
    availability: Number.isInteger(priceRow?.availability) ? priceRow.availability : null,
    raw_payload: rawPayloadOverride || priceRow?.raw_response || priceRow?.rawResponse || priceRow || null,
  };
}

function extractJusttcgId(externalProductId) {
  return cleanText(String(externalProductId || "").split(":").slice(1).join(":"));
}

function resolveApprovedRawPriceRow(assignment, variantRowsByProductId, priceIndex) {
  const variants = variantRowsByProductId.get(assignment.external_product_id) || [];
  const canonicalVariant = selectCanonicalVariant(variants);
  const lpVariant = [...variants]
    .filter(
      (variant) =>
        normalizeLookupKey(variant?.language) === "english" &&
        normalizeLookupKey(variant?.condition) === "lightly played",
    )
    .sort(compareVariantCandidates)[0] || null;
  const approvedJusttcgId = extractJusttcgId(assignment.external_product_id);
  const fallbackPriceRow = approvedJusttcgId ? priceIndex.byJusttcgId.get(approvedJusttcgId) || null : null;
  if (!canonicalVariant) return null;

  return { priceRow: fallbackPriceRow || canonicalVariant, canonicalVariant, lpVariant };
}

function buildRawCardPrices(approvedRawAssignments, variantRowsByProductId, priceIndex) {
  const rows = [];
  const snapshots = [];

  for (const assignment of approvedRawAssignments) {
    const resolved = resolveApprovedRawPriceRow(assignment, variantRowsByProductId, priceIndex);
    if (!resolved) continue;

    const { priceRow, canonicalVariant, lpVariant } = resolved;
    const updatedAt = normalizeTimestamp(priceRow?.last_updated_at || priceRow?.lastUpdated || priceRow?.last_updated_justtcg) || normalizeTimestamp(priceRow?.fetched_at);
    if (!updatedAt) continue;

    const externalVariantId = canonicalVariant?.id || null;
    const priceNm = canonicalVariant?.price ?? priceRow?.price_nm ?? null;
    const priceLp = lpVariant?.price ?? priceRow?.price_lp ?? null;
    const snapshotPriceRow = canonicalVariant
      ? {
          ...priceRow,
          price_market: priceRow?.price_market ?? priceNm ?? null,
          price_nm: priceNm,
          price_lp: priceLp,
        }
      : priceRow;

    rows.push({
      card_print_id: assignment.card_print_id,
      source_id: JUSTTCG_SOURCE.id,
      external_product_id: assignment.external_product_id,
      external_variant_id: externalVariantId,
      price_market: priceRow?.price_market ?? priceNm ?? null,
      price_nm: priceNm,
      price_lp: priceLp,
      price_change_24h: priceRow?.price_change_24h ?? null,
      price_change_7d: priceRow?.price_change_7d ?? null,
      price_change_30d: priceRow?.price_change_30d ?? null,
      updated_at: updatedAt,
      fetched_at: normalizeTimestamp(priceRow?.fetched_at) || normalizeTimestamp(canonicalVariant?.last_updated_at) || null,
    });

    const snapshot = buildPriceSnapshotRow(
      assignment.external_product_id,
      externalVariantId,
      snapshotPriceRow,
      priceRow?.raw_response || priceRow?.rawResponse || canonicalVariant?.raw_payload || canonicalVariant || null,
    );
    if (snapshot) snapshots.push(snapshot);
  }

  return { rows, snapshots };
}

function buildRawCardPriceHistory(approvedRawAssignments, variantRowsByProductId, priceData, priceIndex) {
  const assignmentsByCardPrintId = new Map(
    approvedRawAssignments.map((assignment) => [assignment.card_print_id, assignment]),
  );
  const rows = [];

  for (const historyRow of Array.isArray(priceData?.historyRows) ? priceData.historyRows : []) {
    const cardPrintId = cleanText(historyRow?.devilfruit_id);
    if (!cardPrintId) continue;

    const assignment = assignmentsByCardPrintId.get(cardPrintId);
    if (!assignment) continue;

    const variants = variantRowsByProductId.get(assignment.external_product_id) || [];
    const canonicalVariant = selectCanonicalVariant(variants);
    if (!canonicalVariant) continue;
    const recordedAt = normalizeTimestamp(historyRow?.recorded_at);
    if (!recordedAt) continue;

    rows.push({
      card_print_id: cardPrintId,
      source_id: JUSTTCG_SOURCE.id,
      external_product_id: assignment.external_product_id,
      external_variant_id: canonicalVariant?.id || null,
      recorded_at: recordedAt,
      price_nm: historyRow?.price_nm ?? null,
      price_lp: historyRow?.price_lp ?? null,
      price_market: historyRow?.price_market ?? historyRow?.price_nm ?? null,
    });
  }

  if (rows.length === 0) {
    for (const assignment of approvedRawAssignments) {
      const variants = variantRowsByProductId.get(assignment.external_product_id) || [];
      const canonicalVariant = selectCanonicalVariant(variants);
      if (!canonicalVariant) continue;

      const currentPriceRow = priceIndex?.byCardPrintId?.get(assignment.card_print_id) || null;
      const recordedAt =
        normalizeTimestamp(currentPriceRow?.last_updated_at || currentPriceRow?.lastUpdated || currentPriceRow?.last_updated_justtcg) ||
        normalizeTimestamp(currentPriceRow?.fetched_at);
      if (!recordedAt) continue;

      rows.push({
        card_print_id: assignment.card_print_id,
        source_id: JUSTTCG_SOURCE.id,
        external_product_id: assignment.external_product_id,
        external_variant_id: canonicalVariant.id,
        recorded_at: recordedAt,
        price_nm: currentPriceRow?.price_nm ?? canonicalVariant?.price ?? null,
        price_lp: currentPriceRow?.price_lp ?? null,
        price_market: currentPriceRow?.price_market ?? currentPriceRow?.price_nm ?? canonicalVariant?.price ?? null,
      });
    }
  }

  return rows;
}

function buildSealedProducts(externalProducts, priceIndex, releaseLookup) {
  const sealedProducts = [];
  const sealedProductMarketLinks = [];
  const sealedProductPriceCurrent = [];
  const sealedSnapshots = [];
  const sealedById = new Map();
  const activeByExternalProductId = new Map();

  for (const product of externalProducts.values()) {
    if (product.product_kind !== "sealed") continue;

    const sealedProductId = `sealed:${product.external_product_id}`;
    if (sealedById.has(sealedProductId)) {
      throw new Error(`Conflicting sealed product identities for ${sealedProductId}`);
    }
    if (activeByExternalProductId.has(product.id)) {
      throw new Error(`External product ${product.id} cannot be active for multiple sealed products`);
    }
    sealedById.set(sealedProductId, product.id);
    activeByExternalProductId.set(product.id, sealedProductId);

    const sku = cleanText(product.external_product_id || product.number) || null;

    sealedProducts.push({
      id: sealedProductId,
      game_id: GAME_ID,
      release_id: resolveReleaseId(product, releaseLookup),
      active_external_product_id: product.id,
      slug: slugify(`${product.name}-${product.external_product_id}`),
      name: product.name,
      product_type: inferSealedProductType(product),
      sku,
      language: cleanText(product.language || "EN") || "EN",
      image_url: product.image_url,
      metadata: {
        sourceId: product.source_id,
        externalProductId: product.id,
        setName: product.set_name,
        rawPayload: product.raw_payload,
      },
      is_active: true,
    });

    sealedProductMarketLinks.push({
      id: `sealed_product_market_link:${sealedProductId}:${product.external_product_id}`,
      sealed_product_id: sealedProductId,
      external_product_id: product.id,
      mapping_status: "exact",
      confidence: "1.0000",
      match_method: "catalog_product_kind",
      review_notes: null,
      approved_by: "catalog_import",
      approved_at: product.last_seen_at,
    });

    const priceRow = priceIndex.byJusttcgId.get(product.external_product_id);
    const updatedAt = normalizeTimestamp(priceRow?.last_updated_justtcg) || normalizeTimestamp(priceRow?.fetched_at);
    if (!updatedAt) continue;

    sealedProductPriceCurrent.push({
      sealed_product_id: sealedProductId,
      source_id: JUSTTCG_SOURCE.id,
      external_product_id: product.id,
      price_market: priceRow?.price_market ?? priceRow?.price_nm ?? null,
      price_change_24h: priceRow?.price_change_24h ?? null,
      price_change_7d: priceRow?.price_change_7d ?? null,
      price_change_30d: priceRow?.price_change_30d ?? null,
      updated_at: updatedAt,
      fetched_at: normalizeTimestamp(priceRow?.fetched_at) || null,
    });

    const snapshot = buildPriceSnapshotRow(product.id, null, priceRow);
    if (snapshot) sealedSnapshots.push(snapshot);
  }

  return { sealedProducts, sealedProductMarketLinks, sealedProductPriceCurrent, sealedSnapshots };
}

function summarizeFiles(inputs) {
  return {
    catalogFound: Boolean(inputs.catalog),
    mappingReportFound: Boolean(inputs.mappingReport),
    priceDataFound: Boolean(inputs.priceData),
  };
}

function buildActiveCardPrintAssignments(cardPrintMarketLinks, approvedRawAssignments) {
  const assignments = new Map(
    cardPrintMarketLinks.map((link) => [
      link.card_print_id,
      {
        card_print_id: link.card_print_id,
        active_external_product_id: null,
      },
    ]),
  );

  for (const assignment of approvedRawAssignments) {
    assignments.set(assignment.card_print_id, {
      card_print_id: assignment.card_print_id,
      active_external_product_id: assignment.external_product_id,
    });
  }

  return [...assignments.values()];
}

function buildActiveCardPrintVariantAssignments(approvedRawAssignments, variantRowsByProductId) {
  return approvedRawAssignments
    .map((assignment) => {
      const variants = variantRowsByProductId.get(assignment.external_product_id) || [];
      const canonicalVariant = selectCanonicalVariant(variants);
      if (!canonicalVariant) return null;

      return {
        card_print_id: assignment.card_print_id,
        active_external_variant_id: canonicalVariant.id,
      };
    })
    .filter(Boolean);
}

function buildAuthoritativeActiveCardPrintAssignments(
  currentAssignments,
  currentVariantAssignments,
  existingActiveCardPrintIds,
) {
  const assignments = new Map(
    [...existingActiveCardPrintIds].map((cardPrintId) => [
      cardPrintId,
      {
        card_print_id: cardPrintId,
        active_external_product_id: null,
        active_external_variant_id: null,
      },
    ]),
  );

  for (const assignment of currentAssignments) {
    const existing = assignments.get(assignment.card_print_id) || {
      card_print_id: assignment.card_print_id,
      active_external_product_id: null,
      active_external_variant_id: null,
    };
    existing.active_external_product_id = assignment.active_external_product_id;
    assignments.set(assignment.card_print_id, existing);
  }

  for (const assignment of currentVariantAssignments || []) {
    const existing = assignments.get(assignment.card_print_id) || {
      card_print_id: assignment.card_print_id,
      active_external_product_id: null,
      active_external_variant_id: null,
    };
    existing.active_external_variant_id = assignment.active_external_variant_id;
    assignments.set(assignment.card_print_id, existing);
  }

  return [...assignments.values()];
}

function splitActiveAssignmentStages(assignments) {
  const clearStage = [];
  const assignStage = [];

  for (const assignment of assignments) {
    const {
      active_external_product_id: _ignoredActiveExternalProductId,
      active_external_variant_id: _ignoredActiveExternalVariantId,
      ...identity
    } = assignment;
    clearStage.push({
      ...identity,
      active_external_product_id: null,
      active_external_variant_id: null,
    });

    if (assignment.active_external_product_id != null) {
      assignStage.push(assignment);
    }
  }

  return { clearStage, assignStage };
}

function buildSeed(inputs, options) {
  const releaseLookup = buildReleaseLookup(inputs.officialReleases);
  const { externalProducts, externalProductVariants, productMap, variantRowsByProductId } = buildExternalProducts(
    inputs.catalog,
    inputs.mappingReport,
    inputs.priceData,
    options,
  );
  const { cardPrintMarketLinks, approvedRawAssignments } = collectRawCardMappings(inputs.mappingReport, productMap);
  const priceIndex = indexPriceRows(inputs.priceData);
  const rawCardPrices = buildRawCardPrices(approvedRawAssignments, variantRowsByProductId, priceIndex);
  const rawCardPriceHistory = buildRawCardPriceHistory(
    approvedRawAssignments,
    variantRowsByProductId,
    inputs.priceData,
    priceIndex,
  );
  const sealed = buildSealedProducts(productMap, priceIndex, releaseLookup);
  const activeCardPrintAssignments = buildActiveCardPrintAssignments(cardPrintMarketLinks, approvedRawAssignments);
  const activeCardPrintVariantAssignments = buildActiveCardPrintVariantAssignments(
    approvedRawAssignments,
    variantRowsByProductId,
  );

  return {
    externalSources: options.includeTcgplayerSource ? [JUSTTCG_SOURCE, TCGPLAYER_SOURCE] : [JUSTTCG_SOURCE],
    externalProducts,
    externalProductVariants,
    cardPrintMarketLinks,
    activeCardPrintAssignments,
    activeCardPrintVariantAssignments,
    cardPrintPriceCurrent: rawCardPrices.rows,
    cardPrintPriceHistory: rawCardPriceHistory,
    sealedProducts: sealed.sealedProducts,
    sealedProductMarketLinks: sealed.sealedProductMarketLinks,
    sealedProductPriceCurrent: sealed.sealedProductPriceCurrent,
    priceSnapshots: [...rawCardPrices.snapshots, ...sealed.sealedSnapshots],
    meta: {
      ...summarizeFiles(inputs),
      approvedRawAssignments: approvedRawAssignments.length,
      importedExternalProducts: externalProducts.length,
      importedExternalProductVariants: externalProductVariants.length,
      importedCardPrintPriceHistory: rawCardPriceHistory.length,
      importedSealedProducts: sealed.sealedProducts.length,
    },
  };
}

function summarizeSeed(seed) {
  return {
    externalSources: seed.externalSources.length,
    externalProducts: seed.externalProducts.length,
    externalProductVariants: seed.externalProductVariants.length,
    cardPrintMarketLinks: seed.cardPrintMarketLinks.length,
    cardPrintPriceCurrent: seed.cardPrintPriceCurrent.length,
    cardPrintPriceHistory: seed.cardPrintPriceHistory.length,
    sealedProducts: seed.sealedProducts.length,
    sealedProductMarketLinks: seed.sealedProductMarketLinks.length,
    sealedProductPriceCurrent: seed.sealedProductPriceCurrent.length,
    priceSnapshots: seed.priceSnapshots.length,
  };
}

function assertApplyPreconditions(inputs, options) {
  if (!options.apply) return;

  if (!inputs.mappingReport || !Array.isArray(inputs.mappingReport.results)) {
    throw new Error(
      `Refusing --apply without a valid mapping report at ${options.mappingReport}. Raw-card active/current state requires authoritative mapping input.`,
    );
  }
}

function normalizeParamValue(column, value) {
  if (value === undefined) return null;
  if (column === "raw_payload" || column === "metadata") return value == null ? null : JSON.stringify(value);
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
          const cast = column === "raw_payload" || column === "metadata" ? "::jsonb" : "";
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}${cast}`;
          paramIndex += 1;
          return token;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const sqlText = [
      `insert into ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")})`,
      `values ${valuesSql}`,
      `on conflict (${conflictColumns.map(quoteIdentifier).join(", ")}) do update set`,
      updateColumns.map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`).join(", "),
    ].join(" ");

    await sql.unsafe(sqlText, params);
  }
}

async function insertRows(sql, tableName, rows, chunkSize) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  for (const group of chunk(rows, chunkSize)) {
    const params = [];
    let paramIndex = 1;
    const valuesSql = group
      .map((row) => {
        const placeholders = columns.map((column) => {
          const cast = column === "raw_payload" || column === "metadata" ? "::jsonb" : "";
          params.push(normalizeParamValue(column, row[column]));
          const token = `$${paramIndex}${cast}`;
          paramIndex += 1;
          return token;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const sqlText = `insert into ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(", ")}) values ${valuesSql}`;
    await sql.unsafe(sqlText, params);
  }
}

async function deleteByTextValues(sql, tableName, columnName, values, chunkSize) {
  if (!values.length) return;
  for (const group of chunk([...new Set(values)], chunkSize)) {
    const placeholders = group.map((_, index) => `$${index + 1}`).join(", ");
    const sqlText = `delete from ${quoteIdentifier(tableName)} where ${quoteIdentifier(columnName)} in (${placeholders})`;
    await sql.unsafe(sqlText, group);
  }
}

async function deleteCurrentByCollectibleIds(sql, tableName, collectibleColumn, sourceId, collectibleIds, chunkSize) {
  if (!collectibleIds.length) return;

  for (const group of chunk([...new Set(collectibleIds)], chunkSize)) {
    const params = [sourceId, ...group];
    const placeholders = group.map((_, index) => `$${index + 2}`).join(", ");
    const sqlText = `
      delete from ${quoteIdentifier(tableName)}
      where ${quoteIdentifier("source_id")} = $1
        and ${quoteIdentifier(collectibleColumn)} in (${placeholders})
    `;
    await sql.unsafe(sqlText, params);
  }
}

async function applyActiveAssignments(sql, tableName, targetIdColumn, sourceIdKey, assignments, chunkSize) {
  if (!assignments.length) return;

  for (const group of chunk(assignments, chunkSize)) {
    const params = [];
    const valuesSql = group
      .map((row) => {
        params.push(row[sourceIdKey], row.active_external_product_id, row.active_external_variant_id);
        return `($${params.length - 2}, $${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const sqlText = `
      update ${quoteIdentifier(tableName)} as target
      set active_external_product_id = source.active_external_product_id,
          active_external_variant_id = source.active_external_variant_id
      from (values ${valuesSql}) as source(${quoteIdentifier(sourceIdKey)}, "active_external_product_id", "active_external_variant_id")
      where target.${quoteIdentifier(targetIdColumn)} = source.${quoteIdentifier(sourceIdKey)}
    `;
    await sql.unsafe(sqlText, params);
  }
}

async function fetchExistingSnapshotKeys(sql, snapshotRows, chunkSize) {
  const keys = new Set();
  if (!snapshotRows.length) return keys;

  for (const group of chunk(snapshotRows, chunkSize)) {
    const params = [];
    const tuples = group
      .map((row) => {
        params.push(row.external_product_id, row.external_variant_id || "", row.captured_at);
        return `($${params.length - 2}, $${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const sqlText = `
      select external_product_id, coalesce(external_variant_id, '') as external_variant_id, captured_at
      from price_snapshots
      where (external_product_id, coalesce(external_variant_id, ''), captured_at) in (${tuples})
    `;
    const rows = await sql.unsafe(sqlText, params);
    for (const row of rows) {
      keys.add(`${row.external_product_id}::${row.external_variant_id || ""}::${new Date(row.captured_at).toISOString()}`);
    }
  }

  return keys;
}

function buildHistoryRowKey(row) {
  return [
    row.card_print_id,
    row.source_id,
    row.external_product_id ?? "",
    row.external_variant_id ?? "",
    new Date(row.recorded_at).toISOString(),
  ].join("::");
}

function filterPendingHistoryRows(rows, existingHistoryKeys) {
  return rows.filter((row) => !existingHistoryKeys.has(buildHistoryRowKey(row)));
}

async function fetchExistingHistoryKeys(sql, historyRows, chunkSize) {
  const keys = new Set();
  if (!historyRows.length) return keys;

  for (const group of chunk(historyRows, chunkSize)) {
    const params = [];
    const tuples = group
      .map((row) => {
        params.push(
          row.card_print_id,
          row.source_id,
          row.external_product_id,
          row.external_variant_id || "",
          row.recorded_at,
        );
        return `($${params.length - 4}, $${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const sqlText = `
      select card_print_id, source_id, external_product_id, coalesce(external_variant_id, '') as external_variant_id, recorded_at
      from card_print_price_history
      where (card_print_id, source_id, external_product_id, coalesce(external_variant_id, ''), recorded_at) in (${tuples})
    `;
    const rows = await sql.unsafe(sqlText, params);
    for (const row of rows) {
      keys.add(buildHistoryRowKey(row));
    }
  }

  return keys;
}

async function fetchExistingActiveJusttcgCardPrintIds(sql) {
  const rows = await sql.unsafe(
    `
      select card_prints.id
      from card_prints
      join external_products on external_products.id = card_prints.active_external_product_id
      where external_products.source_id = $1
    `,
    [JUSTTCG_SOURCE.id],
  );

  return rows.map((row) => row.id);
}

async function applySeed(seed, options) {
  const sql =
    options.sql ||
    postgres(getConnectionString(), {
      prepare: false,
      max: 1,
    });
  const ownsConnection = !options.sql;

  try {
    const existingActiveCardPrintIds = await fetchExistingActiveJusttcgCardPrintIds(sql);
    const authoritativeActiveCardPrintAssignments = buildAuthoritativeActiveCardPrintAssignments(
      seed.activeCardPrintAssignments,
      seed.activeCardPrintVariantAssignments,
      existingActiveCardPrintIds,
    );
    const { clearStage, assignStage } = splitActiveAssignmentStages(authoritativeActiveCardPrintAssignments);

    await upsertRows(sql, "external_sources", seed.externalSources, ["id"], options.chunkSize);
    await upsertRows(sql, "external_products", seed.externalProducts, ["id"], options.chunkSize);
    await upsertRows(
      sql,
      "external_product_variants",
      seed.externalProductVariants || [],
      ["provider_variant_id"],
      options.chunkSize,
    );
    await upsertRows(sql, "sealed_products", seed.sealedProducts, ["id"], options.chunkSize);

    await upsertRows(sql, "card_print_market_links", seed.cardPrintMarketLinks, ["id"], options.chunkSize);
    await upsertRows(sql, "sealed_product_market_links", seed.sealedProductMarketLinks, ["id"], options.chunkSize);

    await applyActiveAssignments(sql, "card_prints", "id", "card_print_id", clearStage, options.chunkSize);
    await applyActiveAssignments(sql, "card_prints", "id", "card_print_id", assignStage, options.chunkSize);

    await deleteCurrentByCollectibleIds(
      sql,
      "card_print_price_current",
      "card_print_id",
      JUSTTCG_SOURCE.id,
      authoritativeActiveCardPrintAssignments.map((row) => row.card_print_id),
      options.chunkSize,
    );
    await upsertRows(
      sql,
      "card_print_price_current",
      seed.cardPrintPriceCurrent,
      ["card_print_id", "source_id"],
      options.chunkSize,
    );

    const existingHistoryKeys = await fetchExistingHistoryKeys(sql, seed.cardPrintPriceHistory || [], options.chunkSize);
    const pendingHistory = filterPendingHistoryRows(seed.cardPrintPriceHistory || [], existingHistoryKeys);
    await insertRows(sql, "card_print_price_history", pendingHistory, options.chunkSize);

    await deleteCurrentByCollectibleIds(
      sql,
      "sealed_product_price_current",
      "sealed_product_id",
      JUSTTCG_SOURCE.id,
      seed.sealedProducts.map((row) => row.id),
      options.chunkSize,
    );
    await upsertRows(
      sql,
      "sealed_product_price_current",
      seed.sealedProductPriceCurrent,
      ["sealed_product_id", "source_id"],
      options.chunkSize,
    );

    const existingSnapshotKeys = await fetchExistingSnapshotKeys(sql, seed.priceSnapshots, options.chunkSize);
    const seenSnapshotKeys = new Set(existingSnapshotKeys);
    const newSnapshots = seed.priceSnapshots.filter((row) => {
      const key = `${row.external_product_id}::${row.external_variant_id || ""}::${new Date(row.captured_at).toISOString()}`;
      if (seenSnapshotKeys.has(key)) return false;
      seenSnapshotKeys.add(key);
      return true;
    });
    await insertRows(sql, "price_snapshots", newSnapshots, options.chunkSize);
  } finally {
    if (ownsConnection) {
      await sql.end({ timeout: 5 });
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [catalog, mappingReport, priceData, officialReleases] = await Promise.all([
    readJsonWithFallback(args.catalog, [DEFAULT_DESKTOP_CATALOG_PATH]),
    readJsonWithFallback(args.mappingReport),
    readJsonWithFallback(args.priceData, [DEFAULT_DESKTOP_PRICE_DATA_PATH]),
    readJsonIfExists(OFFICIAL_RELEASES_PATH),
  ]);

  assertApplyPreconditions({ catalog, mappingReport, priceData, officialReleases }, args);

  const seed = buildSeed({ catalog, mappingReport, priceData, officialReleases }, args);
  const summary = summarizeSeed(seed);

  console.log("JustTCG -> Drizzle seed summary");
  console.log(JSON.stringify({ ...summary, meta: seed.meta }, null, 2));

  if (args.seedOut) {
    await fs.mkdir(path.dirname(args.seedOut), { recursive: true });
    await fs.writeFile(args.seedOut, JSON.stringify(seed, null, 2));
    console.log(`Wrote seed payload to ${args.seedOut}`);
  }

  if (!args.apply) return;

  await applySeed(seed, args);
  console.log("Applied JustTCG seed to Postgres");
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

export {
  assertApplyPreconditions,
  buildActiveCardPrintAssignments,
  buildAuthoritativeActiveCardPrintAssignments,
  buildExternalProducts,
  buildRawCardPrices,
  buildSeed,
  applySeed,
  extractJusttcgId,
  resolveApprovedRawPriceRow,
  splitActiveAssignmentStages,
};

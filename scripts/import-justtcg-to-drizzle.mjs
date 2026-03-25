#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CATALOG_PATH = path.join(ROOT, ".cache", "justtcg", "one-piece-catalog.latest.json");
const DEFAULT_MAPPING_REPORT_PATH = path.join(ROOT, ".cache", "justtcg", "released-mapping-report.json");
const DEFAULT_PRICE_DATA_PATH = path.join(ROOT, ".cache", "justtcg", "approved-price-sync-data.json");
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

  const productKind = overrides.productKind || inferProductKind(raw);
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

function preferNonEmpty(currentValue, nextValue) {
  if (nextValue == null) return currentValue;
  if (typeof nextValue === "string" && nextValue.trim() === "") return currentValue;
  return nextValue;
}

function mergeRawPayload(currentValue, nextValue) {
  if (nextValue == null) return currentValue;
  if (currentValue == null) return nextValue;
  if (
    typeof currentValue === "object" &&
    typeof nextValue === "object" &&
    !Array.isArray(currentValue) &&
    !Array.isArray(nextValue)
  ) {
    return {
      ...currentValue,
      ...nextValue,
    };
  }
  return nextValue;
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

  for (const product of Array.isArray(catalog?.cards) ? catalog.cards : []) {
    addProduct(product, { rawPayload: product, lastSeenAt: catalog?.fetchedAt || null });
  }

  for (const entry of Array.isArray(mappingReport?.results) ? mappingReport.results : []) {
    if (!entry?.bestCandidate) continue;
    addProduct(entry.bestCandidate, {
      productKind: entry.product_kind || entry.productKind || "raw_card",
      rawPayload: {
        source: "mapping_report",
        generatedAt: mappingReport?.generatedAt || null,
        entry,
      },
      lastSeenAt: entry.bestCandidate?.lastUpdated || mappingReport?.generatedAt || null,
    });
  }

  for (const row of Array.isArray(priceData?.priceRows) ? priceData.priceRows : []) {
    const raw = row?.raw_response || row?.rawResponse || null;
    const justtcgId = cleanText(row?.justtcg_id || raw?.id);
    if (!justtcgId) continue;

    addProduct(raw || { id: justtcgId, name: row?.name || justtcgId }, {
      justtcgId,
      rawPayload: raw || row,
      lastSeenAt: row?.last_updated_justtcg || row?.fetched_at || priceData?.generatedAt || null,
    });
  }

  return {
    externalProducts: [...products.values(), ...tcgplayerProducts.values()],
    productMap: products,
  };
}

function mappingStatusFromEntry(entry) {
  const confidence = normalizeConfidence(entry?.confidence);
  const confidenceValue = confidence == null ? null : Number.parseFloat(confidence);

  switch (entry?.status) {
    case "auto_approved":
    case "manually_approved":
      if (Number.isFinite(confidenceValue) && confidenceValue < 0.95) return "probable";
      return "exact";
    case "rejected":
      return "rejected";
    default:
      return "manual_review";
  }
}

function collectRawCardMappings(mappingReport, externalProducts) {
  const cardPrintMarketLinks = [];
  const approvedRawAssignments = [];
  const approvedByCardPrintId = new Map();
  const activeByExternalProductId = new Map();

  for (const entry of Array.isArray(mappingReport?.results) ? mappingReport.results : []) {
    const cardPrintId = cleanText(entry?.cardId);
    const candidateId = cleanText(entry?.bestCandidate?.id);
    if (!cardPrintId || !candidateId) continue;

    const externalProductId = `justtcg:${candidateId}`;
    const product = externalProducts.get(externalProductId);
    const productKind = product?.product_kind || "raw_card";
    if (productKind !== "raw_card") continue;

    const approved = entry.status === "auto_approved" || entry.status === "manually_approved";
    const approvedAt = normalizeTimestamp(mappingReport?.generatedAt || entry?.generatedAt || entry?.bestCandidate?.lastUpdated);

    cardPrintMarketLinks.push({
      id: `card_print_market_link:${cardPrintId}:${candidateId}`,
      card_print_id: cardPrintId,
      external_product_id: externalProductId,
      mapping_status: mappingStatusFromEntry(entry),
      confidence: normalizeConfidence(entry?.confidence),
      match_method: cleanText(entry?.searchMethod) || null,
      review_notes: Array.isArray(entry?.notes) ? entry.notes.join(" | ") : cleanText(entry?.notes) || null,
      approved_by: approved ? (entry.status === "manually_approved" ? "manual_review" : "auto_approval") : null,
      approved_at: approved ? approvedAt : null,
    });

    if (approved) {
      const existingApproved = approvedByCardPrintId.get(cardPrintId);
      if (existingApproved && existingApproved !== externalProductId) {
        throw new Error(
          `Conflicting approved raw-card mappings for ${cardPrintId}: ${existingApproved} vs ${externalProductId}`,
        );
      }
      approvedByCardPrintId.set(cardPrintId, externalProductId);

      const existingActiveCollectible = activeByExternalProductId.get(externalProductId);
      if (existingActiveCollectible && existingActiveCollectible !== cardPrintId) {
        throw new Error(
          `External product ${externalProductId} cannot be active for multiple card prints: ${existingActiveCollectible} and ${cardPrintId}`,
        );
      }
      activeByExternalProductId.set(externalProductId, cardPrintId);

      approvedRawAssignments.push({
        card_print_id: cardPrintId,
        external_product_id: externalProductId,
      });
    }
  }

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

function buildPriceSnapshotRow(externalProductId, priceRow) {
  const capturedAt = normalizeTimestamp(priceRow?.fetched_at || priceRow?.last_updated_justtcg);
  if (!capturedAt) return null;

  return {
    external_product_id: externalProductId,
    captured_at: capturedAt,
    price_market: priceRow?.price_market ?? priceRow?.price_nm ?? null,
    price_low: priceRow?.price_low ?? null,
    price_mid: priceRow?.price_mid ?? null,
    price_high: priceRow?.price_high ?? null,
    price_nm: priceRow?.price_nm ?? null,
    price_lp: priceRow?.price_lp ?? null,
    currency: cleanText(priceRow?.currency || "USD") || "USD",
    availability: Number.isInteger(priceRow?.availability) ? priceRow.availability : null,
    raw_payload: priceRow?.raw_response || priceRow?.rawResponse || priceRow || null,
  };
}

function buildRawCardPrices(approvedRawAssignments, priceIndex) {
  const rows = [];
  const snapshots = [];

  for (const assignment of approvedRawAssignments) {
    const priceRow = priceIndex.byCardPrintId.get(assignment.card_print_id) || priceIndex.byJusttcgId.get(cleanText(assignment.external_product_id.split(":")[1]));
    if (!priceRow) continue;

    const updatedAt =
      normalizeTimestamp(priceRow?.last_updated_justtcg) ||
      normalizeTimestamp(priceRow?.fetched_at);
    if (!updatedAt) continue;

    rows.push({
      card_print_id: assignment.card_print_id,
      source_id: JUSTTCG_SOURCE.id,
      external_product_id: assignment.external_product_id,
      price_market: priceRow?.price_market ?? priceRow?.price_nm ?? null,
      price_nm: priceRow?.price_nm ?? null,
      price_lp: priceRow?.price_lp ?? null,
      price_change_24h: priceRow?.price_change_24h ?? null,
      price_change_7d: priceRow?.price_change_7d ?? null,
      price_change_30d: priceRow?.price_change_30d ?? null,
      updated_at: updatedAt,
      fetched_at: normalizeTimestamp(priceRow?.fetched_at) || null,
    });

    const snapshot = buildPriceSnapshotRow(assignment.external_product_id, priceRow);
    if (snapshot) snapshots.push(snapshot);
  }

  return { rows, snapshots };
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

    const sku = cleanText(product.number || product.external_product_id) || null;

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

    const snapshot = buildPriceSnapshotRow(product.id, priceRow);
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

function buildSeed(inputs, options) {
  const releaseLookup = buildReleaseLookup(inputs.officialReleases);
  const { externalProducts, productMap } = buildExternalProducts(inputs.catalog, inputs.mappingReport, inputs.priceData, options);
  const { cardPrintMarketLinks, approvedRawAssignments } = collectRawCardMappings(inputs.mappingReport, productMap);
  const priceIndex = indexPriceRows(inputs.priceData);
  const rawCardPrices = buildRawCardPrices(approvedRawAssignments, priceIndex);
  const sealed = buildSealedProducts(productMap, priceIndex, releaseLookup);

  const activeCardPrintAssignments = Array.from(
    new Map(
      cardPrintMarketLinks.map((link) => [
        link.card_print_id,
        {
          card_print_id: link.card_print_id,
          active_external_product_id: null,
        },
      ]),
    ).values(),
  );

  for (const assignment of approvedRawAssignments) {
    const current = activeCardPrintAssignments.find((row) => row.card_print_id === assignment.card_print_id);
    if (current) {
      current.active_external_product_id = assignment.external_product_id;
    }
  }

  return {
    externalSources: options.includeTcgplayerSource ? [JUSTTCG_SOURCE, TCGPLAYER_SOURCE] : [JUSTTCG_SOURCE],
    externalProducts,
    cardPrintMarketLinks,
    activeCardPrintAssignments,
    cardPrintPriceCurrent: rawCardPrices.rows,
    sealedProducts: sealed.sealedProducts,
    sealedProductMarketLinks: sealed.sealedProductMarketLinks,
    sealedProductPriceCurrent: sealed.sealedProductPriceCurrent,
    priceSnapshots: [...rawCardPrices.snapshots, ...sealed.sealedSnapshots],
    meta: {
      ...summarizeFiles(inputs),
      approvedRawAssignments: approvedRawAssignments.length,
      importedExternalProducts: externalProducts.length,
      importedSealedProducts: sealed.sealedProducts.length,
    },
  };
}

function summarizeSeed(seed) {
  return {
    externalSources: seed.externalSources.length,
    externalProducts: seed.externalProducts.length,
    cardPrintMarketLinks: seed.cardPrintMarketLinks.length,
    cardPrintPriceCurrent: seed.cardPrintPriceCurrent.length,
    sealedProducts: seed.sealedProducts.length,
    sealedProductMarketLinks: seed.sealedProductMarketLinks.length,
    sealedProductPriceCurrent: seed.sealedProductPriceCurrent.length,
    priceSnapshots: seed.priceSnapshots.length,
  };
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

async function applyActiveAssignments(sql, tableName, idColumn, assignments, chunkSize) {
  if (!assignments.length) return;

  for (const group of chunk(assignments, chunkSize)) {
    const params = [];
    const valuesSql = group
      .map((row) => {
        params.push(row[idColumn], row.active_external_product_id);
        return `($${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const sqlText = `
      update ${quoteIdentifier(tableName)} as target
      set active_external_product_id = source.active_external_product_id
      from (values ${valuesSql}) as source(${quoteIdentifier(idColumn)}, "active_external_product_id")
      where target.${quoteIdentifier(idColumn)} = source.${quoteIdentifier(idColumn)}
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
        params.push(row.external_product_id, row.captured_at);
        return `($${params.length - 1}, $${params.length})`;
      })
      .join(", ");

    const sqlText = `
      select external_product_id, captured_at
      from price_snapshots
      where (external_product_id, captured_at) in (${tuples})
    `;
    const rows = await sql.unsafe(sqlText, params);
    for (const row of rows) {
      keys.add(`${row.external_product_id}::${new Date(row.captured_at).toISOString()}`);
    }
  }

  return keys;
}

async function applySeed(seed, options) {
  const sql = postgres(getConnectionString(), {
    prepare: false,
    max: 1,
  });

  try {
    await sql.begin(async (tx) => {
      await upsertRows(tx, "external_sources", seed.externalSources, ["id"], options.chunkSize);
      await upsertRows(tx, "external_products", seed.externalProducts, ["id"], options.chunkSize);
      await upsertRows(tx, "sealed_products", seed.sealedProducts, ["id"], options.chunkSize);

      await upsertRows(tx, "card_print_market_links", seed.cardPrintMarketLinks, ["id"], options.chunkSize);

      await upsertRows(tx, "sealed_product_market_links", seed.sealedProductMarketLinks, ["id"], options.chunkSize);

      await applyActiveAssignments(tx, "card_prints", "id", seed.activeCardPrintAssignments, options.chunkSize);

      await deleteCurrentByCollectibleIds(
        tx,
        "card_print_price_current",
        "card_print_id",
        JUSTTCG_SOURCE.id,
        seed.activeCardPrintAssignments.map((row) => row.card_print_id),
        options.chunkSize,
      );
      await upsertRows(
        tx,
        "card_print_price_current",
        seed.cardPrintPriceCurrent,
        ["card_print_id", "source_id"],
        options.chunkSize,
      );

      await deleteCurrentByCollectibleIds(
        tx,
        "sealed_product_price_current",
        "sealed_product_id",
        JUSTTCG_SOURCE.id,
        seed.sealedProducts.map((row) => row.id),
        options.chunkSize,
      );
      await upsertRows(
        tx,
        "sealed_product_price_current",
        seed.sealedProductPriceCurrent,
        ["sealed_product_id", "source_id"],
        options.chunkSize,
      );

      const existingSnapshotKeys = await fetchExistingSnapshotKeys(tx, seed.priceSnapshots, options.chunkSize);
      const seenSnapshotKeys = new Set(existingSnapshotKeys);
      const newSnapshots = seed.priceSnapshots.filter((row) => {
        const key = `${row.external_product_id}::${new Date(row.captured_at).toISOString()}`;
        if (seenSnapshotKeys.has(key)) return false;
        seenSnapshotKeys.add(key);
        return true;
      });
      await insertRows(tx, "price_snapshots", newSnapshots, options.chunkSize);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [catalog, mappingReport, priceData, officialReleases] = await Promise.all([
    readJsonIfExists(args.catalog),
    readJsonIfExists(args.mappingReport),
    readJsonIfExists(args.priceData),
    readJsonIfExists(OFFICIAL_RELEASES_PATH),
  ]);

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

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

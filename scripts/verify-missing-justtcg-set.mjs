import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath, pathToFileURL } from "url";
import {
  chunk,
  DEFAULT_CATALOG_PATH,
  inferTcgplayerId,
  loadJson,
  parseArgs,
  postgrestInsert,
  postgrestUpsert,
  readOfficialCards,
  supabaseConfigFromEnv,
  writeJson,
} from "./lib/justtcg-utils.mjs";
import { getTcgplayerProductDetail } from "./lib/tcgplayer-detail-cache.mjs";
import {
  cleanedCardName,
  normalizeBandaiNumber,
  normalizeText,
} from "./lib/justtcg-matcher.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "..");
export const DEFAULT_DB_PATH = path.join(REPO_ROOT, ".cache", "devilfruit.db");
export const DEFAULT_TCGPLAYER_CACHE_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "tcgplayer-details-cache.json");
export const DEFAULT_REPORT_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "set-verification-report.json");
const RELEASE_ALIASES = {
  PRB01: ["premium booster the best", "one piece card the best"],
  PRB02: ["premium booster the best vol 2", "one piece card the best vol 2"],
  EB03: ["extra booster one piece heroines edition", "one piece heroines edition", "extra booster 03"],
  EB04: ["the azure sea's seven", "the azure sea s seven", "extra booster 04"],
};

function normalizeSimple(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function baseId(cardId) {
  return String(cardId || "").replace(/_[A-Za-z0-9]+$/u, "");
}

function setAliasesForCard(card) {
  const aliases = new Set();
  for (const value of [card.set, card.originSet]) {
    const normalized = normalizeText(String(value || "").replace(/\s*\[[^\]]+\]\s*$/u, ""));
    if (normalized) aliases.add(normalized);
  }
  for (const alias of RELEASE_ALIASES[String(card.releaseCode || "").toUpperCase()] || []) {
    aliases.add(normalizeText(alias));
  }
  return [...aliases];
}

const PREMIUM_LABELS = [
  { phrase: "red super alternate art", variantType: "alt_art", variantLabel: "Red Super Alternate Art", token: "red super alternate art", fallbackToken: "alternate art" },
  { phrase: "super alternate art", variantType: "alt_art", variantLabel: "Super Alternate Art", token: "super alternate art", fallbackToken: "alternate art" },
  { phrase: "box topper", variantType: "alt_art", variantLabel: "Box Topper", token: "box topper", fallbackToken: "alternate art" },
  { phrase: "jolly roger foil", variantType: "parallel", variantLabel: "Jolly Roger Foil", token: "jolly roger foil", fallbackToken: "parallel" },
  { phrase: "full art", variantType: "alt_art", variantLabel: "Full Art", token: "full art", fallbackToken: "alternate art" },
  { phrase: "treasure rare", variantType: "alt_art", variantLabel: "Treasure Rare", token: "treasure rare", fallbackToken: "alternate art" },
  { phrase: "pirate foil", variantType: "parallel", variantLabel: "Pirate Foil", token: "pirate foil", fallbackToken: "parallel" },
  { phrase: "participation", variantType: "sp", variantLabel: "Participation Pack", token: "participation", fallbackToken: "sp" },
  { phrase: "finalist", variantType: "sp", variantLabel: "Finalist", token: "finalist", fallbackToken: "sp" },
  { phrase: "champion", variantType: "sp", variantLabel: "Champion", token: "champion", fallbackToken: "sp" },
  { phrase: "sp gold", variantType: "sp", variantLabel: "SP (Gold)", token: "sp gold", fallbackToken: "sp" },
  { phrase: "sp silver", variantType: "sp", variantLabel: "SP (Silver)", token: "sp silver", fallbackToken: "sp" },
  { phrase: "winner pack", variantType: "sp", variantLabel: "Winner Pack", token: "winner pack", fallbackToken: "sp" },
  { phrase: "winner card set", variantType: "sp", variantLabel: "Winner Card Set", token: "winner card set", fallbackToken: "sp" },
  { phrase: "event pack", variantType: "sp", variantLabel: "Event Pack", token: "event pack", fallbackToken: "sp" },
  { phrase: "tournament pack", variantType: "sp", variantLabel: "Tournament Pack", token: "tournament pack", fallbackToken: "sp" },
  { phrase: "alternate art", variantType: "alt_art", variantLabel: "Alternate Art", token: "alternate art", fallbackToken: "alternate art" },
  { phrase: "manga", variantType: "manga", variantLabel: "Manga", token: "manga", fallbackToken: "manga" },
  { phrase: "anniversary", variantType: "anniversary", variantLabel: "Anniversary", token: "anniversary", fallbackToken: "anniversary" },
  { phrase: "reprint", variantType: "parallel", variantLabel: "Reprint", token: "reprint", fallbackToken: "parallel" },
];

function labelTextFromCard(card) {
  return normalizeText([card.variantLabel, card.variantSlug].filter(Boolean).join(" "));
}

function labelTokenFromText(text) {
  const normalized = normalizeText(text);
  for (const entry of PREMIUM_LABELS) {
    if (normalized.includes(entry.phrase)) return entry;
  }
  return null;
}

function specificPremiumLabelFromCard(card) {
  return labelTokenFromText(labelTextFromCard(card));
}

function specificPremiumLabelFromText(text) {
  return labelTokenFromText(text);
}

function labelTokens(card) {
  const premiumLabel = specificPremiumLabelFromCard(card);
  if (premiumLabel) return [premiumLabel.token];

  const variantLabel = normalizeText(card.variantLabel || "");
  const variantType = String(card.variantType || "").toLowerCase();
  const variantSlug = normalizeText(String(card.variantSlug || "").replace(/_/g, " "));
  if (variantLabel.includes("pirate foil") || variantSlug.includes("pirate foil")) return ["pirate foil"];
  if (variantLabel.includes("participation") || variantSlug.includes("participation")) return ["participation"];
  if (variantLabel.includes("finalist") || variantSlug.includes("finalist")) return ["finalist"];
  if (variantLabel.includes("champion") || variantSlug.includes("champion")) return ["champion"];
  if (variantLabel.includes("gold") || variantSlug.includes("gold")) return ["gold"];
  if (variantLabel.includes("silver") || variantSlug.includes("silver")) return ["silver"];
  if (variantType === "sp" || variantLabel === "sp" || variantSlug === "sp") return ["sp"];
  if (variantType === "parallel" || variantLabel.includes("parallel") || variantSlug.includes("parallel")) return ["parallel"];
  if (variantType === "anniversary" || variantLabel.includes("anniversary") || variantSlug.includes("anniversary")) return ["anniversary"];
  if (variantType === "manga" || variantLabel.includes("manga") || variantSlug.includes("manga")) return ["manga"];
  if (variantLabel.includes("reprint") || variantSlug.includes("reprint")) return ["reprint"];
  if (variantType === "alt_art" || variantLabel.includes("alternate art") || variantSlug.includes("alternate art")) return ["alternate art"];
  return [];
}

function labelFromCandidateAndDetail(candidate, detail) {
  const syntheticCandidate = {
    name: [candidate?.name, detail?.productName, detail?.productUrlName].filter(Boolean).join(" "),
    set_name: [candidate?.set_name, detail?.setName].filter(Boolean).join(" "),
    set: [candidate?.set, detail?.setName].filter(Boolean).join(" "),
    id: candidate?.id,
  };
  const specific = specificPremiumLabelFromText([
    candidate?.name,
    detail?.productName,
    detail?.productUrlName,
    candidate?.set_name,
    candidate?.set,
    detail?.setName,
  ].join(" "));
  if (specific) {
    return { variantType: specific.variantType, variantLabel: specific.variantLabel };
  }

  const haystack = normalizeText([
    candidate?.name,
    detail?.productName,
    detail?.productUrlName,
    candidate?.set_name,
    candidate?.set,
    detail?.setName,
  ].join(" "));
  if (haystack.includes("pirate foil")) {
    return { variantType: "parallel", variantLabel: "Pirate Foil" };
  }
  if (haystack.includes("sp gold")) {
    return { variantType: "sp", variantLabel: "SP (Gold)" };
  }
  if (haystack.includes("sp silver")) {
    return { variantType: "sp", variantLabel: "SP (Silver)" };
  }
  if (haystack.includes("participation")) {
    return { variantType: "sp", variantLabel: "Participation Pack" };
  }
  if (haystack.includes("finalist")) {
    return { variantType: "sp", variantLabel: "Finalist" };
  }
  if (haystack.includes("champion")) {
    return { variantType: "sp", variantLabel: "Champion" };
  }
  if (haystack.includes("alternate art")) {
    return { variantType: "alt_art", variantLabel: "Alternate Art" };
  }
  if (haystack.includes("anniversary")) {
    return { variantType: "anniversary", variantLabel: "Anniversary" };
  }
  if (haystack.includes("manga")) {
    return { variantType: "manga", variantLabel: "Manga" };
  }
  if (/\bsp\b/.test(haystack)) {
    return { variantType: "sp", variantLabel: "SP" };
  }
  if (haystack.includes("parallel")) {
    return { variantType: "parallel", variantLabel: "Parallel" };
  }
  if (haystack.includes("reprint")) {
    return { variantType: "parallel", variantLabel: "Reprint" };
  }
  return null;
}

function looksLikePremiumTreatment(candidate, detail) {
  const text = normalizeText([
    candidate?.name,
    detail?.productName,
    detail?.productUrlName,
    candidate?.set_name,
    candidate?.set,
    detail?.setName,
  ].join(" "));
  return PREMIUM_LABELS.some((entry) => text.includes(entry.phrase));
}

function getExpectedNumber(card) {
  if (String(card.printedCardId || "").trim()) return String(card.printedCardId).trim().toUpperCase();
  if (String(card.baseId || "").trim()) return String(card.baseId).trim().toUpperCase();
  return normalizeBandaiNumber(card);
}

function numberMatches(card, detail, candidate) {
  const expected = getExpectedNumber(card);
  const detailNumber = String(detail?.customAttributes?.number || detail?.formattedAttributes?.Number || "").toUpperCase().trim();
  const candidateNumber = String(candidate?.number || "").toUpperCase().trim();
  return detailNumber === expected || candidateNumber === expected;
}

function coreNameMatches(card, detail, candidate) {
  const expected = normalizeSimple(cleanedCardName(card.name));
  if (!expected) return false;
  const haystacks = [
    detail?.productName,
    detail?.productUrlName,
    candidate?.name,
  ].map((value) => normalizeSimple(value));
  return haystacks.some((value) => value.includes(expected));
}

function labelMatches(card, detail, candidate) {
  const tokens = labelTokens(card);
  if (!tokens.length) {
    return labelFromCandidateAndDetail(candidate, detail) == null && !looksLikePremiumTreatment(candidate, detail);
  }
  const haystacks = [
    detail?.productName,
    detail?.productUrlName,
    candidate?.name,
  ].map((value) => normalizeText(value));
  return tokens.some((token) => haystacks.some((value) => value.includes(token)));
}

function setFamilyMatches(card, detail, candidate, releaseCode) {
  const candidateSet = normalizeText(candidate?.set_name || candidate?.set || "");
  const detailSet = normalizeText(detail?.setName || "");
  if (!candidateSet || !detailSet) return false;
  const release = normalizeText(releaseCode);
  const aliases = setAliasesForCard(card);
  const haystacks = [candidateSet, detailSet];
  if (release && haystacks.some((value) => value.includes(release))) return true;
  return aliases.some((alias) => haystacks.some((value) => value.includes(alias) || alias.includes(value)));
}

function isOnePieceProduct(detail) {
  return normalizeText(detail?.productLineName || "") === "one piece card game";
}

function variantSortScore(variant, preferredCondition) {
  const condition = String(variant.condition || "").toLowerCase();
  const printing = String(variant.printing || "").toLowerCase();
  const language = String(variant.language || "").toLowerCase();
  let score = 0;
  if (language === "english") score += 100;
  if (condition === preferredCondition) score += 60;
  if (printing === "normal") score += 20;
  if (printing === "foil") score += 10;
  return score;
}

function pickVariant(card, preferredCondition) {
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  if (!variants.length) return null;
  return [...variants].sort((left, right) => variantSortScore(right, preferredCondition) - variantSortScore(left, preferredCondition))[0] || null;
}

function toIsoFromUnix(value) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function readEbayPriceMap(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare("select card_id, data from price_cache").all();
  const map = new Map();
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.data);
      const average = Number(payload?.ebay?.averagePrice);
      map.set(row.card_id, Number.isFinite(average) ? average : null);
    } catch {
      map.set(row.card_id, null);
    }
  }
  db.close();
  return map;
}

function priceGuard(justtcgPrice, ebayPrice) {
  if (!(justtcgPrice > 0) || !(ebayPrice > 0)) return { suspicious: false, ratio: null };
  const ratio = justtcgPrice / ebayPrice;
  return { suspicious: ratio > 5 || ratio < 0.2, ratio };
}

function summarizeCandidateFailure(card, candidate, tcgplayerId, error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    cardId: card.id,
    candidate: {
      id: candidate.id,
      name: candidate.name,
      tcgplayerId,
    },
    error: message,
  };
}

export function evaluateVerificationCard({
  card,
  expectedNumber,
  releaseCode,
  candidateResults,
  ebayPrice,
  allowLabelCorrections,
}) {
  const approved = [];
  const rejected = [];
  const unresolved = [];
  const labelCorrections = [];
  const verified = [];
  const validByIdentity = [];
  const candidateFailures = [];

  for (const result of candidateResults) {
    if (result.error) {
      candidateFailures.push(summarizeCandidateFailure(card, result.candidate, result.tcgplayerId, result.error));
      continue;
    }

    const { candidate, detail } = result;
    if (!isOnePieceProduct(detail)) continue;
    if (!numberMatches(card, detail, candidate)) continue;
    if (!coreNameMatches(card, detail, candidate)) continue;
    if (!setFamilyMatches(card, detail, candidate, releaseCode)) continue;
    validByIdentity.push({ candidate, detail });
    if (!labelMatches(card, detail, candidate)) continue;
    verified.push({ candidate, detail });
  }

  if (verified.length === 1) {
    const candidate = verified[0].candidate;
    const justtcgPrice = Number(pickVariant(candidate, "near mint")?.price ?? null);
    const guard = priceGuard(justtcgPrice, ebayPrice);
    if (guard.suspicious) {
      rejected.push({
        cardId: card.id,
        reason: "price_guard_rejected",
        justtcgPrice,
        ebayPrice,
        ratio: guard.ratio,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          tcgplayerId: inferTcgplayerId(candidate),
        },
      });
      return { approved, rejected, unresolved, labelCorrections };
    }

    approved.push({ card, candidate });
    return { approved, rejected, unresolved, labelCorrections };
  }

  if (allowLabelCorrections && !verified.length && validByIdentity.length) {
    const deduped = new Map();
    for (const item of validByIdentity) {
      deduped.set(item.candidate.id, item);
    }
    const normalized = [...deduped.values()].map((item) => ({
      ...item,
      derivedLabel: labelFromCandidateAndDetail(item.candidate, item.detail),
    })).filter((item) => item.derivedLabel);
    const labels = [...new Set(normalized.map((item) => item.derivedLabel.variantLabel))];
    if (normalized.length === 1 && labels.length === 1) {
      const { candidate, derivedLabel } = normalized[0];
      const justtcgPrice = Number(pickVariant(candidate, "near mint")?.price ?? null);
      const guard = priceGuard(justtcgPrice, ebayPrice);
      if (guard.suspicious) {
        rejected.push({
          cardId: card.id,
          reason: "price_guard_rejected_after_label_correction",
          justtcgPrice,
          ebayPrice,
          ratio: guard.ratio,
          candidate: {
            id: candidate.id,
            name: candidate.name,
            tcgplayerId: inferTcgplayerId(candidate),
          },
        });
        return { approved, rejected, unresolved, labelCorrections };
      }
      approved.push({ card, candidate });
      labelCorrections.push({
        cardId: card.id,
        currentVariantType: card.variantType || null,
        currentVariantLabel: card.variantLabel || null,
        suggestedVariantType: derivedLabel.variantType,
        suggestedVariantLabel: derivedLabel.variantLabel,
        justtcgId: candidate.id,
        justtcgName: candidate.name,
        justtcgTcgplayerId: inferTcgplayerId(candidate),
      });
      return { approved, rejected, unresolved, labelCorrections };
    }
  }

  if (verified.length !== 1) {
    unresolved.push({
      cardId: card.id,
      reason: candidateFailures.length
        ? "candidate_detail_failures"
        : verified.length
          ? "multiple_verified_candidates"
          : "no_verified_candidate",
      expectedNumber,
      candidates: candidateResults.map((result) => ({
        id: result.candidate.id,
        name: result.candidate.name,
        tcgplayerId: result.tcgplayerId || inferTcgplayerId(result.candidate),
        error: result.error ? (result.error instanceof Error ? result.error.message : String(result.error)) : null,
      })),
      candidateFailures,
    });
  }

  return { approved, rejected, unresolved, labelCorrections };
}

async function fetchPricedIds(config) {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const url = new URL(`${config.url}/rest/v1/justtcg_prices`);
    url.searchParams.set("select", "devilfruit_id,price_nm");
    url.searchParams.set("order", "devilfruit_id.asc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to load justtcg_prices: ${response.status} ${await response.text()}`);
    }
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return new Set(rows.filter((row) => row.price_nm !== null).map((row) => row.devilfruit_id));
}

function buildMappingRow(card, candidate, fetchedAt) {
  return {
    devilfruit_id: card.id,
    bandai_number: getExpectedNumber(card),
    justtcg_id: candidate.id,
    justtcg_tcgplayer_id: String(inferTcgplayerId(candidate) || ""),
    justtcg_name: candidate.name,
    justtcg_set: candidate.set_name || candidate.set || null,
    search_method: "set_verifier",
    search_query: getExpectedNumber(card),
    candidate_count: 1,
    confidence: "high",
    confidence_reasons: ["exact_number_match", "exact_label_match", "tcgplayer_verified_candidate"],
    status: "auto_approved",
    mapped_at: fetchedAt,
    reviewed_at: null,
    notes: "Approved by TCGplayer-verified set verifier",
  };
}

function buildPriceRow(cardId, candidate, fetchedAt) {
  const nm = pickVariant(candidate, "near mint");
  const lp = pickVariant(candidate, "lightly played");
  return {
    devilfruit_id: cardId,
    justtcg_id: candidate.id,
    price_nm: typeof nm?.price === "number" ? nm.price : null,
    price_lp: typeof lp?.price === "number" ? lp.price : null,
    price_change_24h: typeof nm?.priceChange24hr === "number" ? nm.priceChange24hr : null,
    price_change_7d: typeof nm?.priceChange7d === "number" ? nm.priceChange7d : null,
    price_change_30d: typeof nm?.priceChange30d === "number" ? nm.priceChange30d : null,
    last_updated_justtcg: toIsoFromUnix(nm?.lastUpdated),
    fetched_at: fetchedAt,
    raw_response: candidate,
  };
}

async function persistRows(config, mappingRows, priceRows, historyRows) {
  for (const group of chunk(mappingRows, 100)) {
    await postgrestUpsert(config, "justtcg_card_map", group, "devilfruit_id");
  }
  for (const group of chunk(priceRows, 100)) {
    await postgrestUpsert(config, "justtcg_prices", group, "devilfruit_id");
  }
  for (const group of chunk(historyRows, 200)) {
    await postgrestInsert(config, "justtcg_price_history", group);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseCode = String(args.release || args["set-code"] || "").toUpperCase().trim();
  const writeEnabled = Boolean(args.write);
  const dbPath = path.resolve(String(args.db || DEFAULT_DB_PATH));
  const snapshotPath = path.resolve(String(args.snapshot || DEFAULT_CATALOG_PATH));
  const cachePath = path.resolve(String(args["tcg-cache"] || DEFAULT_TCGPLAYER_CACHE_PATH));
  const reportPath = path.resolve(String(args.out || DEFAULT_REPORT_PATH));
  const allowLabelCorrections = Boolean(args["allow-label-corrections"]);
  const config = supabaseConfigFromEnv();

  if (!releaseCode) {
    throw new Error("Missing --release, for example --release PRB02");
  }
  if (!config) {
    throw new Error("Missing Supabase service-role configuration");
  }

  const allCards = readOfficialCards();
  const snapshotRaw = loadJson(snapshotPath, null);
  if (!snapshotRaw) {
    throw new Error(`Catalog snapshot missing at ${snapshotPath}`);
  }
  const snapshot = Array.isArray(snapshotRaw) ? snapshotRaw : (snapshotRaw.data || snapshotRaw.cards || []);
  const pricedIds = await fetchPricedIds(config);
  const tcgCache = loadJson(cachePath, {});
  const ebayPrices = readEbayPriceMap(dbPath);

  const targetCards = allCards.filter((card) => {
    const releaseMatch = card.releaseCode === releaseCode || String(card.set || "").includes(`[${releaseCode}]`);
    return releaseMatch && !pricedIds.has(card.id);
  });

  const approved = [];
  const rejected = [];
  const unresolved = [];
  const labelCorrections = [];

  for (const card of targetCards) {
    const expectedNumber = getExpectedNumber(card);
    const candidates = snapshot.filter((candidate) => String(candidate.number || "").toUpperCase().trim() === expectedNumber);
    if (!candidates.length) {
      unresolved.push({ cardId: card.id, reason: "no_snapshot_candidate", expectedNumber });
      continue;
    }

    const candidateResults = [];
    for (const candidate of candidates) {
      const tcgplayerId = inferTcgplayerId(candidate);
      if (!tcgplayerId) {
        candidateResults.push({
          candidate,
          tcgplayerId,
          error: new Error("missing_tcgplayer_id"),
        });
        continue;
      }
      try {
        const detail = await getTcgplayerProductDetail({
          productId: tcgplayerId,
          cache: tcgCache,
          cachePath,
          ttlMs: 24 * 60 * 60 * 1000,
          fetchImpl: fetch,
        });
        candidateResults.push({ candidate, tcgplayerId, detail });
      } catch (error) {
        candidateResults.push({ candidate, tcgplayerId, error });
      }
    }

    const cardOutcome = evaluateVerificationCard({
      card,
      expectedNumber,
      releaseCode,
      candidateResults,
      ebayPrice: ebayPrices.get(card.id) ?? null,
      allowLabelCorrections,
    });
    approved.push(...cardOutcome.approved);
    rejected.push(...cardOutcome.rejected);
    unresolved.push(...cardOutcome.unresolved);
    labelCorrections.push(...cardOutcome.labelCorrections);
  }

  const fetchedAt = new Date().toISOString();
  const mappingRows = approved.map(({ card, candidate }) => buildMappingRow(card, candidate, fetchedAt));
  const priceRows = approved.map(({ card, candidate }) => buildPriceRow(card.id, candidate, fetchedAt));
  const historyRows = priceRows.map((row) => ({
    devilfruit_id: row.devilfruit_id,
    price_nm: row.price_nm,
    recorded_at: fetchedAt,
  }));

  if (writeEnabled && mappingRows.length) {
    await persistRows(config, mappingRows, priceRows, historyRows);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseCode,
    totalMissing: targetCards.length,
    approved: mappingRows.length,
    rejected: rejected.length,
    unresolved: unresolved.length,
    labelCorrections,
    approvedRows: mappingRows.map((row, index) => ({
      devilfruit_id: row.devilfruit_id,
      justtcg_name: row.justtcg_name,
      justtcg_tcgplayer_id: row.justtcg_tcgplayer_id,
      price_nm: priceRows[index]?.price_nm ?? null,
    })),
    rejectedRows: rejected,
    unresolvedRows: unresolved,
  };

  writeJson(reportPath, report);
  console.log(JSON.stringify({
    releaseCode,
    totalMissing: report.totalMissing,
    approved: report.approved,
    rejected: report.rejected,
    unresolved: report.unresolved,
    reportPath,
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}

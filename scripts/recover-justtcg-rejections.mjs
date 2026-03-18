import path from "path";
import Database from "better-sqlite3";
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
import {
  SET_CODE_ALIASES,
  buildCatalogIndexes,
  candidatePremiumHints,
  classifyCatalogCard,
  coreNameMatch,
  extractDigits,
  matchCardAgainstSnapshot,
  normalizeBandaiNumber,
  normalizeText,
  priceSnapshot,
} from "./lib/justtcg-matcher.mjs";

const REPO_ROOT = "/Users/javierbarro/Desktop/devilfruittcg";
const DEFAULT_REPORT_PATH = path.join(REPO_ROOT, ".cache", "justtcg", "released-mapping-report-final.json");
const DEFAULT_DB_PATH = path.join(REPO_ROOT, ".cache", "devilfruit.db");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, ".cache", "justtcg", "recovery");
const STRONG_TIER2_METHODS = new Set([
  "heuristic_booster_p1",
  "heuristic_starter_p1",
  "heuristic_tr",
  "heuristic_eb04_p1",
  "heuristic_promo",
  "heuristic_other_collection",
  "heuristic_eb01_alt",
  "heuristic_eb01_manga",
  "heuristic_st13_parallel",
  "heuristic_prb02_sequence",
]);

function normalizeCandidateNumber(value) {
  const raw = String(value || "").toUpperCase().trim();
  const direct = raw.match(/^([A-Z]{2,4}\d{2})-(\d{3})$/);
  return direct ? `${direct[1]}-${direct[2]}` : raw;
}

function setAliasesForCard(card) {
  const aliases = SET_CODE_ALIASES[String(card.setCode || "").toUpperCase()] || [];
  const normalizedSet = normalizeText(String(card.set || "").replace(/\s*\[[^\]]+\]\s*$/u, ""));
  return Array.from(new Set([normalizedSet, ...aliases].filter(Boolean)));
}

function setMatch(card, candidate) {
  const candidateSet = normalizeText(candidate.set_name || candidate.set || "");
  if (!candidateSet) return false;
  return setAliasesForCard(card).some((alias) => candidateSet.includes(alias) || alias.includes(candidateSet));
}

function sameNumber(card, candidate) {
  const normalized = normalizeCandidateNumber(candidate.number);
  const expected = normalizeBandaiNumber(card);
  return normalized === expected || extractDigits(normalized) === extractDigits(expected);
}

function labelHintsFromCard(card) {
  const type = String(card.variantType || "").toLowerCase();
  const label = normalizeText(card.variantLabel || "");
  const slug = normalizeText(String(card.variantSlug || "").replace(/_/g, " "));
  const hints = [];
  if (label.includes("pirate foil") || slug.includes("pirate foil")) hints.push("pirate_foil");
  if (label.includes("participation") || slug.includes("participation")) hints.push("participation");
  if (label.includes("finalist") || slug.includes("finalist")) hints.push("finalist");
  if (label.includes("champion") || slug.includes("champion")) hints.push("champion");
  if (label.includes("gold") || slug.includes("gold")) hints.push("gold");
  if (label.includes("silver") || slug.includes("silver")) hints.push("silver");
  if (type === "sp" || label === "sp") hints.push("sp");
  if (type === "manga" || label.includes("manga")) hints.push("manga");
  if (type === "parallel" || label.includes("parallel")) hints.push("parallel");
  if (type === "anniversary" || label.includes("anniversary")) hints.push("anniversary");
  if (type === "alt_art" || label.includes("alternate art")) hints.push("alt");
  return Array.from(new Set(hints));
}

function cleanPremiumCandidates(card, result) {
  const labelHints = labelHintsFromCard(card);
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];
  return candidates.filter((candidate) => {
    if (classifyCatalogCard(candidate).bucket === "excluded_product") return false;
    if (!sameNumber(card, candidate)) return false;
    if (!coreNameMatch(card.name, candidate.name)) return false;
    const candidateHints = candidatePremiumHints(candidate);
    return labelHints.some((hint) => candidateHints.includes(hint));
  });
}

function inferRecoveryMethod(card, result) {
  const cleanCandidates = cleanPremiumCandidates(card, result);
  const setMatched = cleanCandidates.filter((candidate) => setMatch(card, candidate));
  if (cleanCandidates.length === 1) return "snapshot_single";
  if (setMatched.length === 1) return "snapshot_setmatch";

  const setCode = String(card.setCode || "").toUpperCase();
  const label = String(card.variantType || "").toLowerCase();
  const suffix = String(card.id || "").toLowerCase();

  if (setCode === "PRB02") return "heuristic_prb02_sequence";
  if (setCode === "ST13" && label === "parallel") return "heuristic_st13_parallel";
  if (setCode === "EB01" && label === "alt_art") return "heuristic_eb01_alt";
  if (setCode === "EB01" && label === "manga") return "heuristic_eb01_manga";
  if (setCode === "EB04" && suffix.endsWith("_p1")) return "heuristic_eb04_p1";
  if (setCode === "P") return "heuristic_promo";
  if (setCode.startsWith("ST") && suffix.endsWith("_p1")) return "heuristic_starter_p1";
  if ((setCode.startsWith("OP") || setCode.startsWith("EB")) && suffix.endsWith("_p1")) return "heuristic_booster_p1";
  if (String(card.variantLabel || "") === "Parallel" && /\bTR\b/i.test(String(card.rarity || ""))) return "heuristic_tr";
  if (["PRB", "EXTRA", "PB", "PC"].some((prefix) => setCode.startsWith(prefix))) return "heuristic_other_collection";
  return null;
}

function candidateLabelAgrees(card, candidate) {
  const labelHints = labelHintsFromCard(card);
  if (!labelHints.length) return false;
  const candidateHints = candidatePremiumHints(candidate);
  return labelHints.some((hint) => candidateHints.includes(hint));
}

function loadEbayPriceMap(dbPath) {
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

function priceGuard(cardId, justtcgPrice, ebayPrice) {
  if (!(justtcgPrice > 0) || !(ebayPrice > 0)) {
    return { suspicious: false, ratio: null };
  }
  const ratio = justtcgPrice / ebayPrice;
  return {
    suspicious: ratio > 5 || ratio < 0.2,
    ratio,
  };
}

async function fetchExistingStatusCounts(config) {
  const counts = { auto_approved: 0, manually_approved: 0, rejected: 0, needs_review: 0 };
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = new URL(`${config.url}/rest/v1/justtcg_card_map`);
    url.searchParams.set("select", "status");
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
      throw new Error(`Failed to load current status counts: ${response.status} ${await response.text()}`);
    }

    const batch = await response.json();
    for (const row of batch) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return counts;
}

function buildMappingRow(card, result, method) {
  const candidate = result.best.candidate;
  return {
    devilfruit_id: card.id,
    bandai_number: normalizeBandaiNumber(card),
    justtcg_id: candidate.id,
    justtcg_tcgplayer_id: String(inferTcgplayerId(candidate) || ""),
    justtcg_name: candidate.name,
    justtcg_set: candidate.set_name || candidate.set || null,
    search_method: result.searchMethod,
    search_query: result.searchQuery,
    candidate_count: result.candidateCount,
    confidence: result.confidence,
    confidence_reasons: Array.from(new Set([method, ...result.confidenceReasons])),
    status: "auto_approved",
    mapped_at: new Date().toISOString(),
    reviewed_at: null,
    notes: result.notes || null,
  };
}

function buildPriceRow(card, result, fetchedAt) {
  const candidate = result.best.candidate;
  const variants = Array.isArray(candidate.variants) ? candidate.variants : [];
  const english = variants.filter((variant) => String(variant.language || "").toLowerCase() === "english");
  const pool = english.length ? english : variants;
  const nearMint = pool.filter((variant) => String(variant.condition || "").toLowerCase() === "near mint");
  const foilNearMint = nearMint.filter((variant) => String(variant.printing || "").toLowerCase() === "foil");
  const nm = foilNearMint[0] || nearMint[0] || pool[0] || null;
  const lp = pool.find((variant) => String(variant.condition || "").toLowerCase() === "lightly played") || null;

  return {
    devilfruit_id: card.id,
    justtcg_id: candidate.id,
    price_nm: typeof nm?.price === "number" ? nm.price : null,
    price_lp: typeof lp?.price === "number" ? lp.price : null,
    price_change_24h: typeof nm?.priceChange24hr === "number" ? nm.priceChange24hr : null,
    price_change_7d: typeof nm?.priceChange7d === "number" ? nm.priceChange7d : null,
    price_change_30d: typeof nm?.priceChange30d === "number" ? nm.priceChange30d : null,
    last_updated_justtcg: typeof nm?.lastUpdated === "number" ? new Date(nm.lastUpdated * 1000).toISOString() : null,
    fetched_at: fetchedAt,
    raw_response: candidate,
  };
}

function historyRow(priceRow) {
  return {
    devilfruit_id: priceRow.devilfruit_id,
    price_nm: priceRow.price_nm,
    recorded_at: priceRow.fetched_at,
  };
}

async function persistRecovered(config, rows, prices, history) {
  for (const group of chunk(rows, 100)) {
    await postgrestUpsert(config, "justtcg_card_map", group, "devilfruit_id");
  }
  for (const group of chunk(prices, 100)) {
    await postgrestUpsert(config, "justtcg_prices", group, "devilfruit_id");
  }
  for (const group of chunk(history, 200)) {
    await postgrestInsert(config, "justtcg_price_history", group);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tier = String(args.tier || "tier1");
  const reportPath = path.resolve(String(args["mapping-report"] || DEFAULT_REPORT_PATH));
  const snapshotPath = path.resolve(String(args.snapshot || DEFAULT_CATALOG_PATH));
  const dbPath = path.resolve(String(args.db || DEFAULT_DB_PATH));
  const outputPath = path.resolve(String(args.out || path.join(DEFAULT_OUTPUT_DIR, `${tier}-report.json`)));
  const writeEnabled = Boolean(args.write);
  const config = supabaseConfigFromEnv();

  if (writeEnabled && !config) {
    throw new Error("Missing Supabase service-role configuration");
  }

  const cards = readOfficialCards();
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const report = loadJson(reportPath, null);
  const snapshot = loadJson(snapshotPath, null);
  if (!report?.results || !Array.isArray(snapshot?.cards)) {
    throw new Error("Invalid report or snapshot input");
  }

  const indexes = buildCatalogIndexes(snapshot.cards);
  const ebayPriceMap = loadEbayPriceMap(dbPath);
  const rejectedResults = report.results.filter((row) => row.status === "rejected" && /_p\d+$/i.test(row.cardId));
  const beforeCounts = config ? await fetchExistingStatusCounts(config) : null;
  const recovered = [];
  const skipped = [];
  const rejected = [];
  const fetchedAt = new Date().toISOString();

  for (const row of rejectedResults) {
    const card = cardById.get(row.cardId);
    if (!card?.variantType) continue;

    const result = matchCardAgainstSnapshot(card, indexes);
    const method = inferRecoveryMethod(card, result);
    const bestCandidate = result.best?.candidate || null;
    const labelAgreement = bestCandidate ? candidateLabelAgrees(card, bestCandidate) : false;
    const candidateSetMatch = bestCandidate ? setMatch(card, bestCandidate) : false;
    const priceInfo = bestCandidate ? priceSnapshot(bestCandidate) : { price: null, lastUpdated: null };
    const ebayPrice = ebayPriceMap.get(card.id) ?? null;
    const guard = priceGuard(card.id, priceInfo.price, ebayPrice);

    let eligibleTier = false;
    if (tier === "tier1") {
      eligibleTier = method === "snapshot_single" || method === "snapshot_setmatch";
    } else if (tier === "tier2") {
      eligibleTier = STRONG_TIER2_METHODS.has(method) && labelAgreement;
    } else {
      throw new Error(`Unsupported tier: ${tier}`);
    }

    const basePayload = {
      cardId: card.id,
      setCode: card.setCode,
      variantType: card.variantType,
      variantLabel: card.variantLabel,
      recoveryMethod: method,
      labelAgreement,
      candidateSetMatch,
      ebayPrice,
      justtcgPrice: priceInfo.price,
      ratio: guard.ratio,
      resultStatus: result.status,
      confidence: result.confidence,
      reasons: result.confidenceReasons,
      bestCandidate: bestCandidate
        ? {
            id: bestCandidate.id,
            name: bestCandidate.name,
            set: bestCandidate.set_name || bestCandidate.set || null,
            number: bestCandidate.number || null,
            tcgplayerId: inferTcgplayerId(bestCandidate),
          }
        : null,
    };

    if (!eligibleTier) {
      skipped.push({ ...basePayload, skipReason: "not_in_tier" });
      continue;
    }

    if (result.status !== "auto_approved" || !["high", "medium"].includes(String(result.confidence))) {
      rejected.push({ ...basePayload, rejectReason: "matcher_not_confident" });
      continue;
    }

    if (!bestCandidate || !labelAgreement) {
      rejected.push({ ...basePayload, rejectReason: "label_candidate_mismatch" });
      continue;
    }

    if (tier === "tier2" && !candidateSetMatch) {
      rejected.push({ ...basePayload, rejectReason: "tier2_requires_set_match" });
      continue;
    }

    if (guard.suspicious) {
      rejected.push({ ...basePayload, rejectReason: "price_delta_guard" });
      continue;
    }

    const mappingRow = buildMappingRow(card, result, method);
    const priceRow = buildPriceRow(card, result, fetchedAt);
    recovered.push({
      ...basePayload,
      mappingRow,
      priceRow,
    });
  }

  if (writeEnabled && recovered.length) {
    await persistRecovered(
      config,
      recovered.map((entry) => entry.mappingRow),
      recovered.map((entry) => entry.priceRow),
      recovered.map((entry) => historyRow(entry.priceRow)),
    );
  }

  const afterCounts = config ? await fetchExistingStatusCounts(config) : null;
  const reportPayload = {
    generatedAt: new Date().toISOString(),
    tier,
    recoveredCount: recovered.length,
    skippedCount: skipped.length,
    rejectedCount: rejected.length,
    recovered: recovered.map((entry) => ({
      cardId: entry.cardId,
      setCode: entry.setCode,
      variantType: entry.variantType,
      variantLabel: entry.variantLabel,
      recoveryMethod: entry.recoveryMethod,
      justtcgPrice: entry.justtcgPrice,
      ebayPrice: entry.ebayPrice,
      ratio: entry.ratio,
      confidence: entry.confidence,
      bestCandidate: entry.bestCandidate,
    })),
    rejected,
    skipped,
    beforeCounts,
    afterCounts,
  };
  writeJson(outputPath, reportPayload);

  console.log(JSON.stringify({
    tier,
    recovered: recovered.length,
    skipped: skipped.length,
    rejected: rejected.length,
    beforeCounts,
    afterCounts,
    outputPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

import path from "path";
import {
  DEFAULT_CATALOG_PATH,
  inferTcgplayerId,
  loadJson,
  parseArgs,
  readOfficialCards,
  writeJson,
} from "./lib/justtcg-utils.mjs";
import {
  SET_CODE_ALIASES,
  baseId,
  buildCatalogIndexes,
  candidatePremiumHints,
  classifyCatalogCard,
  coreNameMatch,
  detectVariantHints,
  exactNameMatch,
  extractDigits,
  normalizeBandaiNumber,
  normalizeText,
} from "./lib/justtcg-matcher.mjs";

const EXTENDED_EXCLUSION_TERMS = [
  "release event",
  "winner pack",
  "judge pack",
  "event pack",
  "flagship battle",
  "store tournament",
  "championship",
  "finalist",
  "participant",
  "offline regional",
  "serial",
  "purchase bonus",
];

const DEFAULT_SUMMARY_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/review-pass-summary.json";
const DEFAULT_PROMOTED_REPORT_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/promoted-mapping-report.json";
const DEFAULT_REMAINING_GROUPED_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/remaining-needs-review-grouped.json";
const DEFAULT_EXPANDED_REPORT_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/released-mapping-report-expanded.json";
const DEFAULT_RELEASED_REPORT_PATH = "/Users/javierbarro/Desktop/devilfruittcg/.cache/justtcg/released-mapping-report.json";

function normalizeCandidateNumber(value) {
  const raw = String(value || "").toUpperCase().trim();
  if (!raw) return "";
  const direct = raw.match(/^([A-Z]{2,4}\d{2})-(\d{3})$/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  return raw;
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

function extendedExcluded(candidate) {
  const text = normalizeText([candidate.name, candidate.set_name, candidate.set, candidate.id].join(" "));
  return EXTENDED_EXCLUSION_TERMS.some((term) => text.includes(normalizeText(term)));
}

function candidatePoolForCard(card, indexes) {
  const expectedNumber = normalizeBandaiNumber(card);
  const exactPool = indexes.byExactNumber.get(expectedNumber) || [];
  if (exactPool.length) {
    return {
      method: "number_exact",
      query: expectedNumber,
      candidates: exactPool,
    };
  }

  const digitPool = indexes.byDigits.get(extractDigits(expectedNumber)) || [];
  if (digitPool.length) {
    return {
      method: "number_digits",
      query: expectedNumber,
      candidates: digitPool,
    };
  }

  const fallback = indexes.all.filter((candidate) => coreNameMatch(card.name, candidate.name));
  return {
    method: "name_fallback",
    query: card.name,
    candidates: fallback,
  };
}

function sameNumber(card, candidate) {
  const normalized = normalizeCandidateNumber(candidate.number);
  const expected = normalizeBandaiNumber(card);
  return normalized === expected || extractDigits(normalized) === extractDigits(expected);
}

function isPlainBase(candidate) {
  return classifyCatalogCard(candidate).bucket === "base_candidate" && candidatePremiumHints(candidate).length === 0;
}

function isPremiumCandidate(candidate) {
  return classifyCatalogCard(candidate).bucket === "premium_candidate";
}

function candidateSummary(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    set: candidate.set_name || candidate.set || null,
    number: candidate.number || null,
    tcgplayerId: inferTcgplayerId(candidate),
    premiumHints: candidatePremiumHints(candidate),
  };
}

function buildPromotedResult(card, row, pool, candidate, category, reason) {
  return {
    cardId: card.id,
    lane: row.lane,
    isVariant: baseId(card.id) !== card.id,
    confidence: "medium",
    status: "auto_approved",
    searchMethod: pool.method,
    searchQuery: pool.query,
    candidateCount: pool.candidates.length,
    confidenceReasons: Array.from(new Set([
      "review_pass_auto_approved",
      category,
      reason,
      ...row.confidenceReasons.filter((value) => value !== "manual_review_required"),
    ])),
    notes: `Review pass auto-approved: ${reason}`,
    bestCandidate: {
      id: candidate.id,
      name: candidate.name,
      set: candidate.set_name || candidate.set || null,
      tcgplayerId: inferTcgplayerId(candidate),
      score: row.bestCandidate?.score || null,
      price: null,
      lastUpdated: null,
      exactNumber: sameNumber(card, candidate),
      exactName: exactNameMatch(card.name, candidate.name),
      setMatches: setMatch(card, candidate),
      classification: classifyCatalogCard(candidate).bucket,
    },
    candidatePreview: pool.candidates.slice(0, 5).map((entry) => ({
      id: entry.id,
      name: entry.name,
      number: entry.number || null,
      set: entry.set_name || entry.set || null,
    })),
  };
}

function buildNeedsReviewEntry(card, row, category) {
  return {
    cardId: row.cardId,
    name: card.name,
    setCode: row.setCode,
    variantType: detectVariantHints(card),
    lane: row.lane,
    category,
    confidenceReasons: row.confidenceReasons,
    notes: row.notes,
    candidateCount: row.candidateCount,
    bestCandidate: row.bestCandidate,
  };
}

function groupBySet(entries) {
  const groupedBySet = {};
  for (const entry of entries) {
    if (!groupedBySet[entry.setCode]) groupedBySet[entry.setCode] = [];
    groupedBySet[entry.setCode].push(entry);
  }
  return groupedBySet;
}

function reasonCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    for (const reason of entry.confidenceReasons || []) {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => ({ reason, count }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mappingReportPath = path.resolve(String(args["mapping-report"] || DEFAULT_RELEASED_REPORT_PATH));
  const snapshotPath = path.resolve(String(args.snapshot || DEFAULT_CATALOG_PATH));
  const summaryPath = path.resolve(String(args.out || DEFAULT_SUMMARY_PATH));
  const promotedReportPath = path.resolve(String(args["promoted-report"] || DEFAULT_PROMOTED_REPORT_PATH));
  const remainingGroupedPath = path.resolve(String(args["remaining-grouped"] || DEFAULT_REMAINING_GROUPED_PATH));
  const expandedReportPath = path.resolve(String(args["expanded-report"] || DEFAULT_EXPANDED_REPORT_PATH));

  const cards = readOfficialCards();
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const report = loadJson(mappingReportPath, null);
  const snapshot = loadJson(snapshotPath, null);

  if (!report || !Array.isArray(report.needsReview) || !Array.isArray(report.autoApproved) || !Array.isArray(report.results)) {
    throw new Error(`Invalid mapping report at ${mappingReportPath}`);
  }
  if (!snapshot || !Array.isArray(snapshot.cards)) {
    throw new Error(`Invalid snapshot at ${snapshotPath}`);
  }

  const indexes = buildCatalogIndexes(snapshot.cards);
  const promoted = [];
  const remaining = [];
  const categoryOne = [];
  const categoryTwo = [];

  for (const row of report.needsReview) {
    const card = cardById.get(row.cardId);
    if (!card) continue;

    const pool = candidatePoolForCard(card, indexes);
    const eligible = pool.candidates.filter((candidate) => {
      const classification = classifyCatalogCard(candidate);
      return classification.bucket !== "excluded_product" && !extendedExcluded(candidate);
    });
    const exactCore = eligible.filter((candidate) => sameNumber(card, candidate) && coreNameMatch(card.name, candidate.name));
    const setMatchedBase = exactCore.filter((candidate) => isPlainBase(candidate) && setMatch(card, candidate));
    const baseCandidates = exactCore.filter((candidate) => isPlainBase(candidate));
    const setMatchedPremium = exactCore.filter((candidate) => isPremiumCandidate(candidate) && setMatch(card, candidate));
    const premiumCandidates = exactCore.filter((candidate) => isPremiumCandidate(candidate));

    let promotedResult = null;
    let category = "genuine_ambiguity";

    if (!row.confidenceReasons.includes("premium_lane") && row.confidenceReasons.includes("multiple_candidates")) {
      if (setMatchedBase.length === 1) {
        promotedResult = buildPromotedResult(card, row, pool, setMatchedBase[0], "clear_best_candidate", "single_set_matched_base_after_review");
        category = "clear_best_candidate";
      } else if (baseCandidates.length === 1) {
        promotedResult = buildPromotedResult(card, row, pool, baseCandidates[0], "clear_best_candidate", "single_plain_base_after_review");
        category = "clear_best_candidate";
      }
    } else if (row.confidenceReasons.includes("premium_hint_mismatch")) {
      const hints = detectVariantHints(card);
      if (setMatchedPremium.length === 1) {
        promotedResult = buildPromotedResult(card, row, pool, setMatchedPremium[0], "premium_keyword_close_match", "single_set_matched_premium_after_review");
        category = "premium_keyword_close_match";
      } else if (premiumCandidates.length === 1 && hints.includes("premium_any")) {
        promotedResult = buildPromotedResult(card, row, pool, premiumCandidates[0], "premium_keyword_close_match", "single_generic_premium_after_review");
        category = "premium_keyword_close_match";
      }
    }

    if (promotedResult) {
      promoted.push(promotedResult);
      if (category === "clear_best_candidate" && categoryOne.length < 10) {
        categoryOne.push({
          cardId: card.id,
          cardName: card.name,
          setCode: card.setCode,
          recommendedCandidate: candidateSummary(pool.candidates.find((candidate) => candidate.id === promotedResult.bestCandidate.id)),
          reason: promotedResult.confidenceReasons.find((value) => value.startsWith("single_")) || promotedResult.notes,
        });
      }
      if (category === "premium_keyword_close_match" && categoryTwo.length < 10) {
        categoryTwo.push({
          cardId: card.id,
          cardName: card.name,
          setCode: card.setCode,
          variantType: detectVariantHints(card),
          recommendedCandidate: candidateSummary(pool.candidates.find((candidate) => candidate.id === promotedResult.bestCandidate.id)),
          reason: promotedResult.confidenceReasons.find((value) => value.startsWith("single_")) || promotedResult.notes,
        });
      }
    } else {
      const remainingCategory = row.confidenceReasons.includes("multiple_candidates") && !row.confidenceReasons.includes("premium_lane")
        ? "genuine_ambiguity_multiple_candidates"
        : row.confidenceReasons.includes("premium_hint_mismatch")
          ? "genuine_ambiguity_premium_keyword"
          : "genuine_ambiguity_other";
      remaining.push(buildNeedsReviewEntry(card, row, remainingCategory));
    }
  }

  const promotedById = new Map(promoted.map((entry) => [entry.cardId, entry]));
  const expandedResults = report.results.map((entry) => promotedById.get(entry.cardId) || entry);
  const expandedAutoApproved = [
    ...report.autoApproved,
    ...promoted.map((entry) => ({
      cardId: entry.cardId,
      setCode: cardById.get(entry.cardId)?.setCode || null,
      variantType: detectVariantHints(cardById.get(entry.cardId) || {}),
      lane: entry.lane,
      confidence: entry.confidence,
      confidenceReasons: entry.confidenceReasons,
      bestCandidate: {
        id: entry.bestCandidate.id,
        name: entry.bestCandidate.name,
        set: entry.bestCandidate.set,
        tcgplayerId: entry.bestCandidate.tcgplayerId,
        score: entry.bestCandidate.score,
        price: entry.bestCandidate.price,
        lastUpdated: entry.bestCandidate.lastUpdated,
      },
    })),
  ];

  const expandedReport = {
    ...report,
    generatedAt: new Date().toISOString(),
    autoApproved: expandedAutoApproved,
    needsReview: remaining.map((entry) => ({
      cardId: entry.cardId,
      setCode: entry.setCode,
      variantType: entry.variantType,
      lane: entry.lane,
      confidenceReasons: entry.confidenceReasons,
      notes: entry.notes,
      candidateCount: entry.candidateCount,
      bestCandidate: entry.bestCandidate,
    })),
    summary: {
      total: report.summary.total,
      high: report.summary.high,
      medium: report.summary.medium + promoted.length,
      low: remaining.length,
      rejected: report.summary.rejected,
    },
    results: expandedResults,
  };

  const promotedReport = {
    generatedAt: new Date().toISOString(),
    sourceReportPath: mappingReportPath,
    summary: {
      promoted: promoted.length,
      clearBestCandidate: promoted.filter((entry) => entry.confidenceReasons.includes("clear_best_candidate")).length,
      premiumKeywordCloseMatch: promoted.filter((entry) => entry.confidenceReasons.includes("premium_keyword_close_match")).length,
    },
    results: promoted,
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceReportPath: mappingReportPath,
    needsReviewBefore: report.needsReview.length,
    autoApprovedBefore: report.autoApproved.length,
    rejected: report.rejected.length,
    groupedReasonCountsBefore: reasonCounts(report.needsReview),
    promoted: promoted.length,
    promotedByCategory: {
      clear_best_candidate: promoted.filter((entry) => entry.confidenceReasons.includes("clear_best_candidate")).length,
      premium_keyword_close_match: promoted.filter((entry) => entry.confidenceReasons.includes("premium_keyword_close_match")).length,
    },
    approvedAfter: report.autoApproved.length + promoted.length,
    needsReviewAfter: remaining.length,
    categorySamples: {
      clear_best_candidate: categoryOne,
      premium_keyword_close_match: categoryTwo,
    },
    remainingReasonCounts: reasonCounts(remaining),
  };

  writeJson(summaryPath, summary);
  writeJson(promotedReportPath, promotedReport);
  writeJson(remainingGroupedPath, {
    generatedAt: new Date().toISOString(),
    count: remaining.length,
    groupedBySet: groupBySet(remaining),
  });
  writeJson(expandedReportPath, expandedReport);

  console.log(JSON.stringify({
    summaryPath,
    promotedReportPath,
    remainingGroupedPath,
    expandedReportPath,
    promoted: promoted.length,
    approvedAfter: summary.approvedAfter,
    needsReviewAfter: summary.needsReviewAfter,
    rejected: summary.rejected,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import {
  SET_CODE_ALIASES,
  buildCatalogIndexes,
  candidatePremiumHints,
  classifyCatalogCard,
  coreNameMatch,
  detectVariantHints,
  exactNameMatch,
  extractDigits,
  normalizeBandaiNumber,
  normalizeText,
  priceSnapshot,
} from "./justtcg-matcher.mjs";
import { classifySuspiciousApprovedMapping } from "./justtcg-suspicious-mappings.mjs";

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

function sameNumber(card, candidate) {
  const normalized = normalizeCandidateNumber(candidate.number);
  const expected = normalizeBandaiNumber(card);
  return normalized === expected || extractDigits(normalized) === extractDigits(expected);
}

function hasMatchingPremiumHint(cardHints, candidateHints) {
  if (!cardHints.length) return false;
  if (cardHints.includes("premium_any")) return candidateHints.length > 0;
  return cardHints.some((hint) => candidateHints.includes(hint));
}

const HINT_WEIGHTS = new Map([
  ["red_super_alt", 100],
  ["super_alt", 80],
  ["manga", 80],
  ["sp", 70],
  ["jolly_roger_foil", 70],
  ["treasure_rare", 70],
  ["full_art", 60],
  ["pirate_foil", 60],
  ["anniversary", 60],
  ["gold", 55],
  ["silver", 55],
  ["participation", 50],
  ["finalist", 50],
  ["champion", 50],
  ["binder", 45],
  ["gift_collection", 45],
  ["event_pack", 45],
  ["winner_pack", 45],
  ["winner_card_set", 45],
  ["tournament_pack", 45],
  ["parallel", 20],
  ["alt", 10],
  ["premium_any", 1],
]);

function premiumHintScore(cardHints, candidateHints) {
  const shared = candidateHints.filter((hint) => cardHints.includes(hint));
  const extra = candidateHints.filter((hint) => !cardHints.includes(hint));
  const weight = shared.reduce((total, hint) => total + (HINT_WEIGHTS.get(hint) || 0), 0);
  return {
    weight,
    sharedCount: shared.length,
    extraCount: extra.length,
    candidateHintCount: candidateHints.length,
  };
}

function chooseBestPremiumCandidate(cardHints, candidates) {
  if (candidates.length <= 1) return candidates[0] || null;

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: premiumHintScore(cardHints, candidatePremiumHints(candidate)),
    }))
    .sort((left, right) =>
      right.score.weight - left.score.weight ||
      right.score.sharedCount - left.score.sharedCount ||
      left.score.extraCount - right.score.extraCount ||
      right.score.candidateHintCount - left.score.candidateHintCount ||
      String(left.candidate.id || "").localeCompare(String(right.candidate.id || "")),
    );

  const [best, next] = ranked;
  if (!best) return null;
  if (
    next &&
    best.score.weight === next.score.weight &&
    best.score.sharedCount === next.score.sharedCount &&
    best.score.candidateHintCount === next.score.candidateHintCount
  ) {
    return null;
  }

  return best.candidate;
}

function candidatePoolForCard(card, indexes) {
  const expectedNumber = normalizeBandaiNumber(card);
  const exactPool = indexes.byExactNumber.get(expectedNumber) || [];
  if (exactPool.length) {
    return exactPool;
  }
  const digitPool = indexes.byDigits.get(extractDigits(expectedNumber)) || [];
  if (digitPool.length) {
    return digitPool;
  }
  return indexes.all.filter((candidate) => coreNameMatch(card.name, candidate.name));
}

function buildPromotedResult(card, row, candidate) {
  const snapshot = priceSnapshot(candidate);
  return {
    ...row,
    cardId: card.id,
    confidence: "medium",
    status: "auto_approved",
    reviewedAt: new Date().toISOString(),
    confidenceReasons: Array.from(
      new Set([
        "review_pass_auto_approved",
        "premium_exact_set_match",
        "single_set_matched_premium_after_review",
        ...(Array.isArray(row.confidenceReasons) ? row.confidenceReasons.filter((value) => value !== "manual_review_required") : []),
      ]),
    ),
    notes: "Review pass auto-approved: single_set_matched_premium_after_review",
    bestCandidate: {
      id: candidate.id,
      name: candidate.name,
      set: candidate.set_name || candidate.set || null,
      tcgplayerId: candidate.tcgplayerId || candidate.tcgplayer_id || candidate.tcgplayer?.id || null,
      score: null,
      price: snapshot.price,
      lastUpdated: snapshot.lastUpdated,
      exactNumber: sameNumber(card, candidate),
      exactName: exactNameMatch(card.name, candidate.name),
      setMatches: setMatch(card, candidate),
      classification: classifyCatalogCard(candidate).bucket,
    },
  };
}

export function reviewSuspiciousPremiumMappings({ report, snapshot, cards }) {
  const cardById = new Map((cards || []).map((card) => [card.id, card]));
  const indexes = buildCatalogIndexes(Array.isArray(snapshot?.cards) ? snapshot.cards : []);
  const promoted = [];
  const remaining = [];

  for (const row of Array.isArray(report?.results) ? report.results : []) {
    const card = cardById.get(row.cardId);
    const suspicious = classifySuspiciousApprovedMapping(row);
    const cardHints = card ? detectVariantHints(card) : [];
    const premiumNeedsReview =
      normalizeText(row?.status) === "needs review" || normalizeText(row?.status) === "needs_review";
    const shouldReview = (suspicious.suspicious && suspicious.premium) || (premiumNeedsReview && cardHints.length > 0);

    if (!shouldReview) continue;
    if (!card) {
      remaining.push(row);
      continue;
    }

    const pool = candidatePoolForCard(card, indexes);
    const eligible = pool.filter((candidate) => classifyCatalogCard(candidate).bucket === "premium_candidate");
    const exactCore = eligible.filter((candidate) => sameNumber(card, candidate) && coreNameMatch(card.name, candidate.name));
    const setMatchedPremium = exactCore.filter((candidate) =>
      setMatch(card, candidate) && hasMatchingPremiumHint(cardHints, candidatePremiumHints(candidate)),
    );

    const promotedCandidate = chooseBestPremiumCandidate(cardHints, setMatchedPremium);
    if (promotedCandidate) {
      promoted.push(buildPromotedResult(card, row, promotedCandidate));
    } else {
      remaining.push(row);
    }
  }

  const promotedById = new Map(promoted.map((entry) => [entry.cardId, entry]));
  const expandedResults = Array.isArray(report?.results)
    ? report.results.map((entry) => promotedById.get(entry.cardId) || entry)
    : [];

  return {
    generatedAt: new Date().toISOString(),
    promoted,
    remaining,
    results: expandedResults,
  };
}

export const RELEASE_CUTOFF = "2026-03-16";

export const EXCLUSION_TERMS = [
  "jumbo",
  "demo",
  "pre release",
  "pre-release",
  "revision pack",
  "starter deck",
  "deck",
  "binder",
  "gift",
  "anniversary",
  "promo pack",
  "promo",
  "sound loader",
  "tournament",
  "box topper",
  "don card",
  "promotion",
  "memorial",
  "premium",
  "wanted poster",
];

export const SET_CODE_ALIASES = {
  OP01: ["romance dawn"],
  OP02: ["paramount war"],
  OP03: ["pillars of strength"],
  OP04: ["kingdoms of intrigue"],
  OP05: ["awakening of the new era"],
  OP06: ["wings of the captain"],
  OP07: ["500 years in the future"],
  OP08: ["two legends"],
  OP09: ["emperors in the new world"],
  OP10: ["royal blood"],
  OP11: ["a fist of divine speed"],
  OP12: ["legacy of the master"],
  OP13: ["three brothers", "three brothers bond"],
  OP14: ["the age of the gods"],
  EB01: ["memorial collection"],
  EB02: ["anime 25th collection"],
  EB03: ["extra booster 03"],
  EB04: ["extra booster 04"],
  PRB01: ["premium booster"],
  PRB02: ["premium booster 02"],
  ST01: ["straw hat crew"],
  ST02: ["worst generation"],
  ST03: ["the seven warlords of the sea"],
  ST04: ["animal kingdom pirates"],
  ST05: ["one piece film edition"],
  ST06: ["absolute justice"],
  ST07: ["big mom pirates"],
  ST08: ["monkey d luffy"],
  ST09: ["yamato"],
  ST10: ["the three captains"],
  ST11: ["uta"],
  ST12: ["zoro and sanji"],
  ST13: ["the three brothers ultra deck"],
  ST14: ["3d2y"],
  ST15: ["red edward newgate"],
  ST16: ["green uta"],
  ST17: ["blue donquixote doflamingo"],
  ST18: ["purple monkey d luffy"],
  ST19: ["black smoker"],
  ST20: ["yellow charlotte katakuri"],
  ST21: ["gear 5"],
  ST22: ["ace and newgate"],
};

const BOOSTER_SET_PREFIXES = ["OP", "EB", "PRB"];
const STARTER_SET_PREFIXES = ["ST"];

function normalizeSetCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHintText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanedCardName(value) {
  return normalizeText(value)
    .replace(/\b(alternate art|alt art|parallel|manga|anniversary|reprint|sp|special)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function baseId(cardId) {
  return String(cardId || "").replace(/_[A-Za-z0-9]+$/u, "");
}

export function isVariantCard(card) {
  return baseId(card.id) !== card.id;
}

export function normalizeBandaiNumber(card) {
  return `${String(card.setCode || "").toUpperCase()}-${String(card.number || "").padStart(3, "0")}`;
}

export function extractDigits(value) {
  const match = String(value || "").match(/(\d{3})/);
  return match ? match[1] : "";
}

function normalizeCandidateNumber(value) {
  const raw = String(value || "").toUpperCase().trim();
  if (!raw) return "";
  const direct = raw.match(/^([A-Z]{2,4}\d{2})-(\d{3})$/);
  if (direct) return `${direct[1]}-${direct[2]}`;
  return raw;
}

function splitCoreTokens(value) {
  return cleanedCardName(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["one", "piece", "card", "game"].includes(token));
}

export function exactNameMatch(cardName, candidateName) {
  return cleanedCardName(cardName) === cleanedCardName(candidateName);
}

export function coreNameMatch(cardName, candidateName) {
  const cardTokens = splitCoreTokens(cardName);
  const candidate = cleanedCardName(candidateName);
  if (!cardTokens.length) return false;
  const hits = cardTokens.filter((token) => candidate.includes(token)).length;
  return hits >= Math.min(2, cardTokens.length);
}

export function detectVariantLane(card) {
  if (!isVariantCard(card)) return "base";
  return "premium";
}

export function detectVariantHints(card) {
  const explicitType = String(card.variantType || "").toLowerCase();
  const explicitLabel = normalizeText(String(card.variantLabel || ""));
  const explicitSlug = normalizeText(String(card.variantSlug || "").replace(/_/g, " "));
  const raw = normalizeText([
    card.id,
    card.rarity,
    explicitType,
    explicitLabel,
    explicitSlug,
    card.notes?.join?.(" "),
    card.name,
  ].join(" "));
  const hints = [];
  if (explicitLabel.includes("red super alternate art") || explicitSlug.includes("red super alternate art")) {
    hints.push("red_super_alt", "super_alt", "alt");
  }
  if (explicitLabel.includes("super alternate art") || explicitSlug.includes("super alternate art")) {
    hints.push("super_alt", "alt");
  }
  if (explicitLabel.includes("jolly roger foil") || explicitSlug.includes("jolly roger foil")) hints.push("jolly_roger_foil");
  if (explicitLabel.includes("full art") || explicitSlug.includes("full art")) hints.push("full_art");
  if (explicitLabel.includes("treasure rare") || explicitSlug.includes("treasure rare")) hints.push("treasure_rare");
  if (explicitLabel.includes("pirate foil") || explicitSlug.includes("pirate foil")) hints.push("pirate_foil");
  if (explicitLabel.includes("participation") || explicitSlug.includes("participation")) hints.push("participation");
  if (explicitLabel.includes("finalist") || explicitSlug.includes("finalist")) hints.push("finalist");
  if (explicitLabel.includes("champion") || explicitSlug.includes("champion")) hints.push("champion");
  if (explicitLabel.includes("gold") || explicitSlug.includes("gold")) hints.push("gold");
  if (explicitLabel.includes("silver") || explicitSlug.includes("silver")) hints.push("silver");
  if (explicitLabel.includes("binder") || explicitSlug.includes("binder")) hints.push("binder");
  if (explicitLabel.includes("gift collection") || explicitSlug.includes("gift collection")) hints.push("gift_collection");
  if (explicitLabel.includes("event pack") || explicitSlug.includes("event pack")) hints.push("event_pack");
  if (explicitLabel.includes("winner pack") || explicitSlug.includes("winner pack")) hints.push("winner_pack");
  if (explicitLabel.includes("winner card set") || explicitSlug.includes("winner card set")) hints.push("winner_card_set");
  if (explicitLabel.includes("tournament pack") || explicitSlug.includes("tournament pack")) hints.push("tournament_pack");
  if (explicitType === "sp" || explicitLabel === "sp") hints.push("sp");
  if (explicitType === "manga" || explicitLabel.includes("manga")) hints.push("manga");
  if (explicitType === "alt_art" || explicitLabel.includes("alternate art")) hints.push("alt");
  if (explicitType === "parallel" || explicitLabel.includes("parallel")) hints.push("parallel");
  if (explicitType === "anniversary" || explicitLabel.includes("anniversary")) hints.push("anniversary");
  if (explicitType === "reprint") hints.push("reprint");
  if (String(card.rarity || "").toUpperCase() === "SP CARD" || raw.includes(" sp ")) hints.push("sp");
  if (raw.includes("manga")) hints.push("manga");
  if (raw.includes("red super alternate art")) hints.push("red_super_alt", "super_alt", "alt");
  else if (raw.includes("super alternate art")) hints.push("super_alt", "alt");
  if (raw.includes("jolly roger foil")) hints.push("jolly_roger_foil");
  if (raw.includes("full art")) hints.push("full_art");
  if (raw.includes("treasure rare")) hints.push("treasure_rare");
  if (raw.includes("alternate art") || raw.includes("alt art")) hints.push("alt");
  if (raw.includes("parallel")) hints.push("parallel");
  if (raw.includes("reprint") || /_r\d+$/i.test(card.id)) hints.push("reprint");
  if (/_p\d+$/i.test(card.id) && !hints.length) hints.push("premium_any");
  return Array.from(new Set(hints));
}

export function priceSnapshot(candidate) {
  const variants = Array.isArray(candidate.variants) ? candidate.variants : [];
  const english = variants.filter((variant) => String(variant.language || "").toLowerCase() === "english");
  const pool = english.length ? english : variants;
  const nearMint = pool.filter((variant) => String(variant.condition || "").toLowerCase() === "near mint");
  const foilNearMint = nearMint.filter((variant) => String(variant.printing || "").toLowerCase() === "foil");
  const pick = foilNearMint[0] || nearMint[0] || pool[0] || null;
  return pick
    ? {
        price: typeof pick.price === "number" ? pick.price : null,
        lastUpdated: typeof pick.lastUpdated === "number"
          ? new Date(pick.lastUpdated * 1000).toISOString()
          : null,
      }
    : { price: null, lastUpdated: null };
}

export function candidatePremiumHints(candidate) {
  const text = normalizeHintText([
    candidate.name,
    candidate.set_name,
    candidate.set,
    candidate.id,
  ].join(" "));
  const hints = [];
  if (text.includes("red super alternate art")) hints.push("red_super_alt", "super_alt", "alt");
  else if (text.includes("super alternate art")) hints.push("super_alt", "alt");
  if (text.includes("jolly roger foil")) hints.push("jolly_roger_foil");
  if (text.includes("full art")) hints.push("full_art");
  if (text.includes("treasure rare")) hints.push("treasure_rare");
  if (text.includes("pirate foil")) hints.push("pirate_foil");
  if (text.includes("participation")) hints.push("participation");
  if (text.includes("finalist")) hints.push("finalist");
  if (text.includes("champion")) hints.push("champion");
  if (text.includes("gold")) hints.push("gold");
  if (text.includes("silver")) hints.push("silver");
  if (text.includes("binder")) hints.push("binder");
  if (text.includes("gift collection")) hints.push("gift_collection");
  if (text.includes("event pack")) hints.push("event_pack");
  if (text.includes("winner pack")) hints.push("winner_pack");
  if (text.includes("winner card set")) hints.push("winner_card_set");
  if (text.includes("tournament pack")) hints.push("tournament_pack");
  if (text.includes("sp") || text.includes("special")) hints.push("sp");
  if (text.includes("manga")) hints.push("manga");
  if (text.includes("alternate art") || text.includes("alt art")) hints.push("alt");
  if (text.includes("parallel")) hints.push("parallel");
  if (text.includes("reprint")) hints.push("reprint");
  return Array.from(new Set(hints));
}

export function classifyCatalogCard(candidate) {
  const composite = normalizeText([candidate.name, candidate.set_name, candidate.set, candidate.id].join(" "));
  const candidateSet = normalizeText(candidate.set_name || candidate.set || "");
  const knownReleaseSet = Object.values(SET_CODE_ALIASES)
    .flat()
    .some((alias) => candidateSet.includes(alias) || alias.includes(candidateSet));
  const excluded = EXCLUSION_TERMS.find((term) => {
    const normalizedTerm = normalizeText(term);
    if (!composite.includes(normalizedTerm)) return false;
    if (knownReleaseSet && ["deck", "starter deck", "premium"].includes(normalizedTerm)) {
      return false;
    }
    return true;
  });
  if (excluded) {
    return { bucket: "excluded_product", reason: `excluded_term:${excluded}` };
  }
  const premiumHints = candidatePremiumHints(candidate);
  if (premiumHints.length) {
    return { bucket: "premium_candidate", reason: `premium_hint:${premiumHints.join(",")}` };
  }
  return { bucket: "base_candidate", reason: "base_print_candidate" };
}

export function releasedCards(cards, releaseCutoff = RELEASE_CUTOFF) {
  return cards.filter((card) => {
    if (!card.releaseDate) return true;
    return String(card.releaseDate) <= String(releaseCutoff);
  });
}

export function buildMixedSetBatch(cards, setCode, limit) {
  const inSet = releasedCards(cards).filter((card) => card.setCode === setCode);
  const leaders = inSet.filter((card) => card.type === "Leader" && !isVariantCard(card));
  const rares = inSet.filter((card) => !isVariantCard(card) && ["R", "SR", "SEC"].includes(String(card.rarity || "")));
  const commons = inSet.filter((card) => !isVariantCard(card) && ["C", "UC"].includes(String(card.rarity || "")));
  const premiums = inSet.filter((card) => isVariantCard(card));

  const premiumTargets = setCode === "OP01"
    ? premiums.filter((card) => ["OP01-002_p1", "OP01-016_p1", "OP01-025_p1"].includes(card.id))
    : premiums.slice(0, 3);

  const pools = [
    leaders.slice(0, 8),
    rares.slice(0, 18),
    commons.slice(0, 21),
    premiumTargets,
  ];

  const cursors = new Array(pools.length).fill(0);
  const selected = [];

  const pushUnique = (card) => {
    if (selected.length >= limit) return;
    if (!selected.find((entry) => entry.id === card.id)) selected.push(card);
  };

  while (selected.length < limit) {
    let appended = false;
    for (let index = 0; index < pools.length; index += 1) {
      const pool = pools[index];
      if (cursors[index] >= pool.length) continue;
      pushUnique(pool[cursors[index]]);
      cursors[index] += 1;
      appended = true;
      if (selected.length >= limit) break;
    }
    if (!appended) break;
  }

  return selected.slice(0, limit);
}

function setAliasesForCard(card) {
  const aliases = SET_CODE_ALIASES[normalizeSetCode(card.setCode)] || [];
  const normalizedSet = normalizeText(String(card.set || "").replace(/\s*\[[^\]]+\]\s*$/u, ""));
  return Array.from(new Set([normalizedSet, ...aliases].filter(Boolean)));
}

function candidateMatchedSetCodes(candidate) {
  const candidateSet = normalizeText(candidate.set_name || candidate.set || "");
  if (!candidateSet) return [];
  const matches = [];
  for (const [setCode, aliases] of Object.entries(SET_CODE_ALIASES)) {
    if (aliases.some((alias) => candidateSet.includes(alias) || alias.includes(candidateSet))) {
      matches.push(setCode);
    }
  }
  return matches;
}

function isBoosterSetCode(setCode) {
  return BOOSTER_SET_PREFIXES.some((prefix) => normalizeSetCode(setCode).startsWith(prefix));
}

function isStarterSetCode(setCode) {
  return STARTER_SET_PREFIXES.some((prefix) => normalizeSetCode(setCode).startsWith(prefix));
}

function candidateMatchesBoosterSet(candidate) {
  return candidateMatchedSetCodes(candidate).some((setCode) => isBoosterSetCode(setCode));
}

function candidateMatchesStarterSet(candidate) {
  return candidateMatchedSetCodes(candidate).some((setCode) => isStarterSetCode(setCode));
}

function isPlainBasePrint(entry) {
  return entry.classification.bucket === "base_candidate" && candidatePremiumHints(entry.candidate).length === 0;
}

function hasMatchingPremiumHint(cardHints, candidateHints) {
  if (!cardHints.length) return false;
  if (cardHints.includes("premium_any")) return candidateHints.length > 0;
  return cardHints.some((hint) => candidateHints.includes(hint));
}

function setMatch(card, candidate) {
  const candidateSet = normalizeText(candidate.set_name || candidate.set || "");
  if (!candidateSet) return false;
  return setAliasesForCard(card).some((alias) => candidateSet.includes(alias) || alias.includes(candidateSet));
}

export function buildCatalogIndexes(catalogCards) {
  const byExactNumber = new Map();
  const byDigits = new Map();

  for (const candidate of catalogCards) {
    const normalizedNumber = normalizeCandidateNumber(candidate.number);
    const digits = extractDigits(candidate.number);

    if (normalizedNumber) {
      if (!byExactNumber.has(normalizedNumber)) byExactNumber.set(normalizedNumber, []);
      byExactNumber.get(normalizedNumber).push(candidate);
    }

    if (digits) {
      if (!byDigits.has(digits)) byDigits.set(digits, []);
      byDigits.get(digits).push(candidate);
    }
  }

  return { all: catalogCards, byExactNumber, byDigits };
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

function evaluateCandidate(card, candidate, lane, candidateCount) {
  const classification = classifyCatalogCard(candidate);
  const snapshot = priceSnapshot(candidate);
  const exactNumber = normalizeCandidateNumber(candidate.number) === normalizeBandaiNumber(card);
  const digitNumber = extractDigits(candidate.number) === extractDigits(normalizeBandaiNumber(card));
  const exactName = exactNameMatch(card.name, candidate.name);
  const coreName = coreNameMatch(card.name, candidate.name);
  const setMatches = setMatch(card, candidate);
  const cardHints = detectVariantHints(card);
  const candidateHints = candidatePremiumHints(candidate);
  const matchedSetCodes = candidateMatchedSetCodes(candidate);
  const boosterCandidate = matchedSetCodes.some((setCode) => isBoosterSetCode(setCode));
  const starterCandidate = matchedSetCodes.some((setCode) => isStarterSetCode(setCode));
  const reasons = [];
  let score = 0;

  if (classification.bucket === "excluded_product") {
    return {
      candidate,
      classification,
      score: -1000,
      rejected: true,
      exactNumber: false,
      digitNumber: false,
      exactName: false,
      coreName: false,
      setMatches: false,
      snapshot,
      reasons: [classification.reason],
    };
  }

  if (exactNumber) score += 80;
  else if (digitNumber) score += 35;
  else reasons.push("number_mismatch");

  if (exactName) score += 45;
  else if (coreName) score += 20;
  else reasons.push("name_mismatch");

  if (setMatches) score += 25;
  else reasons.push("set_mismatch");

  if (snapshot.price != null && snapshot.price > 0) score += 10;
  else reasons.push("missing_or_zero_price");

  if (candidateCount === 1) score += 10;

  if (lane === "base") {
    if (classification.bucket === "base_candidate") score += 25;
    else {
      score -= 35;
      reasons.push("premium_candidate_for_base");
    }
  } else {
    if (classification.bucket === "premium_candidate") score += 25;
    else reasons.push("base_candidate_for_premium");

    if (cardHints.length && candidateHints.length) {
      const overlap = cardHints.filter((hint) => candidateHints.includes(hint));
      if (overlap.length) {
        score += 15;
      } else {
        score -= 10;
        reasons.push("premium_hint_mismatch");
      }
    } else {
      reasons.push("variant_identity_needs_review");
    }
  }

  return {
    candidate,
    classification,
    score,
    rejected: false,
    exactNumber,
    digitNumber,
    exactName,
    coreName,
    setMatches,
    matchedSetCodes,
    boosterCandidate,
    starterCandidate,
    candidateHints,
    cardHints,
    snapshot,
    reasons,
  };
}

export function matchCardAgainstSnapshot(card, indexes) {
  const lane = detectVariantLane(card);
  const pool = candidatePoolForCard(card, indexes);
  const evaluated = pool.candidates.map((candidate) => evaluateCandidate(card, candidate, lane, pool.candidates.length));
  const eligible = evaluated.filter((entry) => !entry.rejected);
  const sorted = [...eligible].sort((left, right) => right.score - left.score);
  let best = sorted[0] || null;
  let second = sorted[1] || null;
  let clearWinner = !second || best.score - second.score >= 20;

  if (!best) {
    return {
      lane,
      searchMethod: pool.method,
      searchQuery: pool.query,
      candidateCount: pool.candidates.length,
      candidates: pool.candidates,
      best: null,
      confidence: null,
      status: "rejected",
      confidenceReasons: pool.candidates.length ? ["no_eligible_candidates"] : ["no_candidates_found"],
      notes: pool.candidates.length ? "All candidates were excluded by product classification." : "No candidates found in snapshot.",
    };
  }

  let confidence = "low";
  let status = "needs_review";
  const confidenceReasons = [];
  let heuristicReason = null;

  const boosterBaseCandidates = lane === "base"
    ? eligible.filter((entry) =>
      isPlainBasePrint(entry) &&
      entry.coreName &&
      (entry.exactNumber || entry.digitNumber) &&
      entry.boosterCandidate
    )
    : [];

  const plainBaseCandidates = lane === "base"
    ? eligible.filter((entry) =>
      isPlainBasePrint(entry) &&
      entry.coreName &&
      (entry.exactNumber || entry.digitNumber)
    )
    : [];

  const exactPremiumCandidates = lane === "premium"
    ? eligible.filter((entry) =>
      entry.classification.bucket === "premium_candidate" &&
      entry.coreName &&
      (entry.exactNumber || entry.digitNumber) &&
      hasMatchingPremiumHint(entry.cardHints, entry.candidateHints)
    )
    : [];

  const conflictingStarterOrRevision = eligible.some((entry) =>
    !entry.boosterCandidate &&
    (entry.starterCandidate || normalizeText(entry.candidate.set_name || entry.candidate.set || "").includes("revision pack"))
  );

  if (lane === "base" && boosterBaseCandidates.length === 1 && conflictingStarterOrRevision) {
    [best] = boosterBaseCandidates;
    second = null;
    clearWinner = true;
    confidence = "medium";
    status = "auto_approved";
    heuristicReason = "booster_preferred_collision";
  } else if (lane === "base" && plainBaseCandidates.length === 1) {
    [best] = plainBaseCandidates;
    second = null;
    clearWinner = true;
    confidence = "medium";
    status = "auto_approved";
    heuristicReason = "single_plain_base_candidate";
  } else if (lane === "premium" && exactPremiumCandidates.length === 1) {
    [best] = exactPremiumCandidates;
    second = null;
    clearWinner = true;
    confidence = "medium";
    status = "auto_approved";
    heuristicReason = "exact_premium_keyword_match";
  }

  if (!heuristicReason && (
    lane === "base" &&
    best.exactNumber &&
    best.exactName &&
    best.setMatches &&
    best.classification.bucket === "base_candidate" &&
    clearWinner &&
    eligible.length === 1 &&
    best.snapshot.price != null &&
    best.snapshot.price > 0
  )) {
    confidence = "high";
    status = "auto_approved";
    confidenceReasons.push("single_clean_base_match");
  } else if (!heuristicReason && (
    best.exactNumber &&
    best.coreName &&
    best.setMatches &&
    clearWinner &&
    best.snapshot.price != null &&
    best.snapshot.price > 0 &&
    (
      (lane === "base" && best.classification.bucket === "base_candidate") ||
      (lane === "premium" && best.classification.bucket === "premium_candidate")
    )
  )) {
    confidence = "medium";
    status = "auto_approved";
    confidenceReasons.push("best_candidate_clear");
  } else if (!heuristicReason && best.score >= 70 && best.coreName) {
    confidence = "low";
    status = "needs_review";
    confidenceReasons.push("manual_review_required");
  } else if (!heuristicReason) {
    return {
      lane,
      searchMethod: pool.method,
      searchQuery: pool.query,
      candidateCount: pool.candidates.length,
      candidates: pool.candidates,
      best,
      confidence: null,
      status: "rejected",
      confidenceReasons: ["no_confident_match"],
      notes: best.reasons.join("; ") || "No confident match after offline scoring.",
    };
  }

  if (heuristicReason) confidenceReasons.push(heuristicReason);
  if (!clearWinner) confidenceReasons.push("multiple_candidates");
  if (lane === "premium") confidenceReasons.push("premium_lane");
  if (!best.exactName && best.coreName) confidenceReasons.push("core_name_match");
  if (!best.exactNumber && best.digitNumber) confidenceReasons.push("digit_number_match");
  if (!best.setMatches) confidenceReasons.push("set_review_needed");
  for (const reason of best.reasons) confidenceReasons.push(reason);

  return {
    lane,
    searchMethod: pool.method,
    searchQuery: pool.query,
    candidateCount: pool.candidates.length,
    candidates: pool.candidates,
    best,
    confidence,
    status,
    confidenceReasons: Array.from(new Set(confidenceReasons)),
    notes: best.reasons.join("; ") || null,
  };
}

export function summarizeMatches(results) {
  const summary = {
    total: results.length,
    high: 0,
    medium: 0,
    low: 0,
    rejected: 0,
  };

  for (const result of results) {
    if (result.status === "auto_approved" && result.confidence === "high") summary.high += 1;
    else if (result.status === "auto_approved" && result.confidence === "medium") summary.medium += 1;
    else if (result.status === "needs_review") summary.low += 1;
    else if (result.status === "rejected") summary.rejected += 1;
  }

  return summary;
}

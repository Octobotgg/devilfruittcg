import { detectVariantHints, normalizeText } from "./justtcg-matcher.mjs";

const DEFAULT_HIGH_PRICE_THRESHOLD = 200;
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.95;

function numericConfidence(value) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedReasons(row) {
  return (Array.isArray(row?.confidenceReasons) ? row.confidenceReasons : []).map((value) =>
    normalizeText(String(value || "")),
  );
}

function normalizedNotes(row) {
  return normalizeText(String(row?.notes || ""));
}

function bestCandidatePrice(row) {
  const value = row?.bestCandidate?.price;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function treatmentLabel(row) {
  const label = String(row?.cardPrintContext?.variantLabel || "").trim();
  if (label) return label;
  return null;
}

function variantHints(row) {
  return detectVariantHints({
    id: row?.cardId || "",
    variantLabel: row?.cardPrintContext?.variantLabel || "",
    variantSlug: row?.cardPrintContext?.variantSlug || "",
    rarity: row?.rarity || "",
    notes: Array.isArray(row?.notes) ? row.notes : row?.notes ? [row.notes] : [],
    name: row?.bestCandidate?.name || "",
  });
}

function isPremiumRow(row) {
  const hints = variantHints(row);
  if (hints.length && !hints.includes("reprint")) return true;
  const label = normalizeText(String(row?.cardPrintContext?.variantLabel || ""));
  return Boolean(label && label !== "base" && label !== "reprint");
}

export function classifySuspiciousApprovedMapping(
  row,
  options = {},
) {
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
  const highPriceThreshold = options.highPriceThreshold ?? DEFAULT_HIGH_PRICE_THRESHOLD;
  const confidence = numericConfidence(row?.confidence);
  const reasons = normalizedReasons(row);
  const notes = normalizedNotes(row);
  const price = bestCandidatePrice(row);
  const premium = isPremiumRow(row);
  const flags = [];

  if (!(row?.status === "auto_approved" || row?.status === "manually_approved")) {
    return {
      suspicious: false,
      flags,
      premium,
      treatment: treatmentLabel(row),
      confidence,
      price,
      highPrice: false,
    };
  }

  if (confidence != null && confidence < lowConfidenceThreshold) flags.push("low_confidence");
  if (reasons.includes("set mismatch") || notes.includes("set mismatch")) flags.push("set_mismatch");
  if (reasons.includes("premium hint mismatch") || notes.includes("premium hint mismatch")) {
    flags.push("premium_hint_mismatch");
  }
  if (reasons.includes("final aggressive review pass") || notes.includes("final aggressive review pass")) {
    flags.push("aggressive_review");
  }
  if (reasons.includes("multiple candidates")) flags.push("multiple_candidates");
  if (price != null && price >= highPriceThreshold) flags.push("high_price");

  return {
    suspicious: flags.length > 0,
    flags,
    premium,
    treatment: treatmentLabel(row),
    confidence,
    price,
    highPrice: flags.includes("high_price"),
  };
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .map(([value, count]) => ({ value, count }));
}

export function buildSuspiciousMappingReport(report, options = {}) {
  const rows = [];

  for (const row of Array.isArray(report?.results) ? report.results : []) {
    const classification = classifySuspiciousApprovedMapping(row, options);
    if (!classification.suspicious) continue;
    if (options.premiumOnly !== false && !classification.premium) continue;

    rows.push({
      cardId: row.cardId,
      status: row.status,
      confidence: classification.confidence,
      treatment: classification.treatment,
      setName: row?.cardPrintContext?.setName || null,
      candidate: row?.bestCandidate?.name || null,
      candidateSet: row?.bestCandidate?.set || null,
      candidatePrice: classification.price,
      flags: classification.flags,
      premium: classification.premium,
      highPrice: classification.highPrice,
    });
  }

  rows.sort((left, right) =>
    (right.candidatePrice || 0) - (left.candidatePrice || 0) ||
    (left.confidence ?? 0) - (right.confidence ?? 0) ||
    left.cardId.localeCompare(right.cardId),
  );

  return {
    generatedAt: report?.generatedAt || null,
    summary: {
      totalSuspicious: rows.length,
      premiumSuspicious: rows.filter((row) => row.premium).length,
      highPriceSuspicious: rows.filter((row) => row.highPrice).length,
      byFlag: countBy(rows.flatMap((row) => row.flags)),
      byTreatment: countBy(rows.map((row) => row.treatment)),
    },
    rows,
  };
}

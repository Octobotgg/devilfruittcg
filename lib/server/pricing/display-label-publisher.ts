export type PricingVerificationStatus =
  | "verified"
  | "drift_warning"
  | "mismatch"
  | "stale_provider"
  | "missing_tcgplayer_id"
  | "unpriced_no_variant"
  | "mapping_conflict";

export type PricingLabelStatus = "verified" | "normalized" | "fallback" | "blocked" | "unknown";

export type PricingPublishCandidate = {
  cardPrintId: string;
  sourceId: string;
  externalProductId: string | null;
  externalVariantId: string | null;
  verificationStatus: PricingVerificationStatus;
  conflictTypes?: string[];
  priceMarket: number | null;
  priceNm: number | null;
  priceLp: number | null;
  updatedAt: string | null;
  displaySetName?: string | null;
  displaySetCode?: string | null;
  displayRarity?: string | null;
  displayTitle?: string | null;
  displayTreatmentLabel?: string | null;
  displayImageUrl?: string | null;
  labelStatus?: PricingLabelStatus | null;
  officialName?: string | null;
  officialSetName?: string | null;
  officialSetCode?: string | null;
  officialRarity?: string | null;
};

export type PublishedDisplayUpsert = {
  cardPrintId: string;
  externalProductId: string;
  externalVariantId: string;
  displaySetName: string;
  displaySetCode: string;
  displayRarity: string | null;
  displayTitle: string;
  displayTreatmentLabel: string | null;
  displayImageUrl: string | null;
  labelStatus: PricingLabelStatus;
  verificationRunId: number;
  publishedAt: string;
};

const PUBLISHABLE_VERIFICATION_STATUSES = new Set<PricingVerificationStatus>(["verified", "drift_warning"]);
const BLOCKED_CONFLICT_TYPES = new Set(["duplicate_product_assignment", "ui_label_mismatch"]);

function normalizedText(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : null;
}

export function candidateHasBlockedConflict(candidate: Pick<PricingPublishCandidate, "conflictTypes">) {
  return (candidate.conflictTypes || []).some((conflictType) => BLOCKED_CONFLICT_TYPES.has(conflictType));
}

export function candidateCanPublish(candidate: PricingPublishCandidate) {
  if (!PUBLISHABLE_VERIFICATION_STATUSES.has(candidate.verificationStatus)) return false;
  if (candidateHasBlockedConflict(candidate)) return false;
  if (!candidate.externalProductId || !candidate.externalVariantId) return false;
  if (!candidate.updatedAt) return false;
  if (candidate.priceNm == null) return false;
  return true;
}

export function buildPublishedDisplayUpsert(
  candidate: PricingPublishCandidate,
  options: {
    verificationRunId: number;
    publishedAt: string;
  },
): PublishedDisplayUpsert | null {
  if (!candidateCanPublish(candidate)) return null;

  const displayTitle = normalizedText(candidate.displayTitle) || normalizedText(candidate.officialName);
  const displaySetName =
    normalizedText(candidate.displaySetName) || normalizedText(candidate.officialSetName);
  const displaySetCode =
    normalizedText(candidate.displaySetCode) || normalizedText(candidate.officialSetCode);

  if (!displayTitle || !displaySetName || !displaySetCode) {
    return null;
  }

  return {
    cardPrintId: candidate.cardPrintId,
    externalProductId: String(candidate.externalProductId),
    externalVariantId: String(candidate.externalVariantId),
    displaySetName,
    displaySetCode,
    displayRarity:
      normalizedText(candidate.displayRarity) || normalizedText(candidate.officialRarity),
    displayTitle,
    displayTreatmentLabel: normalizedText(candidate.displayTreatmentLabel),
    displayImageUrl: normalizedText(candidate.displayImageUrl),
    labelStatus: candidate.labelStatus || "fallback",
    verificationRunId: options.verificationRunId,
    publishedAt: options.publishedAt,
  };
}

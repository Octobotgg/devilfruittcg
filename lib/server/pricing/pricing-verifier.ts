type MappingIntegrityStatus = "verified" | "blocked";
type LabelIntegrityStatus = "verified" | "normalized" | "fallback" | "blocked";
type VerificationStatus =
  | "verified"
  | "drift_warning"
  | "mismatch"
  | "stale_provider"
  | "missing_tcgplayer_id"
  | "unpriced_no_variant"
  | "mapping_conflict";
type ConflictType =
  | "number_mismatch"
  | "set_mismatch"
  | "name_mismatch"
  | "treatment_mismatch"
  | "duplicate_variant_assignment"
  | "duplicate_product_assignment"
  | "ui_label_mismatch";

type MappingInput = {
  cardPrint: {
    id: string;
    number?: string | null;
    setCode?: string | null;
    setName?: string | null;
    originSet?: string | null;
    releaseCode?: string | null;
    title?: string | null;
    rarity?: string | null;
    treatmentLabel?: string | null;
    imageUrl?: string | null;
  };
  provider: {
    externalProductId?: string | null;
    externalVariantId?: string | null;
    tcgplayerProductId?: string | null;
    productName?: string | null;
    productUrlName?: string | null;
    setName?: string | null;
    number?: string | null;
    treatment?: string | null;
    imageUrl?: string | null;
  };
  duplicateVariantCardPrintIds?: string[];
  duplicateProductCardPrintIds?: string[];
  publishedDisplay?: {
    displayTreatmentLabel?: string | null;
  } | null;
};

type ConflictRecord = {
  conflictType: ConflictType;
  expectedNumber: string | null;
  expectedSetCode: string | null;
  expectedName: string | null;
  providerNumber: string | null;
  providerSetName: string | null;
  providerProductName: string | null;
  details: Record<string, unknown>;
};

type TreatmentDetection = {
  label: string;
  exact: boolean;
  normalized: boolean;
  source: string;
};

type PriceDriftInput = {
  mappingIntegrityStatus: MappingIntegrityStatus | string;
  isPremium: boolean;
  justtcgPriceNm: number | null;
  tcgplayerMarketPrice: number | null;
  externalVariantId: string | null;
  tcgplayerProductId: string | null;
  providerUpdatedAt?: string | null;
  checkedAt?: string | null;
};

type DisplayPayloadInput = {
  cardPrint: {
    title?: string | null;
    setName?: string | null;
    setCode?: string | null;
    rarity?: string | null;
    imageUrl?: string | null;
  };
  provider: {
    productName?: string | null;
    productUrlName?: string | null;
    setName?: string | null;
    treatment?: string | null;
    imageUrl?: string | null;
  };
};

const STALE_PROVIDER_MAX_AGE_MS = 72 * 60 * 60 * 1000;
const ABSOLUTE_PRICE_TOLERANCE = 0.05;
const FLOAT_TOLERANCE_EPSILON = 1e-9;
const SUPPORTED_GENERIC_TREATMENTS = new Set(["Parallel", "Base", "Special Print"]);
const RELEASE_ALIASES: Record<string, string[]> = {
  PRB01: ["premium booster the best", "one piece card the best"],
  PRB02: ["premium booster the best vol 2", "one piece card the best vol 2"],
  EB03: ["extra booster one piece heroines edition", "one piece heroines edition", "extra booster 03"],
  EB04: ["the azure sea s seven", "extra booster 04"],
};

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/gu, " ")
    .replace(/[^a-z0-9\s]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeSimple(value: string | null | undefined) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function stripBracketCode(value: string | null | undefined) {
  return String(value || "").replace(/\s*\[[A-Z0-9-]+\]\s*$/u, "").trim();
}

function titleCaseToken(token: string) {
  if (!token) return token;
  if (/^\d+$/u.test(token)) return token;
  if (/[A-Z]/u.test(token) && /\d/u.test(token) && !/[a-z]/u.test(token)) return token;
  if (/^[A-Z]{1,5}\d+$/u.test(token)) return token;
  if (/^[A-Z]{1,5}-\d+$/iu.test(token)) return token.toUpperCase();
  if (/^(OP|ST|EB|PRB|GC|CS|SP|P)$/iu.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function humanizeSlug(value: string | null | undefined) {
  return String(value || "")
    .split(/[_\s]+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => titleCaseToken(token))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function formatSetName(value: string | null | undefined) {
  const stripped = stripBracketCode(value);
  if (!stripped) return "";
  if (!stripped.includes("_") && !/^[A-Z0-9\s-]+$/u.test(stripped)) return stripped;
  return humanizeSlug(stripped);
}

function extractTitleSegments(value: string | null | undefined) {
  return Array.from(String(value || "").matchAll(/\(([^)]+)\)/gu), (match) => match[1]?.trim() || "").filter(Boolean);
}

function isIdentifierLike(value: string) {
  return /^\d+$/u.test(value) || /^[A-Z]{1,5}\d+-\d+$/iu.test(value) || /^[A-Z]-?\d+$/iu.test(value);
}

function normalizeAnniversaryLabel(value: string) {
  const normalized = normalizeText(value);
  if (!normalized.includes("anniversary")) return null;

  const region = normalized.includes("english")
    ? "English"
    : normalized.includes("japanese")
      ? "Japanese"
      : "";
  const ordinal = normalized.match(/\b\d+(?:st|nd|rd|th)\b/u)?.[0] || "";

  if (region && ordinal) return `${region} ${ordinal} Anniversary`;
  if (ordinal) return `${ordinal} Anniversary`;
  if (region) return `${region} Anniversary`;
  return "Anniversary";
}

function setAliasesForCard(cardPrint: MappingInput["cardPrint"]) {
  const aliases = new Set<string>();

  for (const value of [cardPrint.setName, cardPrint.originSet]) {
    const normalized = normalizeText(stripBracketCode(value));
    if (normalized) aliases.add(normalized);
  }

  for (const alias of RELEASE_ALIASES[String(cardPrint.releaseCode || cardPrint.setCode || "").toUpperCase()] || []) {
    aliases.add(normalizeText(alias));
  }

  return [...aliases];
}

function setFamilyMatches(input: MappingInput) {
  const providerSet = normalizeText(input.provider.setName);
  if (!providerSet) return false;

  const haystacks = [providerSet];
  const release = normalizeText(input.cardPrint.releaseCode || input.cardPrint.setCode);
  if (release && haystacks.some((value) => value.includes(release))) return true;

  return setAliasesForCard(input.cardPrint).some((alias) =>
    haystacks.some((value) => value.includes(alias) || alias.includes(value)),
  );
}

function canonicalTreatmentLabel(rawValue: string, allowGeneric: boolean) {
  const raw = String(rawValue || "").trim();
  if (!raw || isIdentifierLike(raw)) return null;

  const normalized = normalizeText(raw);
  if (!normalized) return null;

  const exactMatch = (label: string): TreatmentDetection => ({
    label,
    exact: true,
    normalized: raw !== label,
    source: raw,
  });

  if (normalized === "sp" || normalized === "sp card") return exactMatch("SP");
  if (normalized.includes("jolly roger foil") || normalized.includes("jolly rodger foil")) {
    return exactMatch("Jolly Roger Foil");
  }
  if (normalized.includes("pirate foil")) return exactMatch("Pirate Foil");
  if (normalized.includes("participation")) return exactMatch("Participation Pack");
  if (normalized.includes("finalist")) return exactMatch("Finalist");
  if (normalized.includes("champion")) return exactMatch("Champion");
  if (normalized.includes("winner pack")) return exactMatch("Winner Pack");
  if (normalized.includes("winner card set")) return exactMatch("Winner Card Set");
  if (normalized.includes("event pack")) return exactMatch("Event Pack");
  if (normalized.includes("tournament pack")) return exactMatch("Tournament Pack");
  if (normalized.includes("sp gold") || normalized.includes("gold sp")) return exactMatch("SP (Gold)");
  if (normalized.includes("sp silver") || normalized.includes("silver sp")) return exactMatch("SP (Silver)");
  if (normalized.includes("gold stamped signature")) return exactMatch("Gold-Stamped Signature");
  if (normalized.includes("textured foil")) return exactMatch("Textured Foil");
  if (normalized.includes("treasure rare")) return exactMatch("Treasure Rare");
  if (normalized.includes("full art")) return exactMatch("Full Art");
  if (normalized.includes("red super alternate art")) return exactMatch("Red Super Alternate Art");
  if (normalized.includes("super alternate art")) return exactMatch("Super Alternate Art");
  if (normalized.includes("alternate art") || normalized.includes("alt art")) return exactMatch("Alternate Art");
  if (normalized.includes("reprint")) return exactMatch("Reprint");

  const anniversary = normalizeAnniversaryLabel(normalized);
  if (anniversary) return exactMatch(anniversary);

  if (normalized.includes("manga")) {
    if (normalized.includes("gold")) return exactMatch("Gold Manga");
    if (normalized.includes("red")) return exactMatch("Red Manga");
    return exactMatch("Manga");
  }

  if (!allowGeneric) return null;
  if (normalized === "parallel") {
    return {
      label: "Parallel",
      exact: false,
      normalized: raw !== "Parallel",
      source: raw,
    };
  }
  if (normalized === "base") {
    return {
      label: "Base",
      exact: false,
      normalized: raw !== "Base",
      source: raw,
    };
  }
  if (normalized === "special print") {
    return {
      label: "Special Print",
      exact: false,
      normalized: raw !== "Special Print",
      source: raw,
    };
  }

  return null;
}

function detectProviderTreatment(provider: MappingInput["provider"] | DisplayPayloadInput["provider"]) {
  const candidates = [
    provider.treatment,
    ...extractTitleSegments(provider.productName),
    ...extractTitleSegments(provider.productUrlName),
  ];

  let genericMatch: TreatmentDetection | null = null;
  for (const candidate of candidates) {
    const detected = canonicalTreatmentLabel(String(candidate || ""), true);
    if (!detected) continue;
    if (detected.exact) return detected;
    genericMatch ??= detected;
  }

  return genericMatch;
}

function normalizeExpectedTreatment(value: string | null | undefined) {
  return canonicalTreatmentLabel(String(value || ""), true);
}

function treatmentsMatchForIntegrity(
  expectedTreatment: TreatmentDetection | null,
  providerTreatment: TreatmentDetection | null,
) {
  if (!expectedTreatment?.label) return true;
  if (!providerTreatment?.label) return false;
  if (providerTreatment.label !== expectedTreatment.label) return false;
  if (providerTreatment.exact) return true;
  return SUPPORTED_GENERIC_TREATMENTS.has(providerTreatment.label) && !expectedTreatment.exact;
}

function listHasConflictingAssignment(ids: string[] | undefined, currentId: string) {
  const unique = new Set((ids || []).filter(Boolean));
  if (!unique.size) return false;
  return unique.size > 1 || !unique.has(currentId);
}

function buildConflict(
  input: MappingInput,
  conflictType: ConflictType,
  details: Record<string, unknown> = {},
): ConflictRecord {
  return {
    conflictType,
    expectedNumber: String(input.cardPrint.number || "").trim() || null,
    expectedSetCode: String(input.cardPrint.setCode || "").trim() || null,
    expectedName: String(input.cardPrint.title || "").trim() || null,
    providerNumber: String(input.provider.number || "").trim() || null,
    providerSetName: String(input.provider.setName || "").trim() || null,
    providerProductName: String(input.provider.productName || "").trim() || null,
    details,
  };
}

export function verifyMappingIntegrity(input: MappingInput) {
  const conflicts: ConflictRecord[] = [];
  const providerTreatment = detectProviderTreatment(input.provider);
  const expectedTreatment = normalizeExpectedTreatment(input.cardPrint.treatmentLabel);

  if (listHasConflictingAssignment(input.duplicateVariantCardPrintIds, input.cardPrint.id)) {
    conflicts.push(
      buildConflict(input, "duplicate_variant_assignment", {
        duplicateVariantCardPrintIds: input.duplicateVariantCardPrintIds || [],
      }),
    );
  }

  if (listHasConflictingAssignment(input.duplicateProductCardPrintIds, input.cardPrint.id)) {
    conflicts.push(
      buildConflict(input, "duplicate_product_assignment", {
        duplicateProductCardPrintIds: input.duplicateProductCardPrintIds || [],
      }),
    );
  }

  const expectedNumber = String(input.cardPrint.number || "").trim().toUpperCase();
  const providerNumber = String(input.provider.number || "").trim().toUpperCase();
  if (expectedNumber && providerNumber && expectedNumber !== providerNumber) {
    conflicts.push(buildConflict(input, "number_mismatch"));
  }

  const expectedSet = normalizeText(stripBracketCode(input.cardPrint.setName) || input.cardPrint.setCode);
  const providerSet = normalizeText(input.provider.setName);
  if (expectedSet && providerSet && !setFamilyMatches(input)) {
    conflicts.push(buildConflict(input, "set_mismatch"));
  }

  const expectedName = normalizeSimple(input.cardPrint.title);
  const providerName = normalizeSimple(input.provider.productName || input.provider.productUrlName);
  if (expectedName && providerName && !providerName.includes(expectedName)) {
    conflicts.push(buildConflict(input, "name_mismatch"));
  }

  if (expectedTreatment?.label) {
    if (!treatmentsMatchForIntegrity(expectedTreatment, providerTreatment)) {
      conflicts.push(
        buildConflict(input, "treatment_mismatch", {
          expectedTreatment: expectedTreatment.label,
          providerTreatment: providerTreatment?.label || null,
        }),
      );
    }
  }

  const publishedLabel = normalizeExpectedTreatment(input.publishedDisplay?.displayTreatmentLabel);
  if (
    publishedLabel?.label &&
    providerTreatment?.exact &&
    publishedLabel.label !== providerTreatment.label
  ) {
    conflicts.push(
      buildConflict(input, "ui_label_mismatch", {
        publishedDisplayTreatmentLabel: input.publishedDisplay?.displayTreatmentLabel || null,
        providerTreatment: providerTreatment.label,
      }),
    );
  }

  const mappingIntegrityStatus: MappingIntegrityStatus = conflicts.length ? "blocked" : "verified";
  const verificationStatus: VerificationStatus = conflicts.length ? "mapping_conflict" : "verified";

  let labelIntegrityStatus: LabelIntegrityStatus = "verified";
  if (mappingIntegrityStatus === "blocked") {
    labelIntegrityStatus = "blocked";
  } else if (providerTreatment?.exact && providerTreatment.normalized) {
    labelIntegrityStatus = "normalized";
  } else if (providerTreatment && !providerTreatment.exact) {
    labelIntegrityStatus = "fallback";
  }

  return {
    mappingIntegrityStatus,
    verificationStatus,
    labelIntegrityStatus,
    normalizedProviderTreatmentLabel: providerTreatment?.exact ? providerTreatment.label : null,
    exactTreatmentTrusted: providerTreatment?.exact ?? false,
    conflictTypes: conflicts.map((conflict) => conflict.conflictType),
    primaryConflictType: conflicts[0]?.conflictType || null,
    conflicts,
    publishable: mappingIntegrityStatus === "verified",
  };
}

function computePriceDeltaRatio(justtcgPriceNm: number, tcgplayerMarketPrice: number) {
  const baseline = tcgplayerMarketPrice > 0 ? tcgplayerMarketPrice : justtcgPriceNm;
  if (baseline <= 0) return justtcgPriceNm === tcgplayerMarketPrice ? 0 : 1;
  return Math.abs(justtcgPriceNm - tcgplayerMarketPrice) / baseline;
}

function roundCurrencyDelta(value: number) {
  return Math.round(value * 100) / 100;
}

export function verifyPriceDrift(input: PriceDriftInput) {
  if (input.mappingIntegrityStatus !== "verified") {
    return {
      verificationStatus: "mapping_conflict" as const,
      publishable: false,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      reason: "mapping_integrity_blocked",
    };
  }

  if (!input.tcgplayerProductId) {
    return {
      verificationStatus: "missing_tcgplayer_id" as const,
      publishable: false,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      reason: "missing_tcgplayer_id",
    };
  }

  if (!input.externalVariantId || input.justtcgPriceNm == null) {
    return {
      verificationStatus: "unpriced_no_variant" as const,
      publishable: false,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      reason: "unpriced_no_variant",
    };
  }

  const checkedAt = input.checkedAt ? Date.parse(input.checkedAt) : Date.now();
  const providerUpdatedAt = input.providerUpdatedAt ? Date.parse(input.providerUpdatedAt) : NaN;
  if (Number.isFinite(checkedAt) && Number.isFinite(providerUpdatedAt) && checkedAt - providerUpdatedAt > STALE_PROVIDER_MAX_AGE_MS) {
    return {
      verificationStatus: "stale_provider" as const,
      publishable: false,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      reason: "stale_provider",
    };
  }

  if (input.tcgplayerMarketPrice == null) {
    return {
      verificationStatus: "stale_provider" as const,
      publishable: false,
      priceDeltaAbs: null,
      priceDeltaRatio: null,
      reason: "missing_tcgplayer_market_price",
    };
  }

  const rawPriceDeltaAbs = Math.abs(input.justtcgPriceNm - input.tcgplayerMarketPrice);
  const priceDeltaAbs = roundCurrencyDelta(rawPriceDeltaAbs);
  const priceDeltaRatio = computePriceDeltaRatio(input.justtcgPriceNm, input.tcgplayerMarketPrice);

  if (rawPriceDeltaAbs <= ABSOLUTE_PRICE_TOLERANCE + FLOAT_TOLERANCE_EPSILON || priceDeltaRatio <= 0.005) {
    return {
      verificationStatus: "verified" as const,
      publishable: true,
      priceDeltaAbs,
      priceDeltaRatio,
      reason: "within_tolerance",
    };
  }

  if (!input.isPremium && priceDeltaRatio <= 0.02) {
    return {
      verificationStatus: "drift_warning" as const,
      publishable: true,
      priceDeltaAbs,
      priceDeltaRatio,
      reason: "low_volatility_drift_warning",
    };
  }

  return {
    verificationStatus: "mismatch" as const,
    publishable: false,
    priceDeltaAbs,
    priceDeltaRatio,
    reason: input.isPremium ? "premium_drift_blocked" : "drift_blocked",
  };
}

export function buildPublishedDisplayPayload(input: DisplayPayloadInput) {
  const providerTreatment = detectProviderTreatment(input.provider);

  let displayTreatmentLabel: string | null = null;
  let labelStatus: LabelIntegrityStatus = "verified";

  if (providerTreatment?.exact) {
    displayTreatmentLabel = providerTreatment.label;
    labelStatus = providerTreatment.normalized ? "normalized" : "verified";
  } else if (providerTreatment) {
    labelStatus = "fallback";
  }

  return {
    displayTitle: String(input.cardPrint.title || "").trim(),
    displaySetName: formatSetName(input.provider.setName || input.cardPrint.setName),
    displaySetCode: String(input.cardPrint.setCode || "").trim(),
    displayRarity: String(input.cardPrint.rarity || "").trim(),
    displayTreatmentLabel,
    displayImageUrl: String(input.provider.imageUrl || input.cardPrint.imageUrl || "").trim() || null,
    labelStatus,
  };
}

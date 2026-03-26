import type { Card } from "./cards";
import type { MarketPriceSummary } from "./market-types";

type MarketCardLabelSource = Pick<Card, "id" | "baseId" | "rarity" | "variantLabel"> & {
  justtcgTitle?: string | null;
};

function titleCaseToken(token: string) {
  if (!token) return token;
  if (/^\d+$/.test(token)) return token;
  if (/^[A-Z]{1,5}\d+$/u.test(token)) return token;
  if (/^(OP|ST|EB|PRB|GC|CS|SP|P)$/iu.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function humanizeSlugSetName(value: string) {
  const tokens = value
    .split(/[_\s]+/u)
    .map((token) => token.trim())
    .filter(Boolean);

  const parts: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (/^\d{2}$/u.test(current) && /^\d{2}$/u.test(next || "")) {
      parts.push(`${current}-${next}`);
      index += 1;
      continue;
    }

    if (/^vol$/iu.test(current) && /^\d+$/u.test(next || "")) {
      parts.push(`Vol. ${next}`);
      index += 1;
      continue;
    }

    parts.push(titleCaseToken(current));
  }

  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

function normalizeLabelToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractTitleSegments(value: string) {
  return Array.from(value.matchAll(/\(([^)]+)\)/gu), (match) => match[1]?.trim() || "").filter(Boolean);
}

function isIdentifierLike(value: string) {
  return /^\d+$/u.test(value) || /^[A-Z]{1,5}\d+-\d+$/iu.test(value) || /^[A-Z]-?\d+$/iu.test(value);
}

function normalizeAnniversaryLabel(value: string) {
  const normalized = normalizeLabelToken(value);
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

function normalizeKnownTreatmentLabel(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw || isIdentifierLike(raw)) return null;

  const normalized = normalizeLabelToken(raw);
  if (!normalized || ["parallel", "base", "special print"].includes(normalized)) return null;
  if (normalized === "sp" || normalized === "sp card") return "SP";
  if (normalized.includes("jolly roger foil")) return "Jolly Roger Foil";
  if (normalized.includes("pirate foil")) return "Pirate Foil";
  if (normalized.includes("gold stamped signature")) return "Gold-Stamped Signature";
  if (normalized.includes("textured foil")) return "Textured Foil";
  if (normalized.includes("treasure rare")) return "Treasure Rare";
  if (normalized.includes("full art")) return "Full Art";

  const anniversary = normalizeAnniversaryLabel(normalized);
  if (anniversary) return anniversary;

  if (normalized.includes("manga")) {
    if (normalized.includes("gold")) return "Gold Manga";
    if (normalized.includes("red")) return "Red Manga";
    return "Manga";
  }

  if (normalized.includes("alternate art") || normalized.includes("alt art")) return "Alternate Art";
  return null;
}

export function formatMarketSetLabel(value: string | null | undefined) {
  const stripped = String(value || "")
    .replace(/\s*\[[A-Z0-9-]+\]\s*$/u, "")
    .trim();

  if (!stripped) return "";

  const looksLikeSlug = stripped.includes("_") || /^[A-Z0-9\s-]+$/u.test(stripped);
  if (!looksLikeSlug) {
    return stripped;
  }

  return humanizeSlugSetName(stripped);
}

export function formatMarketSetFacetLabel(code: string | null | undefined, setName: string | null | undefined) {
  const compactCode = String(code || "").trim();
  const prettySetName = formatMarketSetLabel(setName || compactCode);
  if (!compactCode) return prettySetName;

  const shouldShowCode =
    !compactCode.includes("_") &&
    (/^[A-Z]{1,5}\d{1,4}$/u.test(compactCode) ||
      /^[A-Z]-\d+$/u.test(compactCode) ||
      compactCode.length <= 4);

  return shouldShowCode ? `${compactCode} · ${prettySetName}` : prettySetName;
}

export function marketVariantDisplayLabel(card: MarketCardLabelSource) {
  if (!card.baseId || card.id === card.baseId) return null;

  const normalizedRarity = String(card.rarity || "").trim().toUpperCase() === "SP CARD"
    ? "sp"
    : String(card.rarity || "").trim().toLowerCase();

  const internalLabel = normalizeKnownTreatmentLabel(card.variantLabel);
  if (internalLabel && internalLabel.toLowerCase() === normalizedRarity && internalLabel !== "SP") {
    return null;
  }

  if (internalLabel === "SP") return "SP";

  const justtcgSegments = extractTitleSegments(String(card.justtcgTitle || ""));
  for (const segment of justtcgSegments) {
    const normalizedLabel = normalizeKnownTreatmentLabel(segment);
    if (normalizedLabel) return normalizedLabel;
  }

  return internalLabel;
}

export function marketPriceDisplay(market: MarketPriceSummary | null | undefined) {
  const marketPrice = typeof market?.marketPrice === "number" ? market.marketPrice : null;
  if (marketPrice == null) {
    return {
      label: "Unpriced",
      sublabel: "No approved JustTCG price yet",
      tone: "muted" as const,
    };
  }

  return {
    label: `$${marketPrice.toFixed(2)}`,
    sublabel: "TCG Market",
    tone: "priced" as const,
  };
}

export function marketEmptyStateCopy({
  query,
  activeFilterCount,
}: {
  query: string;
  activeFilterCount: number;
}) {
  const trimmedQuery = query.trim();
  if (activeFilterCount > 0) {
    return {
      title: "No cards match these filters",
      body: trimmedQuery
        ? `Clear a few filters or widen the search for "${trimmedQuery}".`
        : "Clear a few filters or widen the market view.",
      actionLabel: "Clear All Filters",
    };
  }

  if (trimmedQuery) {
    return {
      title: `No cards found for "${trimmedQuery}"`,
      body: "Try a different card name, set code, or number.",
      actionLabel: "Clear Search",
    };
  }

  return {
    title: "No cards found",
    body: "Try adjusting your filters or clearing the search to widen the results.",
    actionLabel: "Clear All Filters",
  };
}

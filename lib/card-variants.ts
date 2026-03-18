import type { Card } from "@/lib/cards";

export const EN_BASE_RARITIES = ["C", "UC", "R", "SR", "SEC"] as const;
export type EnBaseRarity = (typeof EN_BASE_RARITIES)[number];

export const EN_VARIANT_TYPES = [
  "base",
  "parallel",
  "alt_art",
  "sp",
  "manga",
  "manga_red",
  "manga_gold",
  "anniversary",
] as const;
export type EnVariantType = (typeof EN_VARIANT_TYPES)[number];

export type CardVariantInfo = {
  baseCardId: string;
  legacyVariantCode: string | null;
  baseRarity: string;
  variantType: EnVariantType;
  variantLabel: string;
  variantSlug: string;
  variantOrder: number;
  canonicalId: string;
  canonicalVariantKey: string;
  canonicalVariantId: string;
  language: "EN";
};

type VariantSource = Pick<Card, "id" | "name" | "rarity"> &
  Partial<Pick<Card, "set" | "notes" | "seriesCategory" | "isVariant" | "variantType" | "variantLabel" | "variantSlug" | "canonicalId">>;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getBaseCardId(cardId: string): string {
  return cardId.replace(/_[A-Za-z0-9]+$/, "");
}

export function getLegacyVariantCode(cardId: string): string | null {
  const m = /_([A-Za-z0-9]+)$/.exec(cardId);
  return m ? m[1].toLowerCase() : null;
}

function inferVariantTypeFromLabel(label: string | null | undefined): EnVariantType | null {
  const text = normalize(String(label || ""));
  if (!text) return null;
  if (text.includes("gold manga")) return "manga_gold";
  if (text.includes("red manga")) return "manga_red";
  if (text.includes("manga")) return "manga";
  if (text.includes("anniversary") || text.includes("25th edition")) return "anniversary";
  if (/\bsp\b/.test(text) || text.includes("special")) return "sp";
  if (text.includes("alternate art") || text.includes("alt art") || text.includes("super alternate art")) return "alt_art";
  if (text.includes("parallel")) return "parallel";
  return null;
}

function normalizeExplicitVariantType(type: string | null | undefined): EnVariantType | null {
  const value = normalize(String(type || ""));
  if (!value) return null;
  if (value === "base") return "base";
  if (value === "parallel") return "parallel";
  if (value === "alt art" || value === "alternate art" || value === "alt_art" || value === "super alternate art" || value === "red super alternate art") {
    return "alt_art";
  }
  if (value === "sp" || value === "special card") return "sp";
  if (value === "manga") return "manga";
  if (value === "red manga") return "manga_red";
  if (value === "gold manga") return "manga_gold";
  if (value === "anniversary") return "anniversary";
  return null;
}

export function inferVariantType(card: VariantSource): EnVariantType {
  const explicitType = normalizeExplicitVariantType(card.variantType) || inferVariantTypeFromLabel(card.variantLabel);
  if (explicitType) return explicitType;

  const text = normalize([
    card.name || "",
    card.set || "",
    ...(Array.isArray(card.notes) ? card.notes : []),
  ].join(" "));
  const rarity = String(card.rarity || "").toUpperCase();
  const legacyCode = getLegacyVariantCode(card.id);
  const isVariant = card.isVariant ?? getBaseCardId(card.id) !== card.id;

  if (!isVariant) return "base";
  if (text.includes("gold manga")) return "manga_gold";
  if (text.includes("red manga")) return "manga_red";
  if (/\bmanga\b/.test(text)) return "manga";
  if (text.includes("anniversary") || text.includes("25th edition")) return "anniversary";
  if (rarity.includes("SP") || /\bsp\b/.test(text) || text.includes("special card")) return "sp";
  if (text.includes("alt art") || /\baa\b/.test(text)) return "alt_art";
  if (legacyCode && /^r\d+$/i.test(legacyCode)) return "base";
  if (legacyCode && /^p\d+$/i.test(legacyCode)) {
    if (rarity === "SEC" && Number(legacyCode.slice(1)) >= 2) return "manga";
    return "parallel";
  }

  return "base";
}

export function toBaseRarity(rarity?: string): string {
  const r = String(rarity || "").toUpperCase();
  return r || "UNKNOWN";
}

function normalizeExplicitVariantLabel(label: string | null | undefined, type: EnVariantType): string | null {
  const raw = String(label || "").trim();
  const text = normalize(raw);
  if (!text) return null;

  switch (type) {
    case "parallel":
      return text === "parallel" ? "Parallel" : raw;
    case "alt_art":
      if (text.includes("red super alternate art")) return "Red Super Alternate Art";
      if (text.includes("super alternate art")) return "Super Alternate Art";
      if (text.includes("alternate art") || text.includes("alt art")) return "Alternate Art";
      return raw;
    case "sp":
      return text === "sp" ? "SP" : raw;
    case "manga":
      return text === "manga" ? "Manga" : raw;
    case "manga_red":
      return "Red Manga";
    case "manga_gold":
      return "Gold Manga";
    case "anniversary":
      return text === "anniversary" ? "Anniversary" : raw;
    case "base":
    default:
      return raw || null;
  }
}

export function variantLabel(type: EnVariantType, baseRarity: string, explicitLabel?: string | null): string {
  const normalizedExplicit = normalizeExplicitVariantLabel(explicitLabel, type);
  if (normalizedExplicit) return normalizedExplicit;
  if (type === "base") return baseRarity;

  switch (type) {
    case "parallel":
      return "Parallel";
    case "alt_art":
      return "Alternate Art";
    case "sp":
      return "SP";
    case "manga":
      return "Manga";
    case "manga_red":
      return "Red Manga";
    case "manga_gold":
      return "Gold Manga";
    case "anniversary":
      return "Anniversary";
    default:
      return baseRarity;
  }
}

const VARIANT_ORDER: Record<EnVariantType, number> = {
  base: 0,
  parallel: 5,
  alt_art: 10,
  sp: 20,
  manga: 30,
  manga_red: 31,
  manga_gold: 32,
  anniversary: 40,
};

const RARITY_ORDER: Record<string, number> = {
  C: 0,
  UC: 1,
  R: 2,
  SR: 3,
  SEC: 4,
};

function printableLegacy(code: string | null): string {
  if (!code) return "";
  const p = /^p(\d+)$/.exec(code);
  if (p) return `.print${Number(p[1])}`;
  return `.${code}`;
}

export function canonicalVariantKey(type: EnVariantType, baseRarity: string): string {
  if (type === "base") {
    const r = baseRarity.toLowerCase();
    return ["c", "uc", "r", "sr", "sec"].includes(r) ? r : `rarity_${r}`;
  }
  return type;
}

export function deriveCardVariantInfo(card: VariantSource): CardVariantInfo {
  const baseCardId = getBaseCardId(card.id);
  const legacyVariantCode = getLegacyVariantCode(card.id);
  const baseRarity = toBaseRarity(card.rarity);
  const type = inferVariantType(card);
  const explicitSlug = String(card.variantSlug || "").trim();
  const key = explicitSlug || canonicalVariantKey(type, baseRarity);

  const variantOrder = VARIANT_ORDER[type] + (RARITY_ORDER[baseRarity] ?? 99);
  const explicitCanonicalId = String(card.canonicalId || "").trim();
  const id = explicitCanonicalId || `${baseCardId}::${key}${printableLegacy(legacyVariantCode)}`;

  return {
    baseCardId,
    legacyVariantCode,
    baseRarity,
    variantType: type,
    variantLabel: variantLabel(type, baseRarity, card.variantLabel),
    variantSlug: key,
    variantOrder,
    canonicalId: id,
    canonicalVariantKey: key,
    canonicalVariantId: id,
    language: "EN",
  };
}

export function isSpecialPrintVariant(card: Pick<Card, "id" | "variantType" | "legacyVariantCode" | "variantCode">): boolean {
  const type = card.variantType || "base";
  const legacy = (card.legacyVariantCode || card.variantCode || getLegacyVariantCode(card.id) || "").toLowerCase();

  if (type !== "base") return true;
  if (/^r\d+$/i.test(legacy)) return false;
  return /^p\d+$/i.test(legacy);
}

export function specialPrintPriority(card: Pick<Card, "id" | "variantType" | "legacyVariantCode" | "variantCode">): number {
  const type = card.variantType || "base";
  const legacy = (card.legacyVariantCode || card.variantCode || getLegacyVariantCode(card.id) || "").toLowerCase();
  const numMatch = /^p(\d+)$/i.exec(legacy);
  const printNumber = numMatch ? Number(numMatch[1]) : 0;

  switch (type) {
    case "manga_gold":
      return 700 + printNumber;
    case "manga_red":
      return 690 + printNumber;
    case "manga":
      return 680 + printNumber;
    case "sp":
      return 650 + printNumber;
    case "anniversary":
      return 620 + printNumber;
    case "alt_art":
      return 600 + printNumber;
    case "parallel":
      return 560 + printNumber;
    default:
      return /^p\d+$/i.test(legacy) ? 540 + printNumber : 0;
  }
}

export function pickPreferredSpecialPrint<T extends Pick<Card, "id" | "variantType" | "variantCode" | "legacyVariantCode" | "variantOrder">>(
  cards: T[],
): T | null {
  return [...cards]
    .filter((card) => isSpecialPrintVariant(card))
    .sort((a, b) => {
      const priority = specialPrintPriority(b) - specialPrintPriority(a);
      if (priority !== 0) return priority;

      const orderA = typeof a.variantOrder === "number" ? a.variantOrder : 999;
      const orderB = typeof b.variantOrder === "number" ? b.variantOrder : 999;
      if (orderA !== orderB) return orderA - orderB;

      return a.id.localeCompare(b.id);
    })[0] || null;
}

export function attachVariantInfo(card: Card): Card {
  const info = deriveCardVariantInfo(card);
  return {
    ...card,
    ...info,
  };
}

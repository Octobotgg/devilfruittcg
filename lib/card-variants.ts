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
  variantOrder: number;
  canonicalVariantKey: string;
  canonicalVariantId: string;
  language: "EN";
};

type VariantSource = Pick<Card, "id" | "name" | "rarity"> &
  Partial<Pick<Card, "set" | "notes" | "seriesCategory" | "isVariant">>;

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

export function inferVariantType(card: VariantSource): EnVariantType {
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

export function variantLabel(type: EnVariantType, baseRarity: string): string {
  if (type === "base") return baseRarity;

  switch (type) {
    case "parallel":
      return "Parallel";
    case "alt_art":
      return "Alt Art";
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
  const key = canonicalVariantKey(type, baseRarity);

  const variantOrder = VARIANT_ORDER[type] + (RARITY_ORDER[baseRarity] ?? 99);
  const id = `${baseCardId}::${key}${printableLegacy(legacyVariantCode)}`;

  return {
    baseCardId,
    legacyVariantCode,
    baseRarity,
    variantType: type,
    variantLabel: variantLabel(type, baseRarity),
    variantOrder,
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

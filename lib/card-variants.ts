import type { Card } from "@/lib/cards";

export const EN_BASE_RARITIES = ["C", "UC", "R", "SR", "SEC"] as const;
export type EnBaseRarity = (typeof EN_BASE_RARITIES)[number];

export const EN_VARIANT_TYPES = [
  "base",
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

export function inferVariantType(name: string, rarity?: string): EnVariantType {
  const t = normalize(name || "");
  const r = String(rarity || "").toUpperCase();

  if (t.includes("gold manga")) return "manga_gold";
  if (t.includes("red manga")) return "manga_red";
  if (/\bmanga\b/.test(t)) return "manga";
  if (t.includes("anniversary")) return "anniversary";
  if (r === "SP" || /\bsp\b/.test(t) || t.includes("special")) return "sp";
  if (t.includes("alt art") || /\baa\b/.test(t)) return "alt_art";

  return "base";
}

export function toBaseRarity(rarity?: string): string {
  const r = String(rarity || "").toUpperCase();
  return r || "UNKNOWN";
}

export function variantLabel(type: EnVariantType, baseRarity: string): string {
  if (type === "base") return baseRarity;

  switch (type) {
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

export function deriveCardVariantInfo(card: Pick<Card, "id" | "name" | "rarity">): CardVariantInfo {
  const baseCardId = getBaseCardId(card.id);
  const legacyVariantCode = getLegacyVariantCode(card.id);
  const baseRarity = toBaseRarity(card.rarity);
  const type = inferVariantType(card.name, card.rarity);
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

export function attachVariantInfo(card: Card): Card {
  const info = deriveCardVariantInfo(card);
  return {
    ...card,
    ...info,
  };
}

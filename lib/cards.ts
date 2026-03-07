import BASE_CARDS_JSON from "@/data/bandai-en-base-cards.json";
import { attachVariantInfo } from "@/lib/card-variants";

export interface Card {
  id: string;
  baseId?: string;
  baseCardId?: string;
  printedCardId?: string;
  name: string;
  set: string;
  cardSetNames?: string[];
  setCode: string;
  number: string;
  type: string;
  color: string;
  rarity: string;
  cost?: number | null;
  life?: number | null;
  power?: number | null;
  counter?: number | null;
  attribute?: string | null;
  traits?: string | null;
  effect?: string | null;
  trigger?: string | null;
  imageUrl?: string | null;
  notes?: string[];
  variantCode?: string | null;
  isVariant?: boolean;
  legacyVariantCode?: string | null;
  baseRarity?: string;
  variantType?: "base" | "alt_art" | "sp" | "manga" | "manga_red" | "manga_gold" | "anniversary";
  variantLabel?: string;
  variantOrder?: number;
  canonicalVariantKey?: string;
  canonicalVariantId?: string;
  isReprint?: boolean;
  releaseCode?: string | null;
  releaseDate?: string | null;
  releaseDatePrecision?: string | null;
  releaseDateRaw?: string | null;
  releaseUrl?: string | null;
  originCardId?: string | null;
  originSet?: string | null;
  language?: "EN";
  seriesId?: string;
  seriesLabel?: string;
  seriesCategory?: string;
  seriesIds?: string[];
  seriesLabels?: string[];
  seriesCategories?: string[];
  manualReview?: string[];
}

export const SEED_CARDS: Card[] = (BASE_CARDS_JSON as Card[]).map(attachVariantInfo);

export function searchCards(query: string): Card[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEED_CARDS;

  const scored = SEED_CARDS.map((card) => {
    let score = 0;
    const nameLower = card.name.toLowerCase();
    const idLower = card.id.toLowerCase();
    const setCodeLower = card.setCode.toLowerCase();

    if (idLower === q) score += 1200;
    else if (idLower.startsWith(q)) score += 700;
    else if (idLower.includes(q)) score += 500;

    if (nameLower === q) score += 1000;
    else if (nameLower.startsWith(q)) score += 600;
    else if (nameLower.includes(` ${q}`) || nameLower.includes(`${q} `)) score += 500;
    else if (nameLower.includes(q)) score += 350;

    if (setCodeLower === q) score += 200;
    if (card.set.toLowerCase().includes(q)) score += 120;
    if (card.color.toLowerCase().includes(q)) score += 80;
    if (card.type.toLowerCase().includes(q)) score += 60;

    return { card, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);
}

export function advancedSearch(params: {
  query?: string;
  setCode?: string;
  color?: string;
  type?: string;
  rarity?: string;
  minCost?: number;
  maxCost?: number;
}): Card[] {
  const results = params.query ? searchCards(params.query) : SEED_CARDS;

  return results.filter((card) => {
    if (params.setCode && card.setCode.toLowerCase() !== params.setCode.toLowerCase()) return false;
    if (params.color && !card.color.toLowerCase().includes(params.color.toLowerCase())) return false;
    if (params.type && card.type.toLowerCase() !== params.type.toLowerCase()) return false;
    if (params.rarity && card.rarity.toLowerCase() !== params.rarity.toLowerCase()) return false;
    if (params.minCost !== undefined && (card.cost ?? -1) < params.minCost) return false;
    if (params.maxCost !== undefined && (card.cost ?? Number.MAX_SAFE_INTEGER) > params.maxCost) return false;
    return true;
  });
}

export function findCardExact(query: string): Card | null {
  const q = query.toLowerCase().trim();
  return SEED_CARDS.find((card) => card.id.toLowerCase() === q || card.name.toLowerCase() === q) ?? null;
}

export function getCardById(id: string): Card | undefined {
  return SEED_CARDS.find((card) => card.id === id);
}

export function getCardsBySet(setCode: string): Card[] {
  return SEED_CARDS.filter((card) => card.setCode === setCode);
}

const SET_NAME_OVERRIDES: Record<string, string> = {
  P: "Promotion Card [P]",
};

export const SETS = Object.values(
  SEED_CARDS.reduce<Record<string, { code: string; name: string }>>((acc, card) => {
    if (acc[card.setCode]) return acc;

    acc[card.setCode] = {
      code: card.setCode,
      name: SET_NAME_OVERRIDES[card.setCode] || card.set,
    };

    return acc;
  }, {}),
).sort((a, b) => a.code.localeCompare(b.code));

import "server-only";

import OFFICIAL_CARDS_JSON from "@/data/bandai-en-official-cards.json";
import { attachVariantInfo } from "@/lib/card-variants";
import type { Card } from "@/lib/cards";

function getBaseId(id: string): string {
  return id.replace(/_[A-Za-z0-9]+$/u, "");
}

function variantSortValue(card: Card): number {
  if (card.id === card.baseId) return 0;

  const match = /_p(\d+)$/i.exec(card.id);
  if (match) return Number(match[1]);

  return 999;
}

function sortVariants(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const orderA = variantSortValue(a);
    const orderB = variantSortValue(b);
    if (orderA !== orderB) return orderA - orderB;

    const dateA = a.releaseDate || "9999-99-99";
    const dateB = b.releaseDate || "9999-99-99";
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    return a.id.localeCompare(b.id);
  });
}

export const OFFICIAL_CARDS: Card[] = (OFFICIAL_CARDS_JSON as Card[]).map(attachVariantInfo);
export const OFFICIAL_BASE_CARDS: Card[] = OFFICIAL_CARDS.filter((card) => card.id === card.baseId);

const OFFICIAL_BY_ID = new Map(OFFICIAL_CARDS.map((card) => [card.id.toUpperCase(), card]));
const OFFICIAL_BY_BASE_ID = new Map<string, Card[]>();

for (const card of OFFICIAL_CARDS) {
  const baseId = card.baseId || getBaseId(card.id);
  if (!OFFICIAL_BY_BASE_ID.has(baseId)) OFFICIAL_BY_BASE_ID.set(baseId, []);
  OFFICIAL_BY_BASE_ID.get(baseId)!.push(card);
}

for (const [baseId, cards] of OFFICIAL_BY_BASE_ID.entries()) {
  OFFICIAL_BY_BASE_ID.set(baseId, sortVariants(cards));
}

function scoreCard(card: Card, query: string): number {
  const q = query.toLowerCase();
  const idLower = card.id.toLowerCase();
  const baseIdLower = (card.baseId || card.id).toLowerCase();
  const nameLower = card.name.toLowerCase();
  const setCodeLower = card.setCode.toLowerCase();
  const setLower = card.set.toLowerCase();

  let score = 0;

  if (idLower === q) score += 1500;
  else if (baseIdLower === q) score += 1400;
  else if (idLower.startsWith(q)) score += 900;
  else if (baseIdLower.startsWith(q)) score += 850;
  else if (idLower.includes(q) || baseIdLower.includes(q)) score += 600;

  if (nameLower === q) score += 1200;
  else if (nameLower.startsWith(q)) score += 700;
  else if (nameLower.includes(` ${q}`) || nameLower.includes(`${q} `)) score += 650;
  else if (nameLower.includes(q)) score += 400;

  if (setCodeLower === q) score += 300;
  if (setLower.includes(q)) score += 150;
  if (card.color.toLowerCase().includes(q)) score += 120;
  if (card.type.toLowerCase().includes(q)) score += 90;

  return score;
}

export function getOfficialCardById(id: string): Card | undefined {
  return OFFICIAL_BY_ID.get(id.trim().toUpperCase());
}

export function getOfficialCardsByIds(ids: string[]): Card[] {
  const out: Card[] = [];
  const seen = new Set<string>();

  for (const rawId of ids) {
    const id = rawId.trim().toUpperCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const card = getOfficialCardById(id);
    if (card) out.push(card);
  }

  return out;
}

export function getOfficialVariantsByBaseId(id: string): Card[] {
  const baseId = getBaseId(id.trim().toUpperCase());
  return OFFICIAL_BY_BASE_ID.get(baseId) || [];
}

export function searchOfficialCards(query: string, options?: { includeVariants?: boolean }): Card[] {
  const q = query.trim();
  const includeVariants = options?.includeVariants ?? false;

  if (!q) return OFFICIAL_BASE_CARDS;

  const upper = q.toUpperCase();
  const exact = getOfficialCardById(upper);
  const variants = getOfficialVariantsByBaseId(upper);
  if (exact && exact.id !== exact.baseId) return [exact];
  if (variants.length) return variants;
  if (exact) return [exact];

  const pool = includeVariants ? OFFICIAL_CARDS : OFFICIAL_BASE_CARDS;
  return pool
    .map((card) => ({ card, score: scoreCard(card, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);
}

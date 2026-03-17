import "server-only";

import type { Card } from "./cards";
import { OFFICIAL_CARDS, searchOfficialCards } from "./official-cards";

export const ALL_SET_CARDS: Card[] = OFFICIAL_CARDS;

export async function loadCards(): Promise<Card[]> {
  return OFFICIAL_CARDS;
}

export function filterCards(cards: Card[], params: {
  q?: string;
  set?: string;
  color?: string;
  rarity?: string;
  type?: string;
  costMin?: number;
  costMax?: number;
  page?: number;
  pageSize?: number;
}) {
  const {
    q = "",
    set,
    color,
    rarity,
    type,
    costMin,
    costMax,
    page = 1,
    pageSize = 40,
  } = params;

  const query = q.trim();
  let filtered = query ? searchOfficialCards(query, { includeVariants: true }) : cards;

  if (set) filtered = filtered.filter((card) => card.setCode.toLowerCase() === set.toLowerCase());
  if (color) filtered = filtered.filter((card) => card.color.toLowerCase().includes(color.toLowerCase()));
  if (rarity) filtered = filtered.filter((card) => card.rarity.toLowerCase() === rarity.toLowerCase());
  if (type) filtered = filtered.filter((card) => card.type.toLowerCase() === type.toLowerCase());
  if (costMin !== undefined) filtered = filtered.filter((card) => card.cost == null || card.cost >= costMin);
  if (costMax !== undefined) filtered = filtered.filter((card) => card.cost == null || card.cost <= costMax);

  const total = filtered.length;
  const start = Math.max(0, (page - 1) * pageSize);
  const results = filtered.slice(start, start + pageSize);

  return { total, page, pageSize, results };
}

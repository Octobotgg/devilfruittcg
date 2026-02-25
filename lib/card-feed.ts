import { SEED_CARDS, type Card } from "./cards";
import { getOP01Cards } from "./op01-cards";
import { OP02_CARDS } from "./op02-cards";
import { OP03_CARDS } from "./op03-cards";
import { OP04_CARDS } from "./op04-cards";
import { OP05_CARDS } from "./op05-cards";
import { OP06_CARDS } from "./op06-cards";
import { OP07_CARDS } from "./op07-cards";
import { OP08_CARDS } from "./op08-cards";
import { OP09_CARDS } from "./op09-cards";

const DEFAULT_FEED = process.env.CARD_FEED_URL || "https://optcgdb.com/api/cards.json";

// Combine all set cards
export const ALL_SET_CARDS: Card[] = [
  ...getOP01Cards(),
  ...OP02_CARDS,
  ...OP03_CARDS,
  ...OP04_CARDS,
  ...OP05_CARDS,
  ...OP06_CARDS,
  ...OP07_CARDS,
  ...OP08_CARDS,
  ...OP09_CARDS,
];

let cache: { cards: Card[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function mapFeedCard(raw: any): Card | null {
  try {
    // optcgdb format assumptions
    const id = raw.cardid || raw.cardId || raw.id || raw.number;
    if (!id) return null;
    const setCode = raw.setcode || raw.setCode || raw.set || raw.setid || "";
    const number = raw.number || raw.no || "";
    const setName = raw.setname || raw.setName || raw.set || "";
    const name = raw.name || "";
    const type = raw.type || raw.cardtype || raw.category || "";
    const color = raw.color || raw.colour || "";
    const rarity = raw.rarity || "";
    const cost = raw.cost !== undefined ? Number(raw.cost) : undefined;
    const power = raw.power !== undefined ? Number(raw.power) : undefined;
    const attribute = raw.attribute || raw.trait || undefined;
    const image = raw.image || raw.img || raw.imageurl || raw.imageUrl || raw.image_url || undefined;

    const card: Card = {
      id: String(id),
      name,
      set: setName || setCode || "",
      setCode: String(setCode || setName || "").toUpperCase(),
      number: String(number || id),
      type,
      color,
      rarity,
      cost,
      power,
      attribute,
      imageUrl: image,
    };
    return card;
  } catch {
    return null;
  }
}

export async function loadCards(): Promise<Card[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.cards;

  // Start with all set cards + seed cards as base
  const baseCards = [...ALL_SET_CARDS, ...SEED_CARDS];

  try {
    const res = await fetch(DEFAULT_FEED, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`feed failed ${res.status}`);
    const data = await res.json();
    const rawCards = Array.isArray(data) ? data : data.cards || [];
    const mapped = (rawCards as any[])
      .map(mapFeedCard)
      .filter((c): c is Card => Boolean(c && c.id && c.name));
    // Deduplicate by id, prefer first occurrence
    const unique: Record<string, Card> = {};
    for (const c of [...baseCards, ...mapped]) {
      if (!unique[c.id]) unique[c.id] = c;
    }
    const cards = Object.values(unique);
    cache = { cards, fetchedAt: now };
    return cards.length ? cards : baseCards;
  } catch (e) {
    cache = { cards: baseCards, fetchedAt: now };
    return baseCards;
  }
}

export function filterCards(cards: Card[], params: {
  q?: string;
  set?: string;
  color?: string;
  rarity?: string;
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
    costMin,
    costMax,
    page = 1,
    pageSize = 40,
  } = params;

  const query = q.toLowerCase().trim();

  let filtered = cards.filter((c) => {
    if (set && c.setCode.toLowerCase() !== set.toLowerCase()) return false;
    if (color && c.color.toLowerCase() !== color.toLowerCase()) return false;
    if (rarity && c.rarity.toLowerCase() !== rarity.toLowerCase()) return false;
    if (costMin !== undefined && c.cost !== undefined && c.cost < costMin) return false;
    if (costMax !== undefined && c.cost !== undefined && c.cost > costMax) return false;
    if (query) {
      const hay = `${c.name} ${c.id} ${c.number} ${c.set} ${c.setCode} ${c.color} ${c.type}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  filtered = filtered.slice(start, end);

  return { total, page, pageSize, results: filtered };
}

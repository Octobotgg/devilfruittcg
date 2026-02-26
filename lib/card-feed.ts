import { SEED_CARDS, type Card } from "./cards";

const DEFAULT_FEED = process.env.CARD_FEED_URL || "https://optcgdb.com/api/cards.json";

// All local cards (OP01-OP10, EB01-EB02, ST01-ST21) - used as fallback
export const ALL_SET_CARDS: Card[] = SEED_CARDS;

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

function dedupeById(cards: Card[]): Card[] {
  const unique: Record<string, Card> = {};
  for (const c of cards) {
    if (!c?.id) continue;
    if (!unique[c.id]) unique[c.id] = c;
  }
  return Object.values(unique);
}

function dedupeByPrint(cards: Card[]): Card[] {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of cards) {
    if (!c?.id) continue;
    const key = `${c.id}|${c.imageUrl || ""}|${c.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function isLikelyEnglish(name: string): boolean {
  if (!name) return false;
  // reject Japanese/CJK scripts
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(name)) return false;
  // must have latin letters
  return /[A-Za-z]/.test(name);
}

export async function loadCards(): Promise<Card[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.cards;

  // Start with all set cards + seed cards as base, then dedupe locally
  const baseCards = dedupeById([...ALL_SET_CARDS, ...SEED_CARDS]);

  try {
    const res = await fetch(DEFAULT_FEED, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`feed failed ${res.status}`);
    const data = await res.json();
    const rawCards = Array.isArray(data) ? data : data.cards || [];
    const mapped = (rawCards as any[])
      .map(mapFeedCard)
      .filter((c): c is Card => Boolean(c && c.id && c.name))
      .filter((c) => isLikelyEnglish(c.name));

    // Keep all unique printings (includes alternate arts when image/name differ)
    const mappedPrints = dedupeByPrint(mapped);

    // Add local fallback only for card IDs missing from feed
    const mappedIds = new Set(mappedPrints.map((c) => c.id));
    const fallbackMissing = baseCards.filter((c) => !mappedIds.has(c.id));

    const cards = [...mappedPrints, ...fallbackMissing];
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

  let filtered: Card[];
  
  // Use premium scoring search for query, or simple filter for no query
  if (query) {
    // Score and rank all cards
    const scored = cards.map((card) => {
      let score = 0;
      const nameLower = card.name.toLowerCase();
      const idLower = card.id.toLowerCase();
      const setCodeLower = card.setCode.toLowerCase();
      
      // Exact ID match (highest priority)
      if (idLower === query) score += 1000;
      else if (idLower.startsWith(query)) score += 500;
      else if (idLower.includes(query)) score += 300;
      
      // Name matches
      if (nameLower === query) score += 900;
      else if (nameLower.startsWith(query)) score += 400;
      else if (nameLower.includes(` ${query}`) || nameLower.includes(`${query} `)) score += 350;
      else if (nameLower.includes(query)) score += 200;
      
      // Other matches
      if (setCodeLower === query) score += 100;
      if (card.set.toLowerCase().includes(query)) score += 50;
      if (card.color.toLowerCase().includes(query)) score += 40;
      if (card.type.toLowerCase().includes(query)) score += 30;
      
      return { card, score };
    });
    
    // Filter to matches only, sort by score
    filtered = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.card);
    
    // Remove duplicates
    const seen = new Set<string>();
    filtered = filtered.filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  } else {
    filtered = [...cards];
  }

  // Apply additional filters
  if (set) filtered = filtered.filter((c) => c.setCode.toLowerCase() === set.toLowerCase());
  if (color) filtered = filtered.filter((c) => c.color.toLowerCase() === color.toLowerCase());
  if (rarity) filtered = filtered.filter((c) => c.rarity.toLowerCase() === rarity.toLowerCase());
  if (costMin !== undefined) filtered = filtered.filter((c) => c.cost === undefined || c.cost >= costMin);
  if (costMax !== undefined) filtered = filtered.filter((c) => c.cost === undefined || c.cost <= costMax);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  filtered = filtered.slice(start, end);

  return { total, page, pageSize, results: filtered };
}

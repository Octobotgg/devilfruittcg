import OP02_CARDS from './op02-cards';
import OP03_CARDS from './op03-cards';
import OP04_CARDS from './op04-cards';
import OP05_CARDS from './op05-cards';
import OP06_CARDS from './op06-cards';
import OP07_CARDS from './op07-cards';
import OP08_CARDS from './op08-cards';
import OP09_CARDS from './op09-cards';
import OP10_CARDS from './op10-cards';
import OP11_CARDS from './op11-cards';
import OP12_CARDS from './op12-cards';
import OP13_CARDS from './op13-cards';
import OP14_CARDS from './op14-cards';
import EB01_CARDS from './eb01-cards';

export interface Card {
  id: string;
  name: string;
  set: string;
  setCode: string;
  number: string;
  type: string;
  color: string;
  rarity: string;
  cost?: number;
  power?: number;
  attribute?: string;
  imageUrl?: string;
}

export const SEED_CARDS: Card[] = [
  // OP01 - Romance Dawn (key cards)
  { id: "OP01-001", name: "Monkey D. Luffy", set: "Romance Dawn", setCode: "OP01", number: "001", type: "Leader", color: "Red", rarity: "L" },
  { id: "OP01-002", name: "Roronoa Zoro", set: "Romance Dawn", setCode: "OP01", number: "002", type: "Character", color: "Green", rarity: "SR", cost: 4, power: 5000 },
  { id: "OP01-003", name: "Nami", set: "Romance Dawn", setCode: "OP01", number: "003", type: "Character", color: "Green", rarity: "R", cost: 2, power: 2000 },
  { id: "OP01-004", name: "Usopp", set: "Romance Dawn", setCode: "OP01", number: "004", type: "Character", color: "Green", rarity: "UC", cost: 2, power: 1000 },
  { id: "OP01-005", name: "Sanji", set: "Romance Dawn", setCode: "OP01", number: "005", type: "Character", color: "Red", rarity: "SR", cost: 4, power: 6000 },
  { id: "OP01-006", name: "Tony Tony Chopper", set: "Romance Dawn", setCode: "OP01", number: "006", type: "Character", color: "Green", rarity: "R", cost: 1, power: 1000 },
  { id: "OP01-007", name: "Nico Robin", set: "Romance Dawn", setCode: "OP01", number: "007", type: "Character", color: "Purple", rarity: "R", cost: 3, power: 3000 },
  { id: "OP01-008", name: "Franky", set: "Romance Dawn", setCode: "OP01", number: "008", type: "Character", color: "Blue", rarity: "R", cost: 4, power: 5000 },
  { id: "OP01-009", name: "Brook", set: "Romance Dawn", setCode: "OP01", number: "009", type: "Character", color: "Black", rarity: "UC", cost: 3, power: 3000 },
  { id: "OP01-010", name: "Jinbe", set: "Romance Dawn", setCode: "OP01", number: "010", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 7000 },
  { id: "OP01-011", name: "Shanks", set: "Romance Dawn", setCode: "OP01", number: "011", type: "Character", color: "Red", rarity: "SR", cost: 9, power: 10000 },
  { id: "OP01-012", name: "Trafalgar Law", set: "Romance Dawn", setCode: "OP01", number: "012", type: "Character", color: "Blue", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP01-013", name: "Portgas D. Ace", set: "Romance Dawn", setCode: "OP01", number: "013", type: "Character", color: "Red", rarity: "SR", cost: 5, power: 6000 },
  { id: "OP01-014", name: "Whitebeard", set: "Romance Dawn", setCode: "OP01", number: "014", type: "Character", color: "Black", rarity: "SR", cost: 8, power: 10000 },
  { id: "OP01-015", name: "Crocodile", set: "Romance Dawn", setCode: "OP01", number: "015", type: "Character", color: "Purple", rarity: "R", cost: 4, power: 5000 },
  { id: "OP01-016", name: "Dracule Mihawk", set: "Romance Dawn", setCode: "OP01", number: "016", type: "Character", color: "Green", rarity: "SR", cost: 7, power: 9000 },
  { id: "OP01-017", name: "Boa Hancock", set: "Romance Dawn", setCode: "OP01", number: "017", type: "Character", color: "Black", rarity: "SR", cost: 6, power: 7000 },

  // All OP02-OP14 and EB01 cards
  ...OP02_CARDS,
  ...OP03_CARDS,
  ...OP04_CARDS,
  ...OP05_CARDS,
  ...OP06_CARDS,
  ...OP07_CARDS,
  ...OP08_CARDS,
  ...OP09_CARDS,
  ...OP10_CARDS,
  ...OP11_CARDS,
  ...OP12_CARDS,
  ...OP13_CARDS,
  ...OP14_CARDS,
  ...EB01_CARDS,
];

export function searchCards(query: string): Card[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEED_CARDS.slice(0, 12);

  // Score and rank results for premium accuracy
  const scored = SEED_CARDS.map((card) => {
    let score = 0;
    const nameLower = card.name.toLowerCase();
    const idLower = card.id.toLowerCase();
    const setCodeLower = card.setCode.toLowerCase();
    
    // Exact ID match (highest priority - user searching specific card)
    if (idLower === q) score += 1000;
    // ID starts with query (e.g., "OP07-" matches OP07 cards)
    else if (idLower.startsWith(q)) score += 500;
    // ID contains query
    else if (idLower.includes(q)) score += 300;
    
    // Exact name match
    if (nameLower === q) score += 900;
    // Name starts with query (e.g., "Luffy" matches "Luffy Gear 5")
    else if (nameLower.startsWith(q)) score += 400;
    // Word boundary match (e.g., "Zoro" matches "Roronoa Zoro")
    else if (nameLower.includes(` ${q}`) || nameLower.includes(`${q} `)) score += 350;
    // Name contains query
    else if (nameLower.includes(q)) score += 200;
    
    // Set code exact match
    if (setCodeLower === q) score += 100;
    // Set name contains query
    if (card.set.toLowerCase().includes(q)) score += 50;
    // Color match
    if (card.color.toLowerCase().includes(q)) score += 40;
    // Type match (Leader, Character, Event)
    if (card.type.toLowerCase().includes(q)) score += 30;
    
    return { card, score };
  });

  // Filter to only results with a score, sort by score (highest first)
  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);

  // Remove duplicates by card ID (keep highest scored)
  const seen = new Set<string>();
  const unique = results.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });

  return unique;
}

// Advanced search with filters for premium experience
export function advancedSearch(params: {
  query?: string;
  setCode?: string;
  color?: string;
  type?: string;
  rarity?: string;
  minCost?: number;
  maxCost?: number;
}): Card[] {
  let results = SEED_CARDS;

  if (params.query) {
    results = searchCards(params.query);
  }

  return results.filter((card) => {
    if (params.setCode && !card.setCode.toLowerCase().includes(params.setCode.toLowerCase())) return false;
    if (params.color && !card.color.toLowerCase().includes(params.color.toLowerCase())) return false;
    if (params.type && !card.type.toLowerCase().includes(params.type.toLowerCase())) return false;
    if (params.rarity && !card.rarity.toLowerCase().includes(params.rarity.toLowerCase())) return false;
    if (params.minCost !== undefined && (card.cost === undefined || card.cost < params.minCost)) return false;
    if (params.maxCost !== undefined && (card.cost === undefined || card.cost > params.maxCost)) return false;
    return true;
  });
}

// Get exact card match or suggestions
export function findCardExact(query: string): Card | null {
  const q = query.toLowerCase().trim();
  
  // Try exact ID match first
  const exactId = SEED_CARDS.find((c) => c.id.toLowerCase() === q);
  if (exactId) return exactId;
  
  // Try exact name match
  const exactName = SEED_CARDS.find((c) => c.name.toLowerCase() === q);
  if (exactName) return exactName;
  
  return null;
}

export function getCardById(id: string): Card | undefined {
  return SEED_CARDS.find((c) => c.id === id);
}

export function getCardsBySet(setCode: string): Card[] {
  return SEED_CARDS.filter((c) => c.setCode === setCode);
}

export const SETS = [
  { code: "OP01", name: "Romance Dawn" },
  { code: "OP02", name: "Paramount War" },
  { code: "OP03", name: "Pillars of Strength" },
  { code: "OP04", name: "Kingdoms of Intrigue" },
  { code: "OP05", name: "Awakening of the New Era" },
  { code: "OP06", name: "Wings of the Captain" },
  { code: "OP07", name: "500 Years in the Future" },
  { code: "OP08", name: "Two Legends" },
  { code: "OP09", name: "Emperors in the New World" },
  { code: "OP10", name: "Royal Blood" },
  { code: "OP11", name: "A Fist of Divine Speed" },
  { code: "OP12", name: "The Three Captains" },
  { code: "OP13", name: "The Golden City" },
  { code: "OP14", name: "The Four Emperors" },
  { code: "EB01", name: "Memorial Collection" },
];

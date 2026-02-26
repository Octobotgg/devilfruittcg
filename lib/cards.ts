import OP01_CARDS from './op01-cards';
import OP02_CARDS from './op02-cards';
import OP03_CARDS from './op03-cards';
import OP04_CARDS from './op04-cards';
import OP05_CARDS from './op05-cards';
import OP06_CARDS from './op06-cards';
import OP07_CARDS from './op07-cards';
import OP08_CARDS from './op08-cards';
import OP09_CARDS from './op09-cards';
import OP10_CARDS from './op10-cards';
import EB01_CARDS from './eb01-cards';
import EB02_CARDS from './eb02-cards';
import ST01_CARDS from './st01-cards';
import ST02_CARDS from './st02-cards';
import ST03_CARDS from './st03-cards';
import ST04_CARDS from './st04-cards';
import ST05_CARDS from './st05-cards';
import ST06_CARDS from './st06-cards';
import ST07_CARDS from './st07-cards';
import ST08_CARDS from './st08-cards';
import ST09_CARDS from './st09-cards';
import ST10_CARDS from './st10-cards';
import ST11_CARDS from './st11-cards';
import ST12_CARDS from './st12-cards';
import ST13_CARDS from './st13-cards';
import ST14_CARDS from './st14-cards';
import ST15_CARDS from './st15-cards';
import ST16_CARDS from './st16-cards';
import ST17_CARDS from './st17-cards';
import ST18_CARDS from './st18-cards';
import ST19_CARDS from './st19-cards';
import ST20_CARDS from './st20-cards';
import ST21_CARDS from './st21-cards';

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
  ...OP01_CARDS,
  ...OP02_CARDS,
  ...OP03_CARDS,
  ...OP04_CARDS,
  ...OP05_CARDS,
  ...OP06_CARDS,
  ...OP07_CARDS,
  ...OP08_CARDS,
  ...OP09_CARDS,
  ...OP10_CARDS,
  ...EB01_CARDS,
  ...EB02_CARDS,
  ...ST01_CARDS,
  ...ST02_CARDS,
  ...ST03_CARDS,
  ...ST04_CARDS,
  ...ST05_CARDS,
  ...ST06_CARDS,
  ...ST07_CARDS,
  ...ST08_CARDS,
  ...ST09_CARDS,
  ...ST10_CARDS,
  ...ST11_CARDS,
  ...ST12_CARDS,
  ...ST13_CARDS,
  ...ST14_CARDS,
  ...ST15_CARDS,
  ...ST16_CARDS,
  ...ST17_CARDS,
  ...ST18_CARDS,
  ...ST19_CARDS,
  ...ST20_CARDS,
  ...ST21_CARDS,
];

export function searchCards(query: string): Card[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEED_CARDS.slice(0, 12);

  const scored = SEED_CARDS.map((card) => {
    let score = 0;
    const nameLower = card.name.toLowerCase();
    const idLower = card.id.toLowerCase();
    const setCodeLower = card.setCode.toLowerCase();

    if (idLower === q) score += 1000;
    else if (idLower.startsWith(q)) score += 500;
    else if (idLower.includes(q)) score += 300;

    if (nameLower === q) score += 900;
    else if (nameLower.startsWith(q)) score += 400;
    else if (nameLower.includes(` ${q}`) || nameLower.includes(`${q} `)) score += 350;
    else if (nameLower.includes(q)) score += 200;

    if (setCodeLower === q) score += 100;
    if (card.set.toLowerCase().includes(q)) score += 50;
    if (card.color.toLowerCase().includes(q)) score += 40;
    if (card.type.toLowerCase().includes(q)) score += 30;

    return { card, score };
  });

  const results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);

  const seen = new Set<string>();
  return results.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
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

export function findCardExact(query: string): Card | null {
  const q = query.toLowerCase().trim();
  const exactId = SEED_CARDS.find((c) => c.id.toLowerCase() === q);
  if (exactId) return exactId;
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
  { code: "EB01", name: "Memorial Collection" },
  { code: "EB02", name: "Anime 25th Collection" },
  { code: "ST01", name: "Straw Hat Crew" },
  { code: "ST02", name: "Worst Generation" },
  { code: "ST03", name: "The Seven Warlords of the Sea" },
  { code: "ST04", name: "Animal Kingdom Pirates" },
  { code: "ST05", name: "ONE PIECE FILM edition" },
  { code: "ST06", name: "Absolute Justice" },
  { code: "ST07", name: "Big Mom Pirates" },
  { code: "ST08", name: "Monkey D. Luffy" },
  { code: "ST09", name: "Yamato" },
  { code: "ST10", name: "The Three Captains" },
  { code: "ST11", name: "Uta" },
  { code: "ST12", name: "Zoro and Sanji" },
  { code: "ST13", name: "The Three Brothers" },
  { code: "ST14", name: "3D2Y" },
  { code: "ST15", name: "Red Edward Newgate" },
  { code: "ST16", name: "Green Uta" },
  { code: "ST17", name: "Blue Donquixote Doflamingo" },
  { code: "ST18", name: "Purple Monkey D. Luffy" },
  { code: "ST19", name: "Black Smoker" },
  { code: "ST20", name: "Yellow Charlotte Katakuri" },
  { code: "ST21", name: "GEAR5" },
];

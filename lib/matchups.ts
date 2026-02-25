// Matchup data seeded from community tournament results + OPTCG Sim stats
// Win rates represent: [this deck] vs [opponent deck]
// Values = win percentage for the row deck

export interface DeckProfile {
  id: string;
  name: string;
  leader: string;
  color: string;
  tier: "S" | "A" | "B" | "C";
  winRate: number;    // overall tournament win %
  popularity: number; // % of tournament field
  trend: "up" | "down" | "flat";
  cardId: string;     // leader card ID for image
  style: string;      // playstyle description
}

export const DECKS: DeckProfile[] = [
  { id: "luffy-gear5",    name: "Luffy Gear 5",    leader: "Monkey D. Luffy (Gear 5)", color: "Red",         tier: "S", winRate: 57.4, popularity: 21.2, trend: "up",   cardId: "OP07-001", style: "Aggressive rush" },
  { id: "blackbeard",     name: "Blackbeard",       leader: "Marshall D. Teach",        color: "Black/Yellow", tier: "S", winRate: 55.8, popularity: 17.4, trend: "up",   cardId: "OP08-001", style: "Control + board wipe" },
  { id: "enel",           name: "Enel",             leader: "Enel",                     color: "Yellow",       tier: "A", winRate: 53.1, popularity: 13.8, trend: "flat", cardId: "OP05-001", style: "Life manipulation" },
  { id: "shanks",         name: "Shanks",           leader: "Shanks",                   color: "Red",          tier: "A", winRate: 51.6, popularity: 11.5, trend: "down", cardId: "OP05-002", style: "Tempo aggro" },
  { id: "katakuri",       name: "Katakuri",         leader: "Charlotte Katakuri",        color: "Black",        tier: "A", winRate: 50.9, popularity: 9.3,  trend: "flat", cardId: "OP04-003", style: "Midrange control" },
  { id: "kaido",          name: "Kaido",            leader: "Kaido",                    color: "Purple",       tier: "A", winRate: 50.2, popularity: 8.7,  trend: "down", cardId: "OP04-001", style: "Big body beatdown" },
  { id: "big-mom",        name: "Big Mom",          leader: "Charlotte Linlin",          color: "Black",        tier: "B", winRate: 48.5, popularity: 7.4,  trend: "down", cardId: "OP04-002", style: "Removal heavy" },
  { id: "law",            name: "Law",              leader: "Trafalgar Law",             color: "Blue",         tier: "B", winRate: 47.8, popularity: 5.9,  trend: "flat", cardId: "OP02-001", style: "Counter + bounce" },
  { id: "bonney",         name: "Bonney",           leader: "Jewelry Bonney",            color: "Purple",       tier: "B", winRate: 46.3, popularity: 2.8,  trend: "up",   cardId: "OP07-002", style: "Toolbox" },
  { id: "garp",           name: "Garp",             leader: "Monkey D. Garp",            color: "Blue",         tier: "C", winRate: 44.7, popularity: 2.0,  trend: "down", cardId: "OP06-001", style: "Blocker wall" },
];

// Matchup matrix: MATCHUPS[deckId][opponentId] = win %
// Above 50 = favorable, below 50 = unfavorable
export const MATCHUPS: Record<string, Record<string, number>> = {
  "luffy-gear5": {
    "luffy-gear5": 50,
    "blackbeard":  44,
    "enel":        58,
    "shanks":      52,
    "katakuri":    55,
    "kaido":       61,
    "big-mom":     63,
    "law":         67,
    "bonney":      59,
    "garp":        71,
  },
  "blackbeard": {
    "luffy-gear5": 56,
    "blackbeard":  50,
    "enel":        53,
    "shanks":      57,
    "katakuri":    52,
    "kaido":       55,
    "big-mom":     58,
    "law":         61,
    "bonney":      54,
    "garp":        65,
  },
  "enel": {
    "luffy-gear5": 42,
    "blackbeard":  47,
    "enel":        50,
    "shanks":      49,
    "katakuri":    51,
    "kaido":       55,
    "big-mom":     60,
    "law":         56,
    "bonney":      52,
    "garp":        63,
  },
  "shanks": {
    "luffy-gear5": 48,
    "blackbeard":  43,
    "enel":        51,
    "shanks":      50,
    "katakuri":    54,
    "kaido":       57,
    "big-mom":     55,
    "law":         62,
    "bonney":      56,
    "garp":        68,
  },
  "katakuri": {
    "luffy-gear5": 45,
    "blackbeard":  48,
    "enel":        49,
    "shanks":      46,
    "katakuri":    50,
    "kaido":       52,
    "big-mom":     54,
    "law":         57,
    "bonney":      51,
    "garp":        60,
  },
  "kaido": {
    "luffy-gear5": 39,
    "blackbeard":  45,
    "enel":        45,
    "shanks":      43,
    "katakuri":    48,
    "kaido":       50,
    "big-mom":     53,
    "law":         55,
    "bonney":      49,
    "garp":        58,
  },
  "big-mom": {
    "luffy-gear5": 37,
    "blackbeard":  42,
    "enel":        40,
    "shanks":      45,
    "katakuri":    46,
    "kaido":       47,
    "big-mom":     50,
    "law":         52,
    "bonney":      48,
    "garp":        56,
  },
  "law": {
    "luffy-gear5": 33,
    "blackbeard":  39,
    "enel":        44,
    "shanks":      38,
    "katakuri":    43,
    "kaido":       45,
    "big-mom":     48,
    "law":         50,
    "bonney":      46,
    "garp":        54,
  },
  "bonney": {
    "luffy-gear5": 41,
    "blackbeard":  46,
    "enel":        48,
    "shanks":      44,
    "katakuri":    49,
    "kaido":       51,
    "big-mom":     52,
    "law":         54,
    "bonney":      50,
    "garp":        57,
  },
  "garp": {
    "luffy-gear5": 29,
    "blackbeard":  35,
    "enel":        37,
    "shanks":      32,
    "katakuri":    40,
    "kaido":       42,
    "big-mom":     44,
    "law":         46,
    "bonney":      43,
    "garp":        50,
  },
};

export function getWinRate(deckId: string, opponentId: string): number {
  return MATCHUPS[deckId]?.[opponentId] ?? 50;
}

export function getBestMatchups(deckId: string): DeckProfile[] {
  return DECKS
    .filter(d => d.id !== deckId)
    .sort((a, b) => getWinRate(deckId, b.id) - getWinRate(deckId, a.id))
    .slice(0, 3);
}

export function getWorstMatchups(deckId: string): DeckProfile[] {
  return DECKS
    .filter(d => d.id !== deckId)
    .sort((a, b) => getWinRate(deckId, a.id) - getWinRate(deckId, b.id))
    .slice(0, 3);
}

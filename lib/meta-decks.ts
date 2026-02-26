// Meta deck data based on current OPTCG meta (EB04 format)
// Data structure inspired by gumgum.gg meta rankings

export interface MetaDeck {
  id: string;
  name: string;
  leader: string;
  cardId: string; // For image lookup
  color: string;
  tier: "S" | "A" | "B" | "C" | "D";
  metaShare: number; // Percentage of tournament field
  winRate: number; // Overall tournament win rate
  trend: "up" | "down" | "stable";
  matchups: Record<string, number>; // win rates vs other decks
  description?: string;
}

// Current meta (EB04 format) - Top decks
export const META_DECKS: MetaDeck[] = [
  {
    id: "rebecca",
    name: "Rebecca",
    leader: "Rebecca",
    cardId: "OP10-003",
    color: "Blue",
    tier: "S",
    metaShare: 15.2,
    winRate: 56.8,
    trend: "up",
    description: "Counter-based control with powerful removal",
    matchups: {
      "rebecca": 50, "doflamingo": 55, "whitebeard": 58, "kaido": 52,
      "luffy-st14": 54, "blackbeard": 48, "yamato": 60, "enel": 62,
      "shanks": 51, "katakuri": 53, "law": 57, "gear5": 49,
    }
  },
  {
    id: "doflamingo",
    name: "Doflamingo (OP10)",
    leader: "Donquixote Doflamingo",
    cardId: "OP10-005",
    color: "Purple",
    tier: "S",
    metaShare: 12.8,
    winRate: 55.4,
    trend: "stable",
    description: "Aggressive purple with powerful events",
    matchups: {
      "rebecca": 45, "doflamingo": 50, "whitebeard": 53, "kaido": 55,
      "luffy-st14": 52, "blackbeard": 51, "yamato": 54, "enel": 48,
      "shanks": 56, "katakuri": 58, "law": 60, "gear5": 57,
    }
  },
  {
    id: "whitebeard",
    name: "Whitebeard (OP02)",
    leader: "Edward Newgate",
    cardId: "OP02-002",
    color: "Black",
    tier: "A",
    metaShare: 10.5,
    winRate: 53.2,
    trend: "stable",
    description: "Tanky black deck with powerful characters",
    matchups: {
      "rebecca": 42, "doflamingo": 47, "whitebeard": 50, "kaido": 48,
      "luffy-st14": 54, "blackbeard": 46, "yamato": 52, "enel": 55,
      "shanks": 50, "katakuri": 51, "law": 53, "gear5": 49,
    }
  },
  {
    id: "kaido",
    name: "Kaido (OP09)",
    leader: "Kaido",
    cardId: "OP09-004",
    color: "Purple/Black",
    tier: "A",
    metaShare: 9.3,
    winRate: 52.8,
    trend: "down",
    description: "Two-color powerhouse with big bodies",
    matchups: {
      "rebecca": 48, "doflamingo": 45, "whitebeard": 52, "kaido": 50,
      "luffy-st14": 51, "blackbeard": 49, "yamato": 47, "enel": 44,
      "shanks": 53, "katakuri": 55, "law": 56, "gear5": 54,
    }
  },
  {
    id: "luffy-st14",
    name: "Luffy (ST14)",
    leader: "Monkey D. Luffy",
    cardId: "ST14-001",
    color: "Red/Purple",
    tier: "A",
    metaShare: 8.7,
    winRate: 51.9,
    trend: "up",
    description: "Aggressive rushdown with high power",
    matchups: {
      "rebecca": 46, "doflamingo": 48, "whitebeard": 46, "kaido": 49,
      "luffy-st14": 50, "blackbeard": 52, "yamato": 55, "enel": 58,
      "shanks": 47, "katakuri": 50, "law": 54, "gear5": 53,
    }
  },
  {
    id: "blackbeard",
    name: "Blackbeard (OP09)",
    leader: "Marshall D. Teach",
    cardId: "OP09-001",
    color: "Black/Purple",
    tier: "A",
    metaShare: 7.9,
    winRate: 51.4,
    trend: "stable",
    description: "Control deck with powerful negation",
    matchups: {
      "rebecca": 52, "doflamingo": 49, "whitebeard": 54, "kaido": 51,
      "luffy-st14": 48, "blackbeard": 50, "yamato": 53, "enel": 50,
      "shanks": 55, "katakuri": 57, "law": 58, "gear5": 56,
    }
  },
  {
    id: "yamato",
    name: "Yamato (OP06)",
    leader: "Yamato",
    cardId: "OP06-022",
    color: "Purple",
    tier: "B",
    metaShare: 6.4,
    winRate: 49.8,
    trend: "down",
    description: "Purple midrange with versatile options",
    matchups: {
      "rebecca": 40, "doflamingo": 46, "whitebeard": 48, "kaido": 53,
      "luffy-st14": 45, "blackbeard": 47, "yamato": 50, "enel": 52,
      "shanks": 49, "katakuri": 51, "law": 50, "gear5": 48,
    }
  },
  {
    id: "enel",
    name: "Enel (OP05)",
    leader: "Enel",
    cardId: "OP05-001",
    color: "Yellow",
    tier: "B",
    metaShare: 5.8,
    winRate: 48.9,
    trend: "down",
    description: "Life manipulation with powerful effects",
    matchups: {
      "rebecca": 38, "doflamingo": 52, "whitebeard": 45, "kaido": 56,
      "luffy-st14": 42, "blackbeard": 50, "yamato": 48, "enel": 50,
      "shanks": 47, "katakuri": 49, "law": 46, "gear5": 44,
    }
  },
  {
    id: "shanks",
    name: "Shanks (OP09)",
    leader: "Shanks",
    cardId: "OP09-006",
    color: "Red",
    tier: "B",
    metaShare: 5.2,
    winRate: 48.2,
    trend: "stable",
    description: "Red aggro with hand disruption",
    matchups: {
      "rebecca": 49, "doflamingo": 44, "whitebeard": 50, "kaido": 47,
      "luffy-st14": 53, "blackbeard": 45, "yamato": 51, "enel": 53,
      "shanks": 50, "katakuri": 48, "law": 52, "gear5": 55,
    }
  },
  {
    id: "katakuri",
    name: "Katakuri (OP03)",
    leader: "Charlotte Katakuri",
    cardId: "OP03-099",
    color: "Black",
    tier: "B",
    metaShare: 4.6,
    winRate: 47.5,
    trend: "down",
    description: "Black control with powerful blockers",
    matchups: {
      "rebecca": 47, "doflamingo": 42, "whitebeard": 49, "kaido": 45,
      "luffy-st14": 50, "blackbeard": 43, "yamato": 49, "enel": 51,
      "shanks": 52, "katakuri": 50, "law": 48, "gear5": 46,
    }
  },
  {
    id: "law",
    name: "Law (OP09)",
    leader: "Trafalgar Law",
    cardId: "OP09-002",
    color: "Blue/Black",
    tier: "C",
    metaShare: 3.8,
    winRate: 46.1,
    trend: "stable",
    description: "Two-color counter and bounce strategy",
    matchups: {
      "rebecca": 43, "doflamingo": 40, "whitebeard": 47, "kaido": 44,
      "luffy-st14": 46, "blackbeard": 42, "yamato": 50, "enel": 54,
      "shanks": 48, "katakuri": 52, "law": 50, "gear5": 49,
    }
  },
  {
    id: "gear5",
    name: "Gear 5 Luffy (OP07)",
    leader: "Monkey D. Luffy (Gear 5)",
    cardId: "OP07-001",
    color: "Red/Purple",
    tier: "C",
    metaShare: 3.2,
    winRate: 45.3,
    trend: "down",
    description: "High power Gear 5 with awakening",
    matchups: {
      "rebecca": 51, "doflamingo": 43, "whitebeard": 51, "kaido": 46,
      "luffy-st14": 47, "blackbeard": 44, "yamato": 52, "enel": 56,
      "shanks": 45, "katakuri": 54, "law": 51, "gear5": 50,
    }
  },
];

// Get deck by ID
export function getDeckById(id: string): MetaDeck | undefined {
  return META_DECKS.find(d => d.id === id);
}

// Get matchup win rate
export function getMatchup(deckId: string, opponentId: string): number {
  const deck = getDeckById(deckId);
  if (!deck) return 50;
  return deck.matchups[opponentId] ?? 50;
}

// Get best matchups for a deck
export function getBestMatchups(deckId: string): { deck: MetaDeck; winRate: number }[] {
  const deck = getDeckById(deckId);
  if (!deck) return [];
  
  return META_DECKS
    .filter(d => d.id !== deckId)
    .map(d => ({ deck: d, winRate: deck.matchups[d.id] ?? 50 }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3);
}

// Get worst matchups for a deck
export function getWorstMatchups(deckId: string): { deck: MetaDeck; winRate: number }[] {
  const deck = getDeckById(deckId);
  if (!deck) return [];
  
  return META_DECKS
    .filter(d => d.id !== deckId)
    .map(d => ({ deck: d, winRate: deck.matchups[d.id] ?? 50 }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);
}

// Tier colors
export const TIER_COLORS: Record<string, string> = {
  S: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  A: "bg-blue-400/20 text-blue-400 border-blue-400/30",
  B: "bg-purple-400/20 text-purple-400 border-purple-400/30",
  C: "bg-green-400/20 text-green-400 border-green-400/30",
  D: "bg-white/10 text-white/40 border-white/20",
};

// Trend icons
export const TREND_ICONS = {
  up: "▲",
  down: "▼",
  stable: "—",
};

export const TREND_COLORS = {
  up: "text-green-400",
  down: "text-red-400",
  stable: "text-white/40",
};

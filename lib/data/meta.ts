import { DECKS as SEEDED_DECKS, MATCHUPS as SEEDED_MATCHUPS, DeckProfile } from "../matchups";

export interface MetaDeck {
  rank: number;
  name: string;
  tier: "S" | "A" | "B" | "C";
  color: string;
  winRate: number;
  popularity: number;
  trend: "▲" | "▼" | "—";
}

export interface RegionStat {
  region: string;
  events: number;
  players: number;
}

export interface MetaSnapshot {
  updatedAt: string;
  source: string;
  sources?: string[];
  sampleGames?: number;
  metaDecks: MetaDeck[];
  regions: RegionStat[];
  decks: DeckProfile[];
  matchups: Record<string, Record<string, number>>;
}

export function getSeededMeta(): MetaSnapshot {
  const metaDecks: MetaDeck[] = [
    { rank: 1, name: "Luffy Gear 5 (OP07)", tier: "S", color: "Red", winRate: 58, popularity: 22, trend: "▲" },
    { rank: 2, name: "Blackbeard (OP08)", tier: "S", color: "Black/Yellow", winRate: 56, popularity: 18, trend: "▲" },
    { rank: 3, name: "Enel (OP05)", tier: "A", color: "Yellow", winRate: 53, popularity: 14, trend: "—" },
    { rank: 4, name: "Shanks (OP05)", tier: "A", color: "Red", winRate: 51, popularity: 12, trend: "▼" },
    { rank: 5, name: "Kaido (OP04)", tier: "A", color: "Purple", winRate: 50, popularity: 10, trend: "—" },
    { rank: 6, name: "Big Mom (OP04)", tier: "B", color: "Black", winRate: 48, popularity: 9, trend: "▼" },
    { rank: 7, name: "Law (OP02)", tier: "B", color: "Blue", winRate: 47, popularity: 8, trend: "—" },
    { rank: 8, name: "Zoro (OP01)", tier: "C", color: "Green", winRate: 44, popularity: 7, trend: "▼" },
  ];

  const regions: RegionStat[] = [
    { region: "NA", events: 12, players: 880 },
    { region: "EU", events: 10, players: 760 },
    { region: "APAC", events: 8, players: 620 },
  ];

  return {
    updatedAt: new Date().toISOString(),
    source: "seeded",
    metaDecks,
    regions,
    decks: SEEDED_DECKS,
    matchups: SEEDED_MATCHUPS,
  };
}

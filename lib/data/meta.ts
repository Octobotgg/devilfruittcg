import { DECKS as SEEDED_DECKS, MATCHUPS as SEEDED_MATCHUPS, DeckProfile } from "../matchups";

export interface MetaDeck {
  rank: number;
  name: string;
  tier: "S" | "A" | "B" | "C";
  color: string;
  winRate: number | null;
  popularity: number;
  trend: "▲" | "▼" | "—";
  cardId?: string;
  deckId?: string;
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

function tierFromRank(rank: number): "S" | "A" | "B" | "C" {
  if (rank <= 3) return "S";
  if (rank <= 6) return "A";
  if (rank <= 10) return "B";
  return "C";
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const REGION_LABEL: Record<string, string> = {
  global: "Global",
  na: "North America",
  eu: "Europe",
  la: "Latin America",
  oc: "Oceania",
  asia: "Asia",
};

/**
 * Live tournament aggregate from Limitless One Piece decks page
 * Supports filters: format (OP14...) and region (na/eu/la/oc/asia)
 */
export async function getLiveMeta(opts?: { format?: string; region?: string }): Promise<MetaSnapshot> {
  const format = (opts?.format || "OP14").toUpperCase();
  const region = (opts?.region || "global").toLowerCase();

  const params = new URLSearchParams();
  params.set("format", format);
  if (region !== "global") params.set("region", region);

  const url = `https://onepiece.limitlesstcg.com/decks?${params.toString()}`;
  const html = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    cache: "no-store",
  }).then((r) => r.text());

  const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
  const metaDecks: MetaDeck[] = [];

  for (const row of rows) {
    const rankMatch = row.match(/<td>(\d+)<\/td>/i);
    if (!rankMatch) continue;

    const rank = Number(rankMatch[1]);

    const colorMatch = row.match(/<span class="sm-only">([^<]+)<\/span>/i);
    const color = colorMatch ? cleanHtml(colorMatch[1]) : "Mixed";

    const nameMatch = row.match(/<span>([^<]+)<\/span>\s*<\/a>/i);
    const name = nameMatch ? cleanHtml(nameMatch[1]) : "Unknown";

    const shareMatch = row.match(/<td>([\d.]+)%<\/td>/i);
    const popularity = shareMatch ? Number(shareMatch[1]) : 0;

    const cardIdMatch = row.match(/one-piece\/[A-Z0-9]+\/([A-Z0-9-]+)_EN\.webp/i);
    const cardId = cardIdMatch?.[1];
    const deckIdMatch = row.match(/href="\/decks\/(\d+)"/i);
    const deckId = deckIdMatch?.[1];

    metaDecks.push({
      rank,
      name,
      tier: tierFromRank(rank),
      color,
      winRate: null,
      popularity,
      trend: "—",
      cardId,
      deckId,
    });
  }

  if (!metaDecks.length) {
    throw new Error("No live meta rows parsed");
  }

  return {
    updatedAt: new Date().toISOString(),
    source: `live:tournament-aggregate:${format}:${region}`,
    sources: ["tournament-aggregate"],
    metaDecks: metaDecks.slice(0, 15),
    regions: [
      {
        region: REGION_LABEL[region] || region.toUpperCase(),
        events: 0,
        players: 0,
      },
    ],
    decks: SEEDED_DECKS,
    matchups: SEEDED_MATCHUPS,
  };
}

export function getSeededMeta(): MetaSnapshot {
  const metaDecks: MetaDeck[] = [
    { rank: 1, name: "Luffy Gear 5 (OP07)", tier: "S", color: "Red", winRate: 58, popularity: 22, trend: "▲", cardId: "OP07-001" },
    { rank: 2, name: "Blackbeard (OP08)", tier: "S", color: "Black/Yellow", winRate: 56, popularity: 18, trend: "▲", cardId: "OP09-001" },
    { rank: 3, name: "Enel (OP05)", tier: "A", color: "Yellow", winRate: 53, popularity: 14, trend: "—", cardId: "OP05-001" },
    { rank: 4, name: "Shanks (OP05)", tier: "A", color: "Red", winRate: 51, popularity: 12, trend: "▼", cardId: "OP09-006" },
    { rank: 5, name: "Kaido (OP04)", tier: "A", color: "Purple", winRate: 50, popularity: 10, trend: "—", cardId: "OP09-004" },
    { rank: 6, name: "Big Mom (OP04)", tier: "B", color: "Black", winRate: 48, popularity: 9, trend: "▼", cardId: "OP03-099" },
    { rank: 7, name: "Law (OP02)", tier: "B", color: "Blue", winRate: 47, popularity: 8, trend: "—", cardId: "OP09-002" },
    { rank: 8, name: "Zoro (OP01)", tier: "C", color: "Green", winRate: 44, popularity: 7, trend: "▼", cardId: "OP12-020" },
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

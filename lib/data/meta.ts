import { DECKS as SEEDED_DECKS, MATCHUPS as SEEDED_MATCHUPS, DeckProfile } from "../matchups";

export interface MetaDeck {
  rank: number;
  name: string;
  tier: "S" | "A" | "B" | "C";
  color: string;
  winRate: number | null;
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

  const rowRegex = /<tr>\s*<td>(\d+)<\/td>[\s\S]*?<a class="deck-link"[^>]*>[\s\S]*?<span class="sm-only">([^<]+)<\/span>[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<\/a>[\s\S]*?<td>([\d,]+)<\/td>[\s\S]*?<td>([\d.]+)%<\/td>[\s\S]*?<\/tr>/gi;

  const metaDecks: MetaDeck[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const rank = Number(m[1]);
    const color = cleanHtml(m[2]);
    const name = cleanHtml(m[3]);
    const popularity = Number(m[5]);

    metaDecks.push({
      rank,
      name,
      tier: tierFromRank(rank),
      color,
      // Source page provides points/share but not win-rate directly
      winRate: null,
      popularity,
      trend: "—",
    });
  }

  if (!metaDecks.length) {
    throw new Error("No live meta rows parsed");
  }

  return {
    updatedAt: new Date().toISOString(),
    source: `live:limitless:${format}:${region}`,
    sources: [url],
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

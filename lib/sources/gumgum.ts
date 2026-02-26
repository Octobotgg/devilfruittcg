import type { MetaDeck } from "@/lib/data/meta";

export interface GumGumMeta {
  source: string;
  fetchedAt: string;
  metaDecks: MetaDeck[];
}

function assignTier(rank: number): MetaDeck["tier"] {
  if (rank <= 2) return "S";
  if (rank <= 5) return "A";
  if (rank <= 8) return "B";
  return "C";
}

function inferColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("sakazuki") || n.includes("moria") || n.includes("lucci") || n.includes("rebecca")) return "Black";
  if (n.includes("enel") || n.includes("katakuri") || n.includes("linlin")) return "Yellow";
  if (n.includes("doflamingo") || n.includes("law") || n.includes("uta")) return "Blue";
  if (n.includes("luffy") || n.includes("zoro") || n.includes("ace") || n.includes("shanks")) return "Red";
  if (n.includes("kid") || n.includes("bonney") || n.includes("yamato")) return "Green";
  if (n.includes("kaido") || n.includes("queen") || n.includes("king")) return "Purple";
  return "Mixed";
}

export async function fetchGumGumMetaDecks(): Promise<GumGumMeta | null> {
  const url = "https://gumgum.gg/tier-list";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;

  const html = await res.text();

  // Deck block pattern embedded in hydration payload
  const deckRe = /\\"([A-Z0-9]{2,4}-\d{3}) ([^\\"]+)\\":\{\\"leader\\":\\"([^\\"]+)\\",\\"id\\":\\"([A-Z0-9-]+)\\",\\"variant\\":\\"([^\\"]+)\\",\\"data\\":\{\\"wins\\":(\d+),\\"losses\\":(\d+)/g;

  const byId = new Map<string, { id: string; leader: string; variant: string; wins: number; losses: number }>();
  let m: RegExpExecArray | null;

  while ((m = deckRe.exec(html))) {
    const id = m[4];
    const leader = m[3];
    const variant = m[5];
    const wins = Number(m[6]);
    const losses = Number(m[7]);

    // Keep highest sample if duplicate appears
    const prev = byId.get(id);
    if (!prev || wins + losses > prev.wins + prev.losses) {
      byId.set(id, { id, leader, variant, wins, losses });
    }
  }

  const rows = [...byId.values()]
    .filter((r) => r.wins + r.losses >= 100)
    .map((r) => {
      const games = r.wins + r.losses;
      const winRate = Math.round((r.wins / games) * 1000) / 10;
      return {
        ...r,
        games,
        winRate,
      };
    });

  if (!rows.length) return null;

  const totalGames = rows.reduce((s, r) => s + r.games, 0);

  rows.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.games - a.games;
  });

  const top = rows.slice(0, 12);

  const metaDecks: MetaDeck[] = top.map((r, i) => {
    const rank = i + 1;
    const popularity = Math.round(((r.games / totalGames) * 100) * 10) / 10;
    const variantLabel = r.variant && r.variant !== "default" ? `: ${r.variant}` : "";
    return {
      rank,
      name: `${r.leader}${variantLabel} (${r.id})`,
      tier: assignTier(rank),
      color: inferColor(r.leader),
      winRate: r.winRate,
      popularity,
      trend: "—",
    };
  });

  return {
    source: "gumgum.gg/tier-list",
    fetchedAt: new Date().toISOString(),
    metaDecks,
  };
}

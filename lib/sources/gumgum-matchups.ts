import type { MetaDeck } from "@/lib/meta-decks";

interface RawDeck {
  keyId: string;
  keyName: string;
  leader: string;
  cardId: string;
  variant: string;
  wins: number;
  losses: number;
  vs: Record<string, { wins: number; losses: number }>;
}

const URL = "https://gumgum.gg/tier-list";

const TOP_RE = /\\"([A-Z0-9]{2,5}-\d{3}) ([^\\"]+)\\":\{\\"leader\\":\\"([^\\"]+)\\",\\"id\\":\\"([A-Z0-9-]+)\\",\\"variant\\":\\"([^\\"]+)\\",\\"data\\":\{\\"wins\\":(\d+),\\"losses\\":(\d+),\\"vs\\":\{/g;
const VS_RE = /\\"([A-Z0-9]{2,5}-\d{3}) ([^\\"]+)\\":\{\\"wins\\":(\d+),\\"losses\\":(\d+)/g;

function inferColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("sakazuki") || n.includes("moria") || n.includes("lucci") || n.includes("rebecca")) return "Black";
  if (n.includes("enel") || n.includes("katakuri") || n.includes("linlin")) return "Yellow";
  if (n.includes("doflamingo") || n.includes("law") || n.includes("uta")) return "Blue";
  if (n.includes("luffy") || n.includes("zoro") || n.includes("ace") || n.includes("shanks") || n.includes("newgate")) return "Red";
  if (n.includes("kid") || n.includes("bonney") || n.includes("yamato")) return "Green";
  if (n.includes("kaido") || n.includes("queen") || n.includes("king")) return "Purple";
  return "Mixed";
}

function tierByRank(rank: number): MetaDeck["tier"] {
  if (rank <= 2) return "S";
  if (rank <= 5) return "A";
  if (rank <= 9) return "B";
  return "C";
}

function trendByWinRate(rate: number): MetaDeck["trend"] {
  if (rate >= 53) return "up";
  if (rate <= 48) return "down";
  return "stable";
}

export async function fetchGumGumMatchups(limit = 12): Promise<MetaDeck[] | null> {
  const res = await fetch(URL, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;

  const html = await res.text();

  const starts: Array<{ idx: number; m: RegExpExecArray }> = [];
  let m: RegExpExecArray | null;
  while ((m = TOP_RE.exec(html))) starts.push({ idx: m.index, m });
  if (!starts.length) return null;

  const rawDecks: RawDeck[] = [];

  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i].m;
    const start = starts[i].idx;
    const end = i + 1 < starts.length ? starts[i + 1].idx : html.length;
    const segment = html.slice(start, end);

    const vs: RawDeck["vs"] = {};
    let vm: RegExpExecArray | null;
    while ((vm = VS_RE.exec(segment))) {
      const oppId = vm[1].toUpperCase();
      const wins = Number(vm[3]);
      const losses = Number(vm[4]);
      if (wins + losses > 0) vs[oppId] = { wins, losses };
    }

    rawDecks.push({
      keyId: cur[1].toUpperCase(),
      keyName: cur[2],
      leader: cur[3],
      cardId: cur[4].toUpperCase(),
      variant: cur[5],
      wins: Number(cur[6]),
      losses: Number(cur[7]),
      vs,
    });
  }

  const merged = new Map<string, RawDeck>();
  for (const d of rawDecks) {
    const prev = merged.get(d.cardId);
    if (!prev || d.wins + d.losses > prev.wins + prev.losses) merged.set(d.cardId, d);
  }

  const selected = [...merged.values()]
    .filter((d) => d.wins + d.losses >= 200)
    .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
    .slice(0, limit);

  if (!selected.length) return null;

  const idMap = new Map<string, string>(); // cardId -> appId
  for (const d of selected) idMap.set(d.cardId, d.cardId.toLowerCase());

  const totalGames = selected.reduce((s, d) => s + d.wins + d.losses, 0);

  const decks: MetaDeck[] = selected
    .map((d) => {
      const games = d.wins + d.losses;
      const winRate = Math.round((d.wins / games) * 1000) / 10;
      const displayName = d.variant && d.variant !== "default" ? `${d.leader}: ${d.variant}` : d.leader;
      return {
        id: idMap.get(d.cardId)!,
        name: `${displayName} (${d.cardId})`,
        leader: d.leader,
        cardId: d.cardId,
        color: inferColor(d.leader),
        tier: "C",
        metaShare: Math.round(((games / totalGames) * 100) * 10) / 10,
        winRate,
        trend: trendByWinRate(winRate),
        description: `Live from GumGum (${games} logged games)`,
        matchups: {},
      };
    })
    .sort((a, b) => b.winRate - a.winRate)
    .map((d, i) => ({ ...d, tier: tierByRank(i + 1) }));

  // matchup matrix (only between selected decks)
  const deckByCard = new Map(selected.map((d) => [d.cardId, d]));
  const outById = new Map(decks.map((d) => [d.id, d]));

  for (const d of selected) {
    const rowId = idMap.get(d.cardId)!;
    const row = outById.get(rowId)!;

    for (const opp of selected) {
      const colId = idMap.get(opp.cardId)!;
      if (d.cardId === opp.cardId) {
        row.matchups[colId] = 50;
        continue;
      }
      const rec = d.vs[opp.cardId];
      if (rec && rec.wins + rec.losses > 0) {
        row.matchups[colId] = Math.round((rec.wins / (rec.wins + rec.losses)) * 100);
      } else {
        row.matchups[colId] = 50;
      }
    }
  }

  return decks;
}

import { getOfficialCardById } from "@/lib/official-cards";
import type { MetaDeck } from "@/lib/meta-decks";

interface RawDeck {
  cardId: string;
  leader: string;
  variant: string;
  wins: number;
  losses: number;
  vs: Record<string, { wins: number; losses: number }>;
}

const URL = "https://gumgum.gg/tier-list";

const TOP_RE = /\\"([A-Z0-9]{2,5}-\d{3}) ([^\\"]+)\\":\{\\"leader\\":\\"([^\\"]+)\\",\\"id\\":\\"([A-Z0-9-]+)\\",\\"variant\\":\\"([^\\"]+)\\",\\"data\\":\{\\"wins\\":(\d+),\\"losses\\":(\d+),\\"vs\\":\{/g;
const VS_RE = /\\"([A-Z0-9]{2,5}-\d{3}) ([^\\"]+)\\":\{\\"wins\\":(\d+),\\"losses\\":(\d+)/g;

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

function colorForCard(cardId: string, leaderName: string): string {
  const official = getOfficialCardById(cardId);
  if (official?.color) return official.color;

  const n = leaderName.toLowerCase();
  if (n.includes("sakazuki") || n.includes("moria") || n.includes("lucci") || n.includes("rebecca")) return "Black";
  if (n.includes("enel") || n.includes("katakuri") || n.includes("linlin")) return "Yellow";
  if (n.includes("doflamingo") || n.includes("law") || n.includes("uta")) return "Blue";
  if (n.includes("luffy") || n.includes("zoro") || n.includes("ace") || n.includes("shanks") || n.includes("newgate")) return "Red";
  if (n.includes("kid") || n.includes("bonney") || n.includes("yamato")) return "Green";
  if (n.includes("kaido") || n.includes("queen") || n.includes("king")) return "Purple";
  return "Mixed";
}

export interface GumGumMatchupSnapshot {
  source: string;
  updatedAt: string;
  sampleGames: number;
  decks: MetaDeck[];
  leaderSampleGames?: Record<string, number>;
  matchupSamples?: Record<string, Record<string, { winRate: number; matches: number }>>;
}

export interface GumGumDecklistLeaderSnapshot {
  source: string;
  updatedAt: string;
  sampleDecks: number;
  leaders: Array<{
    cardId: string;
    leader: string;
    deckCount: number;
    metaShare: number;
  }>;
}

const HOME_URL = "https://gumgum.gg";
const HOME_LOOKBACK_DAYS = 14;

function extractBetween(text: string, startMarker: string, endMarker: string): string | null {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const valueStart = start + startMarker.length;
  const end = text.indexOf(endMarker, valueStart);
  if (end === -1) return null;
  return text.slice(valueStart, end);
}

function isoDateDaysAgo(baseDate: string, days: number): string {
  const value = new Date(`${baseDate}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export async function fetchGumGumDecklistLeaders(
  format: string,
  limit = 12,
): Promise<GumGumDecklistLeaderSnapshot | null> {
  const normalizedFormat = format.trim().toUpperCase();
  const sectionMap: Record<string, { sectionId: string; nextSectionId: string | null }> = {
    OP15: { sectionId: "east-op15", nextSectionId: "east-eb04" },
  };
  const section = sectionMap[normalizedFormat];
  if (!section) return null;

  const res = await fetch(HOME_URL, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;

  const html = await res.text();
  const start = html.indexOf(section.sectionId);
  if (start === -1) return null;
  const nextStart = section.nextSectionId ? html.indexOf(section.nextSectionId, start) : -1;
  const chunk = html.slice(start, nextStart === -1 ? html.length : nextStart);

  const rows: Array<{ date: string; leaderId: string; leaderName: string }> = [];

  for (const part of chunk.split('{\\"id\\":\\"').slice(1)) {
    const date = extractBetween(part, '\\"date\\":\\"', '\\"');
    const leaderId = extractBetween(part, '\\"leader_id\\":\\"', '\\"');
    const leaderName = extractBetween(part, '\\"leader_name\\":\\"', '\\"');

    if (!date || !leaderId || !leaderName) continue;
    rows.push({ date, leaderId, leaderName });
  }

  if (!rows.length) return null;

  const latestDate = rows
    .map((row) => row.date)
    .sort((a, b) => String(b).localeCompare(String(a)))[0];
  const cutoffDate = isoDateDaysAgo(latestDate, HOME_LOOKBACK_DAYS - 1);
  const scopedRows = rows.filter((row) => row.date >= cutoffDate);
  if (!scopedRows.length) return null;

  const leaderCounts = new Map<string, { leader: string; deckCount: number }>();
  for (const row of scopedRows) {
    const current = leaderCounts.get(row.leaderId) || { leader: row.leaderName, deckCount: 0 };
    current.deckCount += 1;
    current.leader = row.leaderName || current.leader;
    leaderCounts.set(row.leaderId, current);
  }

  const sampleDecks = scopedRows.length;
  const leaders = [...leaderCounts.entries()]
    .map(([cardId, row]) => ({
      cardId,
      leader: row.leader,
      deckCount: row.deckCount,
      metaShare: Number(((row.deckCount / sampleDecks) * 100).toFixed(2)),
    }))
    .sort(
      (a, b) =>
        b.deckCount - a.deckCount ||
        b.metaShare - a.metaShare ||
        a.cardId.localeCompare(b.cardId),
    )
    .slice(0, limit);

  return {
    source: "gumgum-home",
    updatedAt: new Date().toISOString(),
    sampleDecks,
    leaders,
  };
}

export async function fetchGumGumMatchups(limit = 18): Promise<GumGumMatchupSnapshot | null> {
  const res = await fetch(URL, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    next: { revalidate: 900 },
  });
  if (!res.ok) return null;

  const html = await res.text();

  const starts: Array<{ idx: number; match: RegExpExecArray }> = [];
  let topMatch: RegExpExecArray | null;
  while ((topMatch = TOP_RE.exec(html)) !== null) starts.push({ idx: topMatch.index, match: topMatch });
  if (!starts.length) return null;

  const rawDecks: RawDeck[] = [];

  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i].match;
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
      cardId: cur[4].toUpperCase(),
      leader: cur[3],
      variant: cur[5],
      wins: Number(cur[6]),
      losses: Number(cur[7]),
      vs,
    });
  }

  const merged = new Map<string, RawDeck>();
  for (const deck of rawDecks) {
    const prev = merged.get(deck.cardId);
    if (!prev || deck.wins + deck.losses > prev.wins + prev.losses) merged.set(deck.cardId, deck);
  }

  const eligible = [...merged.values()]
    .filter((deck) => deck.wins + deck.losses >= 200)
    .sort((a, b) => b.wins + b.losses - (a.wins + a.losses));

  const selected = eligible.slice(0, limit);

  if (!selected.length) return null;

  const totalGames = eligible.reduce((sum, deck) => sum + deck.wins + deck.losses, 0);

  const decks = selected
    .map((deck) => {
      const games = deck.wins + deck.losses;
      const official = getOfficialCardById(deck.cardId);
      const winRate = Number(((deck.wins / games) * 100).toFixed(2));
      return {
        id: deck.cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: official?.name || deck.leader,
        leader: official?.name || deck.leader,
        cardId: deck.cardId,
        color: colorForCard(deck.cardId, official?.name || deck.leader),
        tier: "C" as const,
        metaShare: Number((((games / totalGames) * 100)).toFixed(2)),
        winRate,
        trend: trendByWinRate(winRate),
        description: `Live aggregate (${games.toLocaleString()} logged games)`,
        matchups: {} as Record<string, number>,
      };
    })
    .sort((a, b) => b.winRate - a.winRate)
    .map((deck, index) => ({ ...deck, tier: tierByRank(index + 1) }));

  const outById = new Map(decks.map((deck) => [deck.id, deck]));
  const leaderSampleGames: Record<string, number> = {};
  const matchupSamples: Record<string, Record<string, { winRate: number; matches: number }>> = {};

  for (const deck of selected) {
    const rowId = deck.cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = outById.get(rowId);
    if (!row) continue;
    leaderSampleGames[deck.cardId] = deck.wins + deck.losses;
    matchupSamples[deck.cardId] = matchupSamples[deck.cardId] || {};

    for (const opponent of selected) {
      const colId = opponent.cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (deck.cardId === opponent.cardId) {
        row.matchups[colId] = 50;
        continue;
      }

      const record = deck.vs[opponent.cardId];
      if (record && record.wins + record.losses > 0) {
        row.matchups[colId] = Number(((record.wins / (record.wins + record.losses)) * 100).toFixed(2));
        matchupSamples[deck.cardId][opponent.cardId] = {
          winRate: Number(((record.wins / (record.wins + record.losses)) * 100).toFixed(2)),
          matches: record.wins + record.losses,
        };
      } else {
        row.matchups[colId] = 50;
      }
    }
  }

  for (const row of decks) {
    for (const col of decks) {
      if (row.matchups[col.id] == null) row.matchups[col.id] = 50;
    }
  }

  return {
    source: "live-aggregate",
    updatedAt: new Date().toISOString(),
    sampleGames: totalGames,
    decks,
    leaderSampleGames,
    matchupSamples,
  };
}

import { getCardById } from "@/lib/cards";
import type { MetaDeck as MatchupMetaDeck } from "@/lib/meta-decks";
import type { MetaDeck as MetaPageDeck, MetaSnapshot } from "@/lib/data/meta";
import { DECKS as SEEDED_DECKS, MATCHUPS as SEEDED_MATCHUPS } from "@/lib/matchups";
import type {
  LeaderDailyStatRow,
  LeaderMatchupDailyStatRow,
  MatchIntelPeriod,
  MatchIntelSnapshot,
} from "@/lib/analytics/types";

function toDeckId(cardId: string): string {
  return cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function toPct(rate: number | null | undefined, fallback = 0): number {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return fallback;
  return Number((rate * 100).toFixed(2));
}

function tierFromRank(rank: number): MatchupMetaDeck["tier"] {
  if (rank <= 3) return "S";
  if (rank <= 6) return "A";
  if (rank <= 10) return "B";
  if (rank <= 14) return "C";
  return "D";
}

function tierForMetaPage(rank: number): MetaPageDeck["tier"] {
  const t = tierFromRank(rank);
  return t === "D" ? "C" : t;
}

function trendFromDelta(delta: number): MatchupMetaDeck["trend"] {
  if (delta >= 0.005) return "up";
  if (delta <= -0.005) return "down";
  return "stable";
}

function trendSymbol(trend: MatchupMetaDeck["trend"]): MetaPageDeck["trend"] {
  if (trend === "up") return "▲";
  if (trend === "down") return "▼";
  return "—";
}

function sortLeaders(rows: LeaderDailyStatRow[]): LeaderDailyStatRow[] {
  return [...rows].sort((a, b) => {
    const wa = a.weighted_win_rate ?? a.raw_win_rate ?? 0;
    const wb = b.weighted_win_rate ?? b.raw_win_rate ?? 0;
    if (wb !== wa) return wb - wa;
    return b.number_of_matches - a.number_of_matches;
  });
}

function buildPreviousRateMap(snapshot: MatchIntelSnapshot | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!snapshot) return map;

  for (const leader of snapshot.leaders) {
    map.set(leader.leader_id, leader.weighted_win_rate ?? leader.raw_win_rate ?? 0.5);
  }
  return map;
}

function rowDisplayName(row: LeaderDailyStatRow): string {
  const card = getCardById(row.leader_id);
  if (row.leader_name?.trim()) return row.leader_name;
  if (card?.name?.trim()) return card.name;
  return row.leader_id;
}

function rowColor(row: LeaderDailyStatRow): string {
  const card = getCardById(row.leader_id);
  return card?.color || "Mixed";
}

function buildMatchupLookup(rows: LeaderMatchupDailyStatRow[]): Map<string, Map<string, number>> {
  const lookup = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const map = lookup.get(row.leader_id) || new Map<string, number>();
    map.set(row.opponent_id, toPct(row.matchup_win_rate, 50));
    lookup.set(row.leader_id, map);
  }
  return lookup;
}

export function snapshotTotalMatches(snapshot: MatchIntelSnapshot): number {
  return snapshot.leaders.reduce((max, row) => Math.max(max, row.total_matches || 0), 0);
}

export function snapshotToMatchupDecks(
  snapshot: MatchIntelSnapshot,
  previousSnapshot: MatchIntelSnapshot | null = null,
  limit = 18
): MatchupMetaDeck[] {
  const sorted = sortLeaders(snapshot.leaders).slice(0, limit);
  const prevRate = buildPreviousRateMap(previousSnapshot);
  const lookup = buildMatchupLookup(snapshot.matchups);

  const deckIdByLeader = new Map<string, string>();
  for (const row of sorted) deckIdByLeader.set(row.leader_id, toDeckId(row.leader_id));

  const decks: MatchupMetaDeck[] = sorted.map((row, index) => {
    const curr = row.weighted_win_rate ?? row.raw_win_rate ?? 0.5;
    const prev = prevRate.get(row.leader_id) ?? curr;

    return {
      id: toDeckId(row.leader_id),
      name: rowDisplayName(row),
      leader: rowDisplayName(row),
      cardId: row.leader_id,
      color: rowColor(row),
      tier: tierFromRank(index + 1),
      metaShare: toPct(row.play_rate, 0),
      winRate: toPct(curr, 50),
      trend: trendFromDelta(curr - prev),
      description: `${row.number_of_matches.toLocaleString()} matches in snapshot`,
      matchups: {},
    };
  });

  const allDeckIds = decks.map((d) => d.id);

  for (const deck of decks) {
    const rowMap = lookup.get(deck.cardId) || new Map<string, number>();
    for (const other of decks) {
      if (deck.id === other.id) {
        deck.matchups[other.id] = 50;
        continue;
      }
      const raw = rowMap.get(other.cardId);
      deck.matchups[other.id] = typeof raw === "number" ? Number(raw.toFixed(2)) : 50;
    }

    for (const id of allDeckIds) {
      if (deck.matchups[id] == null) deck.matchups[id] = 50;
    }
  }

  return decks;
}

export function snapshotToMetaDecks(
  snapshot: MatchIntelSnapshot,
  previousSnapshot: MatchIntelSnapshot | null = null,
  limit = 15
): MetaPageDeck[] {
  const sorted = sortLeaders(snapshot.leaders).slice(0, limit);
  const prevRate = buildPreviousRateMap(previousSnapshot);

  return sorted.map((row, index) => {
    const curr = row.weighted_win_rate ?? row.raw_win_rate ?? 0.5;
    const prev = prevRate.get(row.leader_id) ?? curr;
    const trend = trendFromDelta(curr - prev);

    return {
      rank: index + 1,
      name: rowDisplayName(row),
      tier: tierForMetaPage(index + 1),
      color: rowColor(row),
      winRate: toPct(curr, 50),
      popularity: toPct(row.play_rate, 0),
      trend: trendSymbol(trend),
      cardId: row.leader_id,
      deckId: row.leader_id,
    };
  });
}

export function snapshotToMetaResponse(
  snapshot: MatchIntelSnapshot,
  period: MatchIntelPeriod,
  previousSnapshot: MatchIntelSnapshot | null = null
): MetaSnapshot {
  const region = period.includes("east") ? "East" : "West";

  return {
    updatedAt: new Date(`${snapshot.snapshotDate}T00:00:00.000Z`).toISOString(),
    source: `match-intel-v2:${period}`,
    sources: ["match-intel-v2"],
    sampleGames: snapshotTotalMatches(snapshot),
    metaDecks: snapshotToMetaDecks(snapshot, previousSnapshot),
    regions: [{ region, events: 0, players: 0 }],
    decks: SEEDED_DECKS,
    matchups: SEEDED_MATCHUPS,
  };
}

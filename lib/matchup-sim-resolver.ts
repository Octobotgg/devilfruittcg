import type { MatchIntelPeriod, MatchIntelRepository, MatchIntelSnapshot } from "./analytics/index.ts";
import type { MetaDeck } from "./meta-decks.ts";
import { getMatchupFormatWindow } from "./matchup-format-windows.ts";

type SimRow = MatchIntelSnapshot["matchups"][number];

export type SimHeadToHead = {
  winRate: number;
  matches: number;
  firstWinRate: number | null;
  firstGames: number | null;
  secondWinRate: number | null;
  secondGames: number | null;
  reverseWinRate: number;
  reverseMatches: number;
  reverseFirstWinRate: number | null;
  reverseFirstGames: number | null;
  reverseSecondWinRate: number | null;
  reverseSecondGames: number | null;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toPercent(rate: number | null | undefined, fallback = 50): number {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return fallback;
  return Number(clampPercent(rate * 100).toFixed(2));
}

function lookupMatchupRow(snapshot: MatchIntelSnapshot, leader: string, opponent: string): SimRow | undefined {
  return snapshot.matchups.find((row) => row.leader_id === leader && row.opponent_id === opponent);
}

function mapSide(row: SimRow | undefined) {
  if (!row) {
    return {
      winRate: 50,
      matches: 0,
      firstWinRate: null,
      firstGames: null,
      secondWinRate: null,
      secondGames: null,
    };
  }

  return {
    winRate: toPercent(row.matchup_win_rate, 50),
    matches: row.total_games || 0,
    firstWinRate: typeof row.first_win_rate === "number" ? toPercent(row.first_win_rate) : null,
    firstGames: row.first_games ?? null,
    secondWinRate: typeof row.second_win_rate === "number" ? toPercent(row.second_win_rate) : null,
    secondGames: row.second_games ?? null,
  };
}

export function resolveSimHeadToHead(snapshot: MatchIntelSnapshot, leader: string, opponent: string): SimHeadToHead {
  const forward = mapSide(lookupMatchupRow(snapshot, leader, opponent));
  const reverse = mapSide(lookupMatchupRow(snapshot, opponent, leader));

  return {
    ...forward,
    reverseWinRate: reverse.winRate,
    reverseMatches: reverse.matches,
    reverseFirstWinRate: reverse.firstWinRate,
    reverseFirstGames: reverse.firstGames,
    reverseSecondWinRate: reverse.secondWinRate,
    reverseSecondGames: reverse.secondGames,
  };
}

export function applySimMatchupsToDecks<T extends MetaDeck>(decks: T[], snapshot: MatchIntelSnapshot): T[] {
  return decks.map((deck) => {
    const matchups: Record<string, number> = {};

    for (const opponent of decks) {
      if (deck.cardId === opponent.cardId) {
        matchups[opponent.id] = 50;
        continue;
      }

      matchups[opponent.id] = resolveSimHeadToHead(snapshot, deck.cardId, opponent.cardId).winRate;
    }

    return {
      ...deck,
      matchups,
    };
  });
}

export function selectLatestSnapshotDateInWindow(
  snapshotDates: string[],
  startDate: string,
  endDate: string,
): string | null {
  const ordered = [...snapshotDates].sort((a, b) => b.localeCompare(a));
  return ordered.find((date) => date >= startDate && date <= endDate) ?? null;
}

export async function getLatestMatchupSnapshotInWindow(
  repo: MatchIntelRepository,
  period: MatchIntelPeriod,
  format: string,
): Promise<{ snapshot: MatchIntelSnapshot; startDate: string; endDate: string; snapshotDate: string } | null> {
  const window = getMatchupFormatWindow(format);
  if (!window) return null;

  const bounds = await repo.getSnapshotDateBounds(period);
  if (!bounds.earliest || !bounds.latest) return null;

  const startDate = bounds.earliest > window.startDate ? bounds.earliest : window.startDate;
  const desiredEndDate = window.endDate || bounds.latest;
  const endDate = desiredEndDate < bounds.latest ? desiredEndDate : bounds.latest;
  if (startDate > endDate) return null;

  const recentDates = await repo.getRecentSnapshotDates(period, 730);
  const snapshotDate = selectLatestSnapshotDateInWindow(recentDates, startDate, endDate);
  if (!snapshotDate) return null;

  const snapshot = await repo.getSnapshot(period, snapshotDate);
  if (!snapshot) return null;

  return {
    snapshot,
    startDate,
    endDate,
    snapshotDate,
  };
}

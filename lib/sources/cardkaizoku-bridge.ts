import type { MatchIntelPeriod, MatchIntelSnapshot } from "@/lib/analytics";

type RawLeaderRow = {
  leader?: string;
  leaderName?: string;
  wins?: number;
  number_of_matches?: number;
  total_matches?: number;
  raw_win_rate?: number;
  play_rate?: number;
  weighted_win_rate?: number;
  first_win_rate?: number;
  second_win_rate?: number;
  matchups?: Array<{
    opponent?: string;
    wins?: number;
    total_games?: number;
    matchup_win_rate?: number;
    first_wins?: number;
    first_games?: number;
    first_win_rate?: number;
    second_wins?: number;
    second_games?: number;
    second_win_rate?: number;
  }>;
};

const CDN_BASE = "https://cdn.cardkaizoku.com/stats";

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function asDateFromYmd(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function asRate(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function mapSnapshot(period: MatchIntelPeriod, snapshotYmd: string, rows: RawLeaderRow[]): MatchIntelSnapshot {
  const snapshotDate = asDateFromYmd(snapshotYmd);

  const leaders = rows
    .map((row) => {
      const leaderId = String(row.leader || "").trim().toUpperCase();
      if (!leaderId) return null;

      return {
        snapshot_date: snapshotDate,
        period,
        leader_id: leaderId,
        leader_name: String(row.leaderName || leaderId),
        wins: asInt(row.wins),
        number_of_matches: asInt(row.number_of_matches),
        total_matches: asInt(row.total_matches),
        raw_win_rate: asRate(row.raw_win_rate),
        play_rate: asRate(row.play_rate),
        weighted_win_rate: asRate(row.weighted_win_rate),
        first_win_rate: asRate(row.first_win_rate),
        second_win_rate: asRate(row.second_win_rate),
        created_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const matchups = rows.flatMap((leaderRow) => {
    const leaderId = String(leaderRow.leader || "").trim().toUpperCase();
    if (!leaderId) return [];

    const raw = Array.isArray(leaderRow.matchups) ? leaderRow.matchups : [];
    return raw
      .map((m) => {
        const opp = String(m.opponent || "").trim().toUpperCase();
        if (!opp) return null;

        return {
          snapshot_date: snapshotDate,
          period,
          leader_id: leaderId,
          opponent_id: opp,
          wins: asInt(m.wins),
          total_games: asInt(m.total_games),
          matchup_win_rate: asRate(m.matchup_win_rate),
          first_wins: asInt(m.first_wins),
          first_games: asInt(m.first_games),
          first_win_rate: asRate(m.first_win_rate),
          second_wins: asInt(m.second_wins),
          second_games: asInt(m.second_games),
          second_win_rate: asRate(m.second_win_rate),
          created_at: new Date().toISOString(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  });

  return {
    period,
    snapshotDate,
    leaders,
    matchups,
  };
}

export async function fetchCardKaizokuBridgeSnapshot(
  period: MatchIntelPeriod,
  options?: { date?: Date; maxLookbackDays?: number }
): Promise<{ snapshot: MatchIntelSnapshot; sourceUrl: string } | null> {
  const baseDate = options?.date || new Date();
  const maxLookback = Math.max(0, Math.min(options?.maxLookbackDays ?? 3, 14));

  for (let i = 0; i <= maxLookback; i++) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const stamp = ymd(d);
    const url = `${CDN_BASE}/stats_${period}_${stamp}.json?v=3`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        next: { revalidate: 900 },
      });
      if (!res.ok) continue;

      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) continue;

      const rows = json as RawLeaderRow[];
      const snapshot = mapSnapshot(period, stamp, rows);
      if (!snapshot.leaders.length) continue;

      return {
        snapshot,
        sourceUrl: url,
      };
    } catch {
      // continue lookback
    }
  }

  return null;
}

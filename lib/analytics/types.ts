export const MATCH_INTEL_PERIODS = [
  "west",
  "lw",
  "east",
  "east_lw",
  "west_p",
  "lw_p",
  "east_p",
  "east_lw_p",
] as const;

export type MatchIntelPeriod = (typeof MATCH_INTEL_PERIODS)[number];

export function asMatchIntelPeriod(value: string, fallback: MatchIntelPeriod = "west_p"): MatchIntelPeriod {
  const normalized = value.trim().toLowerCase();
  return (MATCH_INTEL_PERIODS as readonly string[]).includes(normalized)
    ? (normalized as MatchIntelPeriod)
    : fallback;
}

export interface MatchEventInsert {
  source: string;
  source_match_id: string | null;
  played_at: string;
  region: string | null;
  is_private: boolean;
  game_mode: number | null;
  p1_leader_id: string;
  p2_leader_id: string;
  winner_side: 1 | 2 | null;
  turn_count: number | null;
  p1_device_hash: string | null;
  p2_device_hash: string | null;
  p1_name: string | null;
  p2_name: string | null;
  p1_decklist: string | null;
  p2_decklist: string | null;
}

export interface MatchEventRow extends MatchEventInsert {
  id: string;
  created_at: string;
}

export interface MatchEventQueryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PlayerIndexUpsert {
  device_hash: string;
  latest_player_name: string | null;
  last_seen_at: string | null;
  last_leader_id: string | null;
  latest_opponent_leader_id: string | null;
  updated_at?: string;
}

export interface PlayerIndexRow extends PlayerIndexUpsert {
  updated_at: string;
}

export interface LeaderDailyStatInsert {
  snapshot_date: string; // YYYY-MM-DD
  period: MatchIntelPeriod;
  leader_id: string;
  leader_name: string;
  wins: number;
  number_of_matches: number;
  total_matches: number;
  raw_win_rate: number | null;
  play_rate: number | null;
  weighted_win_rate: number | null;
  first_win_rate: number | null;
  second_win_rate: number | null;
}

export interface LeaderDailyStatRow extends LeaderDailyStatInsert {
  created_at: string;
}

export interface LeaderMatchupDailyStatInsert {
  snapshot_date: string; // YYYY-MM-DD
  period: MatchIntelPeriod;
  leader_id: string;
  opponent_id: string;
  wins: number;
  total_games: number;
  matchup_win_rate: number | null;
  first_wins: number;
  first_games: number;
  first_win_rate: number | null;
  second_wins: number;
  second_games: number;
  second_win_rate: number | null;
}

export interface LeaderMatchupDailyStatRow extends LeaderMatchupDailyStatInsert {
  created_at: string;
}

export interface MatchIntelSnapshot {
  snapshotDate: string; // YYYY-MM-DD
  period: MatchIntelPeriod;
  leaders: LeaderDailyStatRow[];
  matchups: LeaderMatchupDailyStatRow[];
}

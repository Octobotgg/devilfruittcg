import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  LeaderDailyStatInsert,
  LeaderDailyStatRow,
  LeaderMatchupDailyStatInsert,
  LeaderMatchupDailyStatRow,
  MatchEventInsert,
  MatchEventQueryOptions,
  MatchEventRow,
  MatchIntelPeriod,
  MatchIntelSnapshot,
  PlayerIndexRow,
  PlayerIndexUpsert,
} from "@/lib/analytics/types";

export interface MatchIntelRepository {
  upsertMatchEvents(events: MatchEventInsert[]): Promise<number>;
  upsertPlayerIndex(rows: PlayerIndexUpsert[]): Promise<number>;
  upsertLeaderDailyStats(rows: LeaderDailyStatInsert[]): Promise<number>;
  upsertLeaderMatchupDailyStats(rows: LeaderMatchupDailyStatInsert[]): Promise<number>;

  getMatchesByDeviceHash(deviceHash: string, options?: MatchEventQueryOptions): Promise<MatchEventRow[]>;
  getLatestPlayerIndexMatches(searchTerm: string, limit?: number): Promise<PlayerIndexRow[]>;
  countMatchEvents(): Promise<number>;
  countPlayerIndex(): Promise<number>;
  getLatestMatchEventAt(): Promise<string | null>;

  getSnapshot(period: MatchIntelPeriod, snapshotDate: string): Promise<MatchIntelSnapshot | null>;
  getLatestSnapshot(period: MatchIntelPeriod): Promise<MatchIntelSnapshot | null>;
  getRecentSnapshotDates(period: MatchIntelPeriod, limit?: number): Promise<string[]>;
  getSnapshotDateBounds(period: MatchIntelPeriod): Promise<{ earliest: string | null; latest: string | null }>;
  getAggregatedSnapshot(period: MatchIntelPeriod, startDate: string, endDate: string): Promise<MatchIntelSnapshot | null>;
}

function maxTotalMatches(rows: Array<{ total_matches: number }>): number {
  return rows.reduce((max, row) => Math.max(max, row.total_matches || 0), 0);
}

function bySnapshotDate<T extends { snapshot_date: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.snapshot_date) || [];
    bucket.push(row);
    grouped.set(row.snapshot_date, bucket);
  }
  return grouped;
}

function clampDelta(current: number, previous = 0): number {
  return Math.max(0, current - previous);
}

function requireServerSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase server key. Set SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, serviceRoleKey };
}

function normalizeSearchTerm(searchTerm: string): string {
  return searchTerm
    .trim()
    .replace(/[%_]/g, "")
    .replace(/[^a-zA-Z0-9#\-\s]/g, "")
    .slice(0, 80);
}

export function createMatchIntelSupabaseRepository(client?: SupabaseClient): MatchIntelRepository {
  const supabase =
    client ||
    (() => {
      const cfg = requireServerSupabaseConfig();
      return createClient(cfg.url, cfg.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    })();

  return new SupabaseMatchIntelRepository(supabase);
}

class SupabaseMatchIntelRepository implements MatchIntelRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async fetchAllMatchupRows(
    buildPage: (from: number, to: number) => PromiseLike<{ data: LeaderMatchupDailyStatRow[] | null; error: unknown }>
  ): Promise<LeaderMatchupDailyStatRow[]> {
    const pageSize = 1000;
    const rows: LeaderMatchupDailyStatRow[] = [];

    for (let from = 0; ; from += pageSize) {
      const to = from + pageSize - 1;
      const result = await buildPage(from, to);
      if (result.error) throw result.error;

      const page = (result.data || []) as LeaderMatchupDailyStatRow[];
      rows.push(...page);

      if (page.length < pageSize) break;
    }

    return rows;
  }

  async upsertMatchEvents(events: MatchEventInsert[]): Promise<number> {
    if (!events.length) return 0;

    const { data, error } = await this.client
      .from("match_events")
      .upsert(events, { onConflict: "source,source_match_id" })
      .select("id");

    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  }

  async upsertPlayerIndex(rows: PlayerIndexUpsert[]): Promise<number> {
    if (!rows.length) return 0;

    const payload = rows.map((r) => ({
      ...r,
      updated_at: r.updated_at || new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from("player_index")
      .upsert(payload, { onConflict: "device_hash" })
      .select("device_hash");

    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  }

  async upsertLeaderDailyStats(rows: LeaderDailyStatInsert[]): Promise<number> {
    if (!rows.length) return 0;

    const { data, error } = await this.client
      .from("leader_daily_stats")
      .upsert(rows, { onConflict: "snapshot_date,period,leader_id" })
      .select("leader_id");

    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  }

  async upsertLeaderMatchupDailyStats(rows: LeaderMatchupDailyStatInsert[]): Promise<number> {
    if (!rows.length) return 0;

    const { data, error } = await this.client
      .from("leader_matchup_daily_stats")
      .upsert(rows, { onConflict: "snapshot_date,period,leader_id,opponent_id" })
      .select("leader_id");

    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  }

  async getMatchesByDeviceHash(deviceHash: string, options: MatchEventQueryOptions = {}): Promise<MatchEventRow[]> {
    const normalizedLimit = Math.max(1, Math.min(options.limit ?? 100, 500));
    const from = Math.max(0, options.offset ?? 0);
    const to = from + normalizedLimit - 1;

    let query = this.client
      .from("match_events")
      .select("*")
      .or(`p1_device_hash.eq.${deviceHash},p2_device_hash.eq.${deviceHash}`)
      .order("played_at", { ascending: false })
      .range(from, to);

    if (options.startDate) {
      const iso = new Date(options.startDate).toISOString();
      query = query.gte("played_at", iso);
    }

    if (options.endDate) {
      const iso = new Date(options.endDate).toISOString();
      query = query.lte("played_at", iso);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as MatchEventRow[];
  }

  async getLatestPlayerIndexMatches(searchTerm: string, limit = 25): Promise<PlayerIndexRow[]> {
    const q = normalizeSearchTerm(searchTerm);
    if (!q) return [];

    const normalizedLimit = Math.max(1, Math.min(limit, 100));

    const nameResult = await this.client
      .from("player_index")
      .select("*")
      .ilike("latest_player_name", `%${q}%`)
      .order("last_seen_at", { ascending: false })
      .limit(normalizedLimit);

    if (nameResult.error) throw nameResult.error;

    const merged = new Map<string, PlayerIndexRow>();
    (nameResult.data || []).forEach((row) => merged.set(row.device_hash, row as PlayerIndexRow));

    if (merged.size < normalizedLimit && q.length >= 5) {
      const deviceResult = await this.client
        .from("player_index")
        .select("*")
        .ilike("device_hash", `%${q.toLowerCase()}%`)
        .order("last_seen_at", { ascending: false })
        .limit(normalizedLimit);

      if (deviceResult.error) throw deviceResult.error;
      (deviceResult.data || []).forEach((row) => merged.set(row.device_hash, row as PlayerIndexRow));
    }

    return [...merged.values()]
      .sort((a, b) => {
        const ta = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const tb = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, normalizedLimit);
  }

  async countMatchEvents(): Promise<number> {
    const { count, error } = await this.client
      .from("match_events")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    return count || 0;
  }

  async countPlayerIndex(): Promise<number> {
    const { count, error } = await this.client
      .from("player_index")
      .select("device_hash", { count: "exact", head: true });

    if (error) throw error;
    return count || 0;
  }

  async getLatestMatchEventAt(): Promise<string | null> {
    const { data, error } = await this.client
      .from("match_events")
      .select("played_at")
      .order("played_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as { played_at?: string | null } | null)?.played_at || null;
  }

  async getSnapshot(period: MatchIntelPeriod, snapshotDate: string): Promise<MatchIntelSnapshot | null> {
    const [leadersRes, matchups] = await Promise.all([
      this.client
        .from("leader_daily_stats")
        .select("*")
        .eq("period", period)
        .eq("snapshot_date", snapshotDate)
        .order("weighted_win_rate", { ascending: false }),
      this.fetchAllMatchupRows((from, to) =>
        this.client
          .from("leader_matchup_daily_stats")
          .select("*")
          .eq("period", period)
          .eq("snapshot_date", snapshotDate)
          .order("leader_id", { ascending: true })
          .order("opponent_id", { ascending: true })
          .range(from, to)
      ),
    ]);

    if (leadersRes.error) throw leadersRes.error;

    const leaders = (leadersRes.data || []) as LeaderDailyStatRow[];

    if (!leaders.length) return null;

    return {
      snapshotDate,
      period,
      leaders,
      matchups,
    };
  }

  async getRecentSnapshotDates(period: MatchIntelPeriod, limit = 2): Promise<string[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 30));

    const { data, error } = await this.client
      .from("leader_daily_stats")
      .select("snapshot_date")
      .eq("period", period)
      .order("snapshot_date", { ascending: false })
      .limit(normalizedLimit);

    if (error) throw error;

    const seen = new Set<string>();
    const dates: string[] = [];
    for (const row of data || []) {
      const d = String(row.snapshot_date);
      if (seen.has(d)) continue;
      seen.add(d);
      dates.push(d);
    }
    return dates;
  }

  async getLatestSnapshot(period: MatchIntelPeriod): Promise<MatchIntelSnapshot | null> {
    const dates = await this.getRecentSnapshotDates(period, 1);
    if (!dates.length) return null;
    return this.getSnapshot(period, dates[0]);
  }

  async getSnapshotDateBounds(period: MatchIntelPeriod): Promise<{ earliest: string | null; latest: string | null }> {
    const [earliestRes, latestRes] = await Promise.all([
      this.client
        .from("leader_daily_stats")
        .select("snapshot_date")
        .eq("period", period)
        .order("snapshot_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      this.client
        .from("leader_daily_stats")
        .select("snapshot_date")
        .eq("period", period)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (earliestRes.error) throw earliestRes.error;
    if (latestRes.error) throw latestRes.error;

    return {
      earliest: (earliestRes.data as { snapshot_date?: string | null } | null)?.snapshot_date || null,
      latest: (latestRes.data as { snapshot_date?: string | null } | null)?.snapshot_date || null,
    };
  }

  async getAggregatedSnapshot(period: MatchIntelPeriod, startDate: string, endDate: string): Promise<MatchIntelSnapshot | null> {
    const baselineDateRes = await this.client
      .from("leader_daily_stats")
      .select("snapshot_date")
      .eq("period", period)
      .lt("snapshot_date", startDate)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (baselineDateRes.error) throw baselineDateRes.error;

    const baselineDate = (baselineDateRes.data as { snapshot_date?: string | null } | null)?.snapshot_date || null;
    const queryStart = baselineDate || startDate;

    const [leadersRes, matchupRows] = await Promise.all([
      this.client
        .from("leader_daily_stats")
        .select("*")
        .eq("period", period)
        .gte("snapshot_date", queryStart)
        .lte("snapshot_date", endDate),
      this.fetchAllMatchupRows((from, to) =>
        this.client
          .from("leader_matchup_daily_stats")
          .select("*")
          .eq("period", period)
          .gte("snapshot_date", queryStart)
          .lte("snapshot_date", endDate)
          .order("snapshot_date", { ascending: true })
          .order("leader_id", { ascending: true })
          .order("opponent_id", { ascending: true })
          .range(from, to)
      ),
    ]);

    if (leadersRes.error) throw leadersRes.error;

    const leaderRows = (leadersRes.data || []) as LeaderDailyStatRow[];
    if (!leaderRows.length) return null;

    const leadersByDate = bySnapshotDate(leaderRows);
    const matchupsByDate = bySnapshotDate(matchupRows);
    const orderedDates = [...leadersByDate.keys()].sort((a, b) => a.localeCompare(b));

    let previousLeaders: LeaderDailyStatRow[] | null = null;
    let previousMatchups: LeaderMatchupDailyStatRow[] | null = null;
    let previousTotalMatches = 0;

    const incrementalLeaders: LeaderDailyStatRow[] = [];
    const incrementalMatchups: LeaderMatchupDailyStatRow[] = [];
    const generatedAt = new Date().toISOString();
    let totalMatches = 0;

    for (const date of orderedDates) {
      const currentLeaders = leadersByDate.get(date) || [];
      const currentMatchups = matchupsByDate.get(date) || [];
      const currentTotalMatches = maxTotalMatches(currentLeaders);

      const shouldDiff =
        previousLeaders !== null &&
        previousTotalMatches > 0 &&
        currentTotalMatches >= previousTotalMatches;

      const previousLeaderMap = new Map((previousLeaders || []).map((row) => [row.leader_id, row]));
      const previousMatchupMap = new Map((previousMatchups || []).map((row) => [`${row.leader_id}__${row.opponent_id}`, row]));
      const dayTotalMatches = shouldDiff ? clampDelta(currentTotalMatches, previousTotalMatches) : currentTotalMatches;

      if (date >= startDate) {
        totalMatches += dayTotalMatches;

        for (const row of currentLeaders) {
          const previous = shouldDiff ? previousLeaderMap.get(row.leader_id) : undefined;
          const wins = shouldDiff ? clampDelta(row.wins || 0, previous?.wins || 0) : row.wins || 0;
          const numberOfMatches = shouldDiff
            ? clampDelta(row.number_of_matches || 0, previous?.number_of_matches || 0)
            : row.number_of_matches || 0;

          if (wins <= 0 && numberOfMatches <= 0) continue;

          incrementalLeaders.push({
            ...row,
            snapshot_date: date,
            wins,
            number_of_matches: numberOfMatches,
            total_matches: dayTotalMatches,
            raw_win_rate: numberOfMatches > 0 ? wins / numberOfMatches : null,
            play_rate: dayTotalMatches > 0 ? numberOfMatches / dayTotalMatches : null,
            weighted_win_rate: numberOfMatches > 0 ? wins / numberOfMatches : null,
            created_at: generatedAt,
          });
        }

        for (const row of currentMatchups) {
          const key = `${row.leader_id}__${row.opponent_id}`;
          const previous = shouldDiff ? previousMatchupMap.get(key) : undefined;
          const wins = shouldDiff ? clampDelta(row.wins || 0, previous?.wins || 0) : row.wins || 0;
          const totalGames = shouldDiff ? clampDelta(row.total_games || 0, previous?.total_games || 0) : row.total_games || 0;
          const firstWins = shouldDiff ? clampDelta(row.first_wins || 0, previous?.first_wins || 0) : row.first_wins || 0;
          const firstGames = shouldDiff ? clampDelta(row.first_games || 0, previous?.first_games || 0) : row.first_games || 0;
          const secondWins = shouldDiff ? clampDelta(row.second_wins || 0, previous?.second_wins || 0) : row.second_wins || 0;
          const secondGames = shouldDiff ? clampDelta(row.second_games || 0, previous?.second_games || 0) : row.second_games || 0;

          if (wins <= 0 && totalGames <= 0) continue;

          incrementalMatchups.push({
            ...row,
            snapshot_date: date,
            wins,
            total_games: totalGames,
            matchup_win_rate: totalGames > 0 ? wins / totalGames : null,
            first_wins: firstWins,
            first_games: firstGames,
            first_win_rate: firstGames > 0 ? firstWins / firstGames : null,
            second_wins: secondWins,
            second_games: secondGames,
            second_win_rate: secondGames > 0 ? secondWins / secondGames : null,
            created_at: generatedAt,
          });
        }
      }

      previousLeaders = currentLeaders;
      previousMatchups = currentMatchups;
      previousTotalMatches = currentTotalMatches;
    }

    if (!incrementalLeaders.length) return null;

    const leaderMap = new Map<
      string,
      {
        leader_id: string;
        leader_name: string;
        wins: number;
        number_of_matches: number;
        firstWeightedWins: number;
        firstWeight: number;
        secondWeightedWins: number;
        secondWeight: number;
      }
    >();

    for (const row of incrementalLeaders) {
      const current = leaderMap.get(row.leader_id) || {
        leader_id: row.leader_id,
        leader_name: row.leader_name,
        wins: 0,
        number_of_matches: 0,
        firstWeightedWins: 0,
        firstWeight: 0,
        secondWeightedWins: 0,
        secondWeight: 0,
      };

      current.wins += row.wins || 0;
      current.number_of_matches += row.number_of_matches || 0;
      current.leader_name = row.leader_name || current.leader_name;

      if (typeof row.first_win_rate === "number") {
        current.firstWeightedWins += row.first_win_rate * (row.number_of_matches || 0);
        current.firstWeight += row.number_of_matches || 0;
      }
      if (typeof row.second_win_rate === "number") {
        current.secondWeightedWins += row.second_win_rate * (row.number_of_matches || 0);
        current.secondWeight += row.number_of_matches || 0;
      }

      leaderMap.set(row.leader_id, current);
    }

    const aggregatedLeaders: LeaderDailyStatRow[] = [...leaderMap.values()].map((row) => {
      const rawWinRate = row.number_of_matches > 0 ? row.wins / row.number_of_matches : null;
      return {
        snapshot_date: endDate,
        period,
        leader_id: row.leader_id,
        leader_name: row.leader_name,
        wins: row.wins,
        number_of_matches: row.number_of_matches,
        total_matches: totalMatches,
        raw_win_rate: rawWinRate,
        play_rate: totalMatches > 0 ? row.number_of_matches / totalMatches : null,
        weighted_win_rate: rawWinRate,
        first_win_rate: row.firstWeight > 0 ? row.firstWeightedWins / row.firstWeight : null,
        second_win_rate: row.secondWeight > 0 ? row.secondWeightedWins / row.secondWeight : null,
        created_at: new Date().toISOString(),
      };
    });

    const matchupMap = new Map<
      string,
      {
        leader_id: string;
        opponent_id: string;
        wins: number;
        total_games: number;
        first_wins: number;
        first_games: number;
        second_wins: number;
        second_games: number;
      }
    >();

    for (const row of incrementalMatchups) {
      const key = `${row.leader_id}__${row.opponent_id}`;
      const current = matchupMap.get(key) || {
        leader_id: row.leader_id,
        opponent_id: row.opponent_id,
        wins: 0,
        total_games: 0,
        first_wins: 0,
        first_games: 0,
        second_wins: 0,
        second_games: 0,
      };

      current.wins += row.wins || 0;
      current.total_games += row.total_games || 0;
      current.first_wins += row.first_wins || 0;
      current.first_games += row.first_games || 0;
      current.second_wins += row.second_wins || 0;
      current.second_games += row.second_games || 0;
      matchupMap.set(key, current);
    }

    const aggregatedMatchups: LeaderMatchupDailyStatRow[] = [...matchupMap.values()].map((row) => ({
      snapshot_date: endDate,
      period,
      leader_id: row.leader_id,
      opponent_id: row.opponent_id,
      wins: row.wins,
      total_games: row.total_games,
      matchup_win_rate: row.total_games > 0 ? row.wins / row.total_games : null,
      first_wins: row.first_wins,
      first_games: row.first_games,
      first_win_rate: row.first_games > 0 ? row.first_wins / row.first_games : null,
      second_wins: row.second_wins,
      second_games: row.second_games,
      second_win_rate: row.second_games > 0 ? row.second_wins / row.second_games : null,
      created_at: new Date().toISOString(),
    }));

    return {
      snapshotDate: endDate,
      period,
      leaders: aggregatedLeaders,
      matchups: aggregatedMatchups,
    };
  }
}

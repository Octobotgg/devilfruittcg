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

  getSnapshot(period: MatchIntelPeriod, snapshotDate: string): Promise<MatchIntelSnapshot | null>;
  getLatestSnapshot(period: MatchIntelPeriod): Promise<MatchIntelSnapshot | null>;
  getRecentSnapshotDates(period: MatchIntelPeriod, limit?: number): Promise<string[]>;
}

function requireServerSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)");

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

  async getSnapshot(period: MatchIntelPeriod, snapshotDate: string): Promise<MatchIntelSnapshot | null> {
    const [leadersRes, matchupsRes] = await Promise.all([
      this.client
        .from("leader_daily_stats")
        .select("*")
        .eq("period", period)
        .eq("snapshot_date", snapshotDate)
        .order("weighted_win_rate", { ascending: false }),
      this.client
        .from("leader_matchup_daily_stats")
        .select("*")
        .eq("period", period)
        .eq("snapshot_date", snapshotDate),
    ]);

    if (leadersRes.error) throw leadersRes.error;
    if (matchupsRes.error) throw matchupsRes.error;

    const leaders = (leadersRes.data || []) as LeaderDailyStatRow[];
    const matchups = (matchupsRes.data || []) as LeaderMatchupDailyStatRow[];

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
}

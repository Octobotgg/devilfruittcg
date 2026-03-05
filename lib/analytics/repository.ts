import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  LeaderDailyStatInsert,
  LeaderDailyStatRow,
  LeaderMatchupDailyStatInsert,
  LeaderMatchupDailyStatRow,
  MatchEventInsert,
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

  getMatchesByDeviceHash(deviceHash: string, limit?: number, offset?: number): Promise<MatchEventRow[]>;
  getLatestPlayerIndexMatches(searchTerm: string, limit?: number): Promise<PlayerIndexRow[]>;
  getLatestSnapshot(period: MatchIntelPeriod): Promise<MatchIntelSnapshot | null>;
}

function requireServerSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)");

  return { url, serviceRoleKey };
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

  async getMatchesByDeviceHash(deviceHash: string, limit = 100, offset = 0): Promise<MatchEventRow[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 200));
    const from = Math.max(0, offset);
    const to = from + normalizedLimit - 1;

    const { data, error } = await this.client
      .from("match_events")
      .select("*")
      .or(`p1_device_hash.eq.${deviceHash},p2_device_hash.eq.${deviceHash}`)
      .order("played_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return (data || []) as MatchEventRow[];
  }

  async getLatestPlayerIndexMatches(searchTerm: string, limit = 25): Promise<PlayerIndexRow[]> {
    const q = searchTerm.trim();
    if (!q) return [];

    const normalizedLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await this.client
      .from("player_index")
      .select("*")
      .or(`latest_player_name.ilike.%${q}%,device_hash.ilike.%${q}%`)
      .order("last_seen_at", { ascending: false })
      .limit(normalizedLimit);

    if (error) throw error;
    return (data || []) as PlayerIndexRow[];
  }

  async getLatestSnapshot(period: MatchIntelPeriod): Promise<MatchIntelSnapshot | null> {
    const { data: head, error: headError } = await this.client
      .from("leader_daily_stats")
      .select("snapshot_date")
      .eq("period", period)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (headError) throw headError;
    if (!head?.snapshot_date) return null;

    const snapshotDate = String(head.snapshot_date);

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

    return {
      snapshotDate,
      period,
      leaders: (leadersRes.data || []) as LeaderDailyStatRow[],
      matchups: (matchupsRes.data || []) as LeaderMatchupDailyStatRow[],
    };
  }
}

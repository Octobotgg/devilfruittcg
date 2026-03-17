import { META_DECKS } from "@/lib/meta-decks";
import { getSeededMeta, matchupDecksToMetaSnapshot, type MetaSnapshot } from "@/lib/data/meta";
import {
  asMatchIntelPeriod,
  createMatchIntelSupabaseRepository,
  snapshotToMatchupDecks,
  snapshotToMetaDecks,
  snapshotTotalMatches,
  type MatchIntelPeriod,
  type MatchIntelSnapshot,
} from "@/lib/analytics";
import { fetchLimitlessMatchups } from "@/lib/sources/limitless-matchups";
import { fetchGumGumMatchups } from "@/lib/sources/gumgum-matchups";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { getInsightDateWindow, parseInsightTimeRange, resolveEffectiveRange, toLimitlessTime, type InsightTimeRange } from "@/lib/competitive-time-range";
import { getOfficialCardById } from "@/lib/official-cards";

type MatchupPayload = {
  source: string;
  updatedAt: string;
  sampleGames: number;
  sampleLabel?: string;
  sampleDescription?: string;
  comparableSample?: boolean;
  decks: typeof META_DECKS;
  requestedRange: InsightTimeRange;
  effectiveRange: Exclude<InsightTimeRange, "season">;
};

function filterSnapshotForRankings<T extends { leaders: Array<{ leader_id: string; number_of_matches: number }>; matchups: Array<{ leader_id: string; opponent_id: string }> }>(
  snapshot: T,
  minimumMatches = 100
): T {
  const allowed = new Set(
    snapshot.leaders
      .filter((leader) => (leader.number_of_matches || 0) >= minimumMatches)
      .map((leader) => leader.leader_id)
  );

  if (!allowed.size) return snapshot;

  return {
    ...snapshot,
    leaders: snapshot.leaders.filter((leader) => allowed.has(leader.leader_id)),
    matchups: snapshot.matchups.filter((matchup) => allowed.has(matchup.leader_id) && allowed.has(matchup.opponent_id)),
  };
}

function leaderMatchesSet(leaderId: string, setCode: string): boolean {
  const official = getOfficialCardById(leaderId);
  if (official?.setCode) return official.setCode.toUpperCase() === setCode;
  return leaderId.toUpperCase().startsWith(`${setCode}-`);
}

function normalizeSnapshotSetFilter(value: string | null | undefined): string | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (!normalized || normalized === "ALL") return null;
  return normalized;
}

function filterSnapshotBySet<T extends { leaders: Array<{ leader_id: string }>; matchups: Array<{ leader_id: string; opponent_id: string }> }>(
  snapshot: T,
  setCode: string
): T {
  const normalizedSetCode = setCode.trim().toUpperCase();
  if (!normalizedSetCode) return snapshot;

  const allowed = new Set(
    snapshot.leaders
      .filter((leader) => leaderMatchesSet(leader.leader_id, normalizedSetCode))
      .map((leader) => leader.leader_id)
  );

  if (!allowed.size) {
    return {
      ...snapshot,
      leaders: [],
      matchups: [],
    };
  }

  return {
    ...snapshot,
    leaders: snapshot.leaders.filter((leader) => allowed.has(leader.leader_id)),
    matchups: snapshot.matchups.filter((matchup) => allowed.has(matchup.leader_id) && allowed.has(matchup.opponent_id)),
  };
}

function mergeSnapshots(period: MatchIntelPeriod, snapshots: MatchIntelSnapshot[]): MatchIntelSnapshot | null {
  const usable = snapshots.filter((snapshot) => snapshot.leaders.length > 0);
  if (!usable.length) return null;

  const totalMatches = usable.reduce((sum, snapshot) => sum + snapshotTotalMatches(snapshot), 0);
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

  for (const snapshot of usable) {
    for (const row of snapshot.leaders) {
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

      if (typeof row.first_win_rate === "number" && row.number_of_matches > 0) {
        current.firstWeightedWins += row.first_win_rate * row.number_of_matches;
        current.firstWeight += row.number_of_matches;
      }
      if (typeof row.second_win_rate === "number" && row.number_of_matches > 0) {
        current.secondWeightedWins += row.second_win_rate * row.number_of_matches;
        current.secondWeight += row.number_of_matches;
      }

      leaderMap.set(row.leader_id, current);
    }

    for (const row of snapshot.matchups) {
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
  }

  const snapshotDate = usable
    .map((snapshot) => snapshot.snapshotDate)
    .sort((a, b) => String(b).localeCompare(String(a)))[0];

  return {
    snapshotDate,
    period,
    leaders: [...leaderMap.values()].map((row) => {
      const rawWinRate = row.number_of_matches > 0 ? row.wins / row.number_of_matches : null;
      return {
        snapshot_date: snapshotDate,
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
    }),
    matchups: [...matchupMap.values()].map((row) => ({
      snapshot_date: snapshotDate,
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
    })),
  };
}

async function getCoveredSnapshotWindow(options: {
  periods: MatchIntelPeriod[];
  requestedRange: InsightTimeRange;
}): Promise<{ snapshot: MatchIntelSnapshot; startDate: string; endDate: string } | null> {
  const repo = createMatchIntelSupabaseRepository();
  const uniquePeriods = [...new Set(options.periods)];

  const bounds = await Promise.all(
    uniquePeriods.map(async (period) => ({
      period,
      ...(await repo.getSnapshotDateBounds(period)),
    }))
  );

  const available = bounds.filter((row): row is { period: MatchIntelPeriod; earliest: string; latest: string } => Boolean(row.earliest && row.latest));
  if (!available.length) return null;

  const latestSharedDate = [...available]
    .map((row) => row.latest)
    .sort((a, b) => String(a).localeCompare(String(b)))[0];

  const window = getInsightDateWindow(options.requestedRange, new Date(`${latestSharedDate}T00:00:00.000Z`));
  if (!window.startDate) return null;
  const { startDate, endDate } = window;

  const coveredPeriods = available
    .filter((row) => row.earliest <= startDate && row.latest >= endDate)
    .map((row) => row.period);

  if (!coveredPeriods.length) return null;

  const snapshots = await Promise.all(coveredPeriods.map((period) => repo.getAggregatedSnapshot(period, startDate, endDate)));
  const merged = mergeSnapshots(coveredPeriods[0], snapshots.filter((snapshot): snapshot is MatchIntelSnapshot => Boolean(snapshot)));
  return merged ? { snapshot: merged, startDate, endDate } : null;
}

function periodsForMetaRegion(region?: string, explicitPeriod?: string | null): MatchIntelPeriod[] {
  if (explicitPeriod) return [asMatchIntelPeriod(explicitPeriod)];

  switch (String(region || "").toLowerCase()) {
    case "asia":
      return ["east_p"];
    case "global":
      return ["west_p", "east_p"];
    default:
      return ["west_p"];
  }
}

function historicalAggregateSample(sampleGames: number) {
  return {
    sampleGames,
    sampleLabel: "Historical aggregate coverage",
    sampleDescription: "Broad all-time leader coverage",
    comparableSample: false,
  };
}

function numericSample(sampleGames: number, sampleDescription = "Logged games in range") {
  return {
    sampleGames,
    sampleDescription,
    comparableSample: true,
  };
}

export async function getHybridMatchupPayload(options: {
  range?: string | null;
  set?: string;
  type?: string;
  limit?: number;
  period?: string | null;
}): Promise<MatchupPayload> {
  const requestedRange = parseInsightTimeRange(options.range);
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const snapshotSetFilter = normalizeSnapshotSetFilter(options.set);
  const set = (options.set || "OP14").toUpperCase();
  const type = (options.type || "all").toLowerCase();
  const limit = Math.min(30, Math.max(8, Number(options.limit || 18)));
  const period = asMatchIntelPeriod(options.period || "west_p");
  if (effectiveRange === "all") {
    const gumgum = await fetchGumGumMatchups(limit);
    if (gumgum?.decks?.length) {
      return {
        source: "live-aggregate",
        updatedAt: gumgum.updatedAt,
        ...historicalAggregateSample(gumgum.sampleGames),
        decks: gumgum.decks,
        requestedRange,
        effectiveRange,
      };
    }
  }

  if (requestedRange !== "all" && isMatchIntelV2Enabled()) {
    try {
      const covered = await getCoveredSnapshotWindow({
        periods: [period],
        requestedRange,
      });
      const snapshot = covered?.snapshot
        ? snapshotSetFilter
          ? filterSnapshotBySet(covered.snapshot, snapshotSetFilter)
          : covered.snapshot
        : null;
      const filtered = snapshot ? filterSnapshotForRankings(snapshot) : null;
      if (covered && filtered?.leaders?.length) {
        return {
          source: "live-aggregate",
          updatedAt: new Date(`${covered.endDate}T00:00:00.000Z`).toISOString(),
          ...numericSample(snapshotTotalMatches(filtered)),
          decks: snapshotToMatchupDecks(filtered, null, limit),
          requestedRange,
          effectiveRange,
        };
      }
    } catch {
      // continue to broader aggregate fallback
    }
  }

  if (effectiveRange !== "all" && effectiveRange !== "1week") {
    const live = await fetchLimitlessMatchups(limit, set, toLimitlessTime(effectiveRange), type);
    if (live?.decks?.length) {
      return {
        source: "live-aggregate",
        updatedAt: live.updatedAt,
        ...numericSample(live.sampleGames),
        decks: live.decks,
        requestedRange,
        effectiveRange,
      };
    }
  }

  return {
    source: "seeded",
    updatedAt: new Date().toISOString(),
    sampleGames: 0,
    sampleDescription: "Awaiting live aggregate data",
    comparableSample: false,
    decks: META_DECKS,
    requestedRange,
    effectiveRange,
  };
}

export async function getHybridMetaPayload(options: {
  range?: string | null;
  format?: string;
  region?: string;
  period?: string | null;
}): Promise<MetaSnapshot & { requestedRange: InsightTimeRange; effectiveRange: Exclude<InsightTimeRange, "season"> }> {
  const requestedRange = parseInsightTimeRange(options.range);
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const format = (options.format || "OP14").toUpperCase();
  const periods = periodsForMetaRegion(options.region, options.period);

  if (requestedRange !== "all" && isMatchIntelV2Enabled()) {
    try {
      const covered = await getCoveredSnapshotWindow({
        periods,
        requestedRange,
      });
      const filtered = covered ? filterSnapshotForRankings(covered.snapshot) : null;
      if (covered && filtered?.leaders?.length) {
        const seededMeta = getSeededMeta();
        return {
          source: "live-aggregate",
          sources: ["live-aggregate"],
          updatedAt: new Date(`${covered.endDate}T00:00:00.000Z`).toISOString(),
          ...numericSample(snapshotTotalMatches(filtered)),
          metaDecks: snapshotToMetaDecks(filtered, null),
          regions: [
            {
              region: String(options.region || "").toLowerCase() === "asia" ? "Asia" : String(options.region || "").toLowerCase() === "global" ? "Global" : "West",
              events: 0,
              players: 0,
            },
          ],
          decks: seededMeta.decks,
          matchups: seededMeta.matchups,
          requestedRange,
          effectiveRange,
        };
      }
    } catch {
      // continue
    }
  }

  if (effectiveRange === "all") {
    const gumgum = await fetchGumGumMatchups(15);
    if (gumgum?.decks?.length) {
      return {
        ...matchupDecksToMetaSnapshot(gumgum.decks, {
          source: "live-aggregate",
          updatedAt: gumgum.updatedAt,
          ...historicalAggregateSample(gumgum.sampleGames),
        }),
        requestedRange,
        effectiveRange,
      };
    }
  }

  if (effectiveRange !== "all" && effectiveRange !== "1week") {
    const live = await fetchLimitlessMatchups(15, format, toLimitlessTime(effectiveRange), "all");
    if (live?.decks?.length) {
      return {
        ...matchupDecksToMetaSnapshot(live.decks, {
          source: "live-aggregate",
          updatedAt: live.updatedAt,
          ...numericSample(live.sampleGames),
        }),
        requestedRange,
        effectiveRange,
      };
    }
  }

  return {
    ...getSeededMeta(),
    requestedRange,
    effectiveRange,
  };
}

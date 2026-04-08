import { META_DECKS, type MetaDeck } from "@/lib/meta-decks";
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
import { fetchLimitlessMatchups, type LimitlessSnapshot } from "@/lib/sources/limitless-matchups";
import { fetchGumGumMatchups, type GumGumMatchupSnapshot } from "@/lib/sources/gumgum-matchups";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { getInsightDateWindow, parseInsightTimeRange, resolveEffectiveRange, toLimitlessTime, type InsightTimeRange } from "@/lib/competitive-time-range";
import {
  getCurrentMatchupFormat,
  getMatchupFormatWindow,
  isCardLegalInMatchupFormat,
  mergeWeightedMatchupRate,
} from "@/lib/matchup-format-windows";

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

type MatchupPairSample = {
  winRate: number;
  matches: number | null;
};

type MatchupSourceData = {
  key: "sim" | "limitless" | "gumgum";
  priority: number;
  updatedAt: string;
  sampleGames: number;
  decks: MetaDeck[];
  leaderSamples: Map<string, number>;
  matchupSamples: Map<string, Map<string, MatchupPairSample>>;
};

type HeadToHeadPayload = {
  leader: string;
  opponent: string;
  format: string;
  period: MatchIntelPeriod;
  source: string;
  range: InsightTimeRange;
  effectiveRange: Exclude<InsightTimeRange, "season">;
  winRate: number | null;
  matches: number | null;
  firstWinRate: number | null;
  firstGames: number | null;
  secondWinRate: number | null;
  secondGames: number | null;
  reverseWinRate: number | null;
  reverseMatches: number | null;
  reverseFirstWinRate: number | null;
  reverseFirstGames: number | null;
  reverseSecondWinRate: number | null;
  reverseSecondGames: number | null;
};

function tierFromRank(rank: number): MetaDeck["tier"] {
  if (rank <= 3) return "S";
  if (rank <= 6) return "A";
  if (rank <= 10) return "B";
  if (rank <= 14) return "C";
  return "D";
}

function trendFromWinRate(winRate: number): MetaDeck["trend"] {
  if (winRate >= 53) return "up";
  if (winRate <= 48) return "down";
  return "stable";
}

function buildSourceFromSnapshot(snapshot: MatchIntelSnapshot, updatedAt: string): MatchupSourceData | null {
  const filtered = filterSnapshotForRankings(snapshot);
  if (!filtered.leaders.length) return null;

  const decks = snapshotToMatchupDecks(filtered, null, 30);
  const leaderSamples = new Map(filtered.leaders.map((row) => [row.leader_id, row.number_of_matches || 0]));
  const matchupSamples = new Map<string, Map<string, MatchupPairSample>>();

  for (const row of filtered.matchups) {
    if (!matchupSamples.has(row.leader_id)) matchupSamples.set(row.leader_id, new Map());
    matchupSamples.get(row.leader_id)!.set(row.opponent_id, {
      winRate: typeof row.matchup_win_rate === "number" ? Number((row.matchup_win_rate * 100).toFixed(2)) : 50,
      matches: row.total_games || 0,
    });
  }

  return {
    key: "sim",
    priority: 0,
    updatedAt,
    sampleGames: snapshotTotalMatches(filtered),
    decks,
    leaderSamples,
    matchupSamples,
  };
}

function buildSourceFromTournamentSnapshot(
  key: "limitless" | "gumgum",
  priority: number,
  snapshot: LimitlessSnapshot | GumGumMatchupSnapshot
): MatchupSourceData | null {
  if (!snapshot.decks.length) return null;

  const leaderSamples = new Map<string, number>();
  const matchupSamples = new Map<string, Map<string, MatchupPairSample>>();

  for (const deck of snapshot.decks) {
    const estimate = snapshot.leaderSampleGames?.[deck.cardId]
      ?? Math.max(1, Math.round((snapshot.sampleGames * deck.metaShare) / 100));
    leaderSamples.set(deck.cardId, estimate);

    const row = new Map<string, MatchupPairSample>();
    const rawRow = snapshot.matchupSamples?.[deck.cardId] || {};
    for (const [opponentId, value] of Object.entries(rawRow)) {
      row.set(opponentId, value);
    }
    matchupSamples.set(deck.cardId, row);
  }

  return {
    key,
    priority,
    updatedAt: snapshot.updatedAt,
    sampleGames: snapshot.sampleGames,
    decks: snapshot.decks,
    leaderSamples,
    matchupSamples,
  };
}

function filterSourceForFormat(source: MatchupSourceData, format: string): MatchupSourceData {
  const allowedCards = new Set(
    source.decks
      .filter((deck) => isCardLegalInMatchupFormat(deck.cardId, format))
      .map((deck) => deck.cardId)
  );

  return {
    ...source,
    decks: source.decks.filter((deck) => allowedCards.has(deck.cardId)),
    leaderSamples: new Map([...source.leaderSamples.entries()].filter(([cardId]) => allowedCards.has(cardId))),
    matchupSamples: new Map(
      [...source.matchupSamples.entries()]
        .filter(([cardId]) => allowedCards.has(cardId))
        .map(([cardId, row]) => [
          cardId,
          new Map([...row.entries()].filter(([opponentId]) => allowedCards.has(opponentId))),
        ])
    ),
  };
}

async function getFormatWindowSnapshot(period: MatchIntelPeriod, format: string) {
  const window = getMatchupFormatWindow(format);
  if (!window) return null;

  const repo = createMatchIntelSupabaseRepository();
  const bounds = await repo.getSnapshotDateBounds(period);
  if (!bounds.earliest || !bounds.latest) return null;

  const startDate = bounds.earliest > window.startDate ? bounds.earliest : window.startDate;
  const desiredEndDate = window.endDate || bounds.latest;
  const endDate = desiredEndDate < bounds.latest ? desiredEndDate : bounds.latest;

  if (startDate > endDate) return null;

  const snapshot = await repo.getAggregatedSnapshot(period, startDate, endDate);
  return snapshot ? { snapshot, startDate, endDate } : null;
}

function mergeFormatSources(
  format: string,
  sources: MatchupSourceData[],
  limit: number
): { decks: MetaDeck[]; sampleGames: number; updatedAt: string } | null {
  const liveSources = sources.map((source) => filterSourceForFormat(source, format)).filter((source) => source.decks.length > 0);
  if (!liveSources.length) return null;

  const ranking = new Map<string, {
    cardId: string;
    sampleMatches: number;
    weightedWinTotal: number;
    weightedShareTotal: number;
    weight: number;
    preferredDeck: MetaDeck;
    preferredPriority: number;
  }>();

  for (const source of liveSources) {
    for (const deck of source.decks) {
      const weight = source.leaderSamples.get(deck.cardId)
        ?? Math.max(1, Math.round((source.sampleGames * deck.metaShare) / 100));

      const current = ranking.get(deck.cardId) || {
        cardId: deck.cardId,
        sampleMatches: 0,
        weightedWinTotal: 0,
        weightedShareTotal: 0,
        weight: 0,
        preferredDeck: deck,
        preferredPriority: source.priority,
      };

      current.sampleMatches += weight;
      current.weight += weight;
      current.weightedWinTotal += deck.winRate * weight;
      current.weightedShareTotal += deck.metaShare * weight;

      if (source.priority < current.preferredPriority) {
        current.preferredDeck = deck;
        current.preferredPriority = source.priority;
      }

      ranking.set(deck.cardId, current);
    }
  }

  const rankedIds = [...ranking.values()]
    .sort((a, b) => b.sampleMatches - a.sampleMatches || b.weightedShareTotal - a.weightedShareTotal)
    .slice(0, limit)
    .map((row) => row.cardId);

  const mergedDecks = rankedIds.map((cardId, index) => {
    const aggregate = ranking.get(cardId)!;
    const base = aggregate.preferredDeck;
    const weight = Math.max(1, aggregate.weight);
    const winRate = Number((aggregate.weightedWinTotal / weight).toFixed(2));
    const metaShare = Number((aggregate.weightedShareTotal / weight).toFixed(2));

    return {
      ...base,
      tier: tierFromRank(index + 1),
      winRate,
      metaShare,
      trend: trendFromWinRate(winRate),
      description: `${aggregate.sampleMatches.toLocaleString()} weighted matches in ${format}`,
      matchups: {} as Record<string, number>,
    } satisfies MetaDeck;
  });

  const mergedByCardId = new Map(mergedDecks.map((deck) => [deck.cardId, deck]));

  for (const rowDeck of mergedDecks) {
    for (const colDeck of mergedDecks) {
      if (rowDeck.cardId === colDeck.cardId) {
        rowDeck.matchups[colDeck.id] = 50;
        continue;
      }

      const merged = mergeWeightedMatchupRate(
        liveSources
          .map((source) => {
            const pair = source.matchupSamples.get(rowDeck.cardId)?.get(colDeck.cardId);
            if (!pair) return null;
            return {
              winRate: pair.winRate,
              matches: pair.matches,
              priority: source.priority,
            };
          })
          .filter((value): value is { winRate: number; matches: number | null; priority: number } => Boolean(value))
      );

      rowDeck.matchups[mergedByCardId.get(colDeck.cardId)!.id] = merged.winRate ?? 50;
    }
  }

  const updatedAt = liveSources
    .map((source) => source.updatedAt)
    .sort((a, b) => String(b).localeCompare(String(a)))[0];

  const sampleGames = mergedDecks.reduce((sum, deck) => {
    const aggregate = ranking.get(deck.cardId);
    return sum + (aggregate?.sampleMatches || 0);
  }, 0);

  return {
    decks: mergedDecks,
    sampleGames,
    updatedAt,
  };
}

export async function getHybridMatchupPayload(options: {
  range?: string | null;
  format?: string;
  type?: string;
  limit?: number;
  period?: string | null;
}): Promise<MatchupPayload> {
  const requestedRange = parseInsightTimeRange(options.range);
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const format = (options.format || getCurrentMatchupFormat()).toUpperCase();
  const type = (options.type || "all").toLowerCase();
  const limit = Math.min(30, Math.max(8, Number(options.limit || 18)));
  const period = asMatchIntelPeriod(options.period || "west_p");
  const sources: MatchupSourceData[] = [];

  if (isMatchIntelV2Enabled()) {
    try {
      const covered = await getFormatWindowSnapshot(period, format);
      if (covered?.snapshot) {
        const simSource = buildSourceFromSnapshot(
          covered.snapshot,
          new Date(`${covered.endDate}T00:00:00.000Z`).toISOString(),
        );
        if (simSource) sources.push(simSource);
      }
    } catch {
      // continue
    }
  }

  try {
    const live = await fetchLimitlessMatchups(30, format, "all", type);
    const limitlessSource = live ? buildSourceFromTournamentSnapshot("limitless", 1, live) : null;
    if (limitlessSource) sources.push(limitlessSource);
  } catch {
    // continue
  }

  if (format === getCurrentMatchupFormat()) {
    try {
      const gumgum = await fetchGumGumMatchups(30);
      const gumgumSource = gumgum ? buildSourceFromTournamentSnapshot("gumgum", 2, gumgum) : null;
      if (gumgumSource) sources.push(gumgumSource);
    } catch {
      // continue
    }
  }

  const merged = mergeFormatSources(format, sources, limit);
  if (merged?.decks.length) {
    return {
      source: "live-aggregate",
      updatedAt: merged.updatedAt,
      sampleGames: merged.sampleGames,
      sampleLabel: `${merged.sampleGames.toLocaleString()} weighted matchup samples`,
      sampleDescription: `${format} format window coverage`,
      comparableSample: true,
      decks: merged.decks,
      requestedRange,
      effectiveRange,
    };
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

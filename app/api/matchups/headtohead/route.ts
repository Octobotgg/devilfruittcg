import { NextRequest, NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { fetchGumGumMatchups } from "@/lib/sources/gumgum-matchups";
import { parseInsightTimeRange, resolveEffectiveRange } from "@/lib/competitive-time-range";
import {
  getCurrentMatchupFormat,
  getMatchupFormatWindow,
  mergeWeightedMatchupRate,
} from "@/lib/matchup-format-windows";

function parseWinRow(html: string, opponentId: string) {
  const re = /<tr\s+data-name="[^"]*"\s+data-matches="(\d+)"\s+data-winrate="([0-9.]+)">[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\/matchups\?game=OP[^\"]*">/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const matches = Number(m[1]);
    const winrate = Number(m[2]) * 100;
    const opp = m[3].toUpperCase();
    if (opp === opponentId.toUpperCase()) {
      return { matches, winRate: Number(winrate.toFixed(2)) };
    }
  }
  return null;
}

type HeadToHeadSide = {
  winRate: number | null;
  matches: number;
  firstWinRate: number | null;
  firstGames: number | null;
  secondWinRate: number | null;
  secondGames: number | null;
};

function fromRow(
  row:
    | {
        matchup_win_rate?: number | null;
        total_games?: number;
        first_win_rate?: number | null;
        first_games?: number;
        second_win_rate?: number | null;
        second_games?: number;
      }
    | null
    | undefined,
): HeadToHeadSide | null {
  if (!row) return null;
  return {
    winRate: typeof row.matchup_win_rate === "number" ? Number((row.matchup_win_rate * 100).toFixed(2)) : null,
    matches: row.total_games ?? 0,
    firstWinRate: typeof row.first_win_rate === "number" ? Number((row.first_win_rate * 100).toFixed(2)) : null,
    firstGames: row.first_games ?? null,
    secondWinRate: typeof row.second_win_rate === "number" ? Number((row.second_win_rate * 100).toFixed(2)) : null,
    secondGames: row.second_games ?? null,
  };
}

function fromSnapshot(
  snapshot: {
    matchups: Array<{
      leader_id: string;
      opponent_id: string;
      matchup_win_rate: number | null;
      total_games: number;
      first_win_rate?: number | null;
      first_games?: number;
      second_win_rate?: number | null;
      second_games?: number;
    }>;
  },
  leader: string,
  opponent: string
) {
  const forward = snapshot.matchups.find((r) => r.leader_id === leader && r.opponent_id === opponent);
  const reverse = snapshot.matchups.find((r) => r.leader_id === opponent && r.opponent_id === leader);

  if (!forward && !reverse) return null;
  const forwardDirect = fromRow(forward);
  const reverseDirect = fromRow(reverse);

  return {
    winRate: forwardDirect?.winRate ?? null,
    matches: forwardDirect?.matches ?? 0,
    firstWinRate: forwardDirect?.firstWinRate ?? null,
    firstGames: forwardDirect?.firstGames ?? null,
    secondWinRate: forwardDirect?.secondWinRate ?? null,
    secondGames: forwardDirect?.secondGames ?? null,

    reverseWinRate: reverseDirect?.winRate ?? null,
    reverseMatches: reverseDirect?.matches ?? 0,
    reverseFirstWinRate: reverseDirect?.firstWinRate ?? null,
    reverseFirstGames: reverseDirect?.firstGames ?? null,
    reverseSecondWinRate: reverseDirect?.secondWinRate ?? null,
    reverseSecondGames: reverseDirect?.secondGames ?? null,
  };
}

export async function GET(req: NextRequest) {
  const leader = (req.nextUrl.searchParams.get("leader") || "").toUpperCase();
  const opponent = (req.nextUrl.searchParams.get("opponent") || "").toUpperCase();
  const format = (req.nextUrl.searchParams.get("format") || "OP15").toUpperCase();
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const requestedRange = parseInsightTimeRange(req.nextUrl.searchParams.get("range"));
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const matchIntelV2 = true;
  const formatWindow = getMatchupFormatWindow(format);

  if (!leader || !opponent) {
    return NextResponse.json({ error: "leader and opponent are required" }, { status: 400 });
  }

  let simMapped: ReturnType<typeof fromSnapshot> | null = null;
  if (formatWindow && matchIntelV2) {
    try {
      const repo = createMatchIntelSupabaseRepository();
      const bounds = await repo.getSnapshotDateBounds(period);
      const startDate =
        bounds.earliest && bounds.earliest > formatWindow.startDate ? bounds.earliest : formatWindow.startDate;
      const endDate =
        bounds.latest && formatWindow.endDate && formatWindow.endDate < bounds.latest
          ? formatWindow.endDate
          : bounds.latest;

      const snapshot =
        bounds.earliest && bounds.latest && startDate && endDate && startDate <= endDate
          ? await repo.getAggregatedSnapshot(period, startDate, endDate)
          : null;
      if (snapshot?.matchups?.length) {
        simMapped = fromSnapshot(snapshot, leader, opponent);
      }
    } catch {
      // continue
    }
  }

  let gumgumMapped:
    | {
        winRate: number | null;
        matches: number | null;
        reverseWinRate: number | null;
        reverseMatches: number | null;
      }
    | null = null;
  if (format === getCurrentMatchupFormat()) {
    try {
      const gumgum = await fetchGumGumMatchups(30);
      const row = gumgum?.decks.find((deck) => deck.cardId === leader);
      const reverse = gumgum?.decks.find((deck) => deck.cardId === opponent);
      const opponentId = reverse?.id;
      const leaderId = row?.id;
      const forwardWinRate = row && opponentId ? row.matchups[opponentId] ?? null : null;
      const reverseWinRate = reverse && leaderId ? reverse.matchups[leaderId] ?? null : null;
      const forwardMatches = gumgum?.matchupSamples?.[leader]?.[opponent]?.matches ?? null;
      const reverseMatches = gumgum?.matchupSamples?.[opponent]?.[leader]?.matches ?? null;
      if ((row || reverse) && (forwardWinRate != null || reverseWinRate != null)) {
        gumgumMapped = {
          winRate: forwardWinRate,
          matches: forwardMatches,
          reverseWinRate,
          reverseMatches,
        };
      }
    } catch {
      // continue to Limitless fallback
    }
  }

  let limitlessMapped:
    | {
        winRate: number | null;
        matches: number | null;
        reverseWinRate: number | null;
        reverseMatches: number | null;
      }
    | null = null;
  try {
    const aHtml = await fetch(
      `https://play.limitlesstcg.com/decks/${leader}/matchups?game=OP&set=${encodeURIComponent(format)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }
    ).then((r) => r.text());

    const bHtml = await fetch(
      `https://play.limitlesstcg.com/decks/${opponent}/matchups?game=OP&set=${encodeURIComponent(format)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }
    ).then((r) => r.text());

    const a = parseWinRow(aHtml, opponent);
    const b = parseWinRow(bHtml, leader);
    limitlessMapped = {
      winRate: a?.winRate ?? null,
      matches: a?.matches ?? 0,
      reverseWinRate: b?.winRate ?? null,
      reverseMatches: b?.matches ?? 0,
    };
  } catch {
    // continue to terminal no-data response
  }

  const forward = mergeWeightedMatchupRate(
    [
      simMapped
        ? { winRate: simMapped.winRate, matches: simMapped.matches, priority: 0 }
        : null,
      limitlessMapped
        ? { winRate: limitlessMapped.winRate, matches: limitlessMapped.matches, priority: 1 }
        : null,
      gumgumMapped
        ? { winRate: gumgumMapped.winRate, matches: gumgumMapped.matches, priority: 2 }
        : null,
    ].filter((value): value is { winRate: number | null; matches: number | null; priority: number } => Boolean(value))
  );

  const reverse = mergeWeightedMatchupRate(
    [
      simMapped
        ? { winRate: simMapped.reverseWinRate, matches: simMapped.reverseMatches, priority: 0 }
        : null,
      limitlessMapped
        ? { winRate: limitlessMapped.reverseWinRate, matches: limitlessMapped.reverseMatches, priority: 1 }
        : null,
      gumgumMapped
        ? { winRate: gumgumMapped.reverseWinRate, matches: gumgumMapped.reverseMatches, priority: 2 }
        : null,
    ].filter((value): value is { winRate: number | null; matches: number | null; priority: number } => Boolean(value))
  );

  if (forward.winRate != null || reverse.winRate != null) {
    return NextResponse.json(
      {
        leader,
        opponent,
        format,
        period,
        range: requestedRange,
        effectiveRange,
        winRate: forward.winRate,
        matches: forward.matches,
        firstWinRate: simMapped?.firstWinRate ?? null,
        firstGames: simMapped?.firstGames ?? null,
        secondWinRate: simMapped?.secondWinRate ?? null,
        secondGames: simMapped?.secondGames ?? null,
        reverseWinRate: reverse.winRate,
        reverseMatches: reverse.matches,
        reverseFirstWinRate: simMapped?.reverseFirstWinRate ?? null,
        reverseFirstGames: simMapped?.reverseFirstGames ?? null,
        reverseSecondWinRate: simMapped?.reverseSecondWinRate ?? null,
        reverseSecondGames: simMapped?.reverseSecondGames ?? null,
        source: "live-aggregate",
        featureFlags: {
          matchIntelV2,
        },
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  }

  return NextResponse.json(
    {
      leader,
      opponent,
      period,
      range: requestedRange,
      effectiveRange,
      source: "no-data",
      featureFlags: { matchIntelV2 },
      winRate: null,
      matches: 0,
      firstWinRate: null,
      firstGames: null,
      secondWinRate: null,
      secondGames: null,
      reverseWinRate: null,
      reverseMatches: 0,
      reverseFirstWinRate: null,
      reverseFirstGames: null,
      reverseSecondWinRate: null,
      reverseSecondGames: null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

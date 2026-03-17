import { NextRequest, NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { fetchGumGumMatchups } from "@/lib/sources/gumgum-matchups";
import { getInsightDateWindow, parseInsightTimeRange, resolveEffectiveRange, toLimitlessTime } from "@/lib/competitive-time-range";

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
  const set = (req.nextUrl.searchParams.get("set") || "OP12").toUpperCase();
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const requestedRange = parseInsightTimeRange(req.nextUrl.searchParams.get("range"));
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const matchIntelV2 = isMatchIntelV2Enabled();

  if (!leader || !opponent) {
    return NextResponse.json({ error: "leader and opponent are required" }, { status: 400 });
  }

  if (requestedRange !== "all" && matchIntelV2) {
    try {
      const repo = createMatchIntelSupabaseRepository();
      const bounds = await repo.getSnapshotDateBounds(period);
      const snapshotWindow = bounds.latest ? getInsightDateWindow(requestedRange, new Date(`${bounds.latest}T00:00:00.000Z`)) : null;
      const covered =
        snapshotWindow?.startDate &&
        bounds.earliest &&
        bounds.latest &&
        bounds.earliest <= snapshotWindow.startDate &&
        bounds.latest >= snapshotWindow.endDate;
      const snapshot = covered && snapshotWindow?.startDate ? await repo.getAggregatedSnapshot(period, snapshotWindow.startDate, snapshotWindow.endDate) : null;
      if (snapshot?.matchups?.length) {
        const mapped = fromSnapshot(snapshot, leader, opponent);
        if (mapped) {
          return NextResponse.json(
            {
              leader,
              opponent,
              period,
              source: "live-aggregate",
              range: requestedRange,
              effectiveRange,
              featureFlags: { matchIntelV2 },
              ...mapped,
            },
            { status: 200, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } }
          );
        }
      }
    } catch {
      // continue
    }
  }

  if (effectiveRange === "all") {
    try {
      const gumgum = await fetchGumGumMatchups(30);
      const row = gumgum?.decks.find((deck) => deck.cardId === leader);
      const reverse = gumgum?.decks.find((deck) => deck.cardId === opponent);
      const opponentId = reverse?.id;
      const leaderId = row?.id;
      const forwardWinRate = row && opponentId ? row.matchups[opponentId] ?? null : null;
      const reverseWinRate = reverse && leaderId ? reverse.matchups[leaderId] ?? null : null;
      if ((row || reverse) && (forwardWinRate != null || reverseWinRate != null)) {
        return NextResponse.json(
          {
            leader,
            opponent,
            period,
            source: "live-aggregate",
            range: requestedRange,
            effectiveRange,
            featureFlags: { matchIntelV2 },
            winRate: forwardWinRate,
            matches: null,
            firstWinRate: null,
            firstGames: null,
            secondWinRate: null,
            secondGames: null,
            reverseWinRate,
            reverseMatches: null,
            reverseFirstWinRate: null,
            reverseFirstGames: null,
            reverseSecondWinRate: null,
            reverseSecondGames: null,
          },
          { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
        );
      }
    } catch {
      // continue to Limitless fallback
    }
  }

  try {
    const time =
      effectiveRange === "all"
        ? "all"
        : toLimitlessTime(effectiveRange as "1month" | "3months" | "6months" | "year");

    const aHtml = await fetch(
      `https://play.limitlesstcg.com/decks/${leader}/matchups?game=OP&set=${encodeURIComponent(set)}${time === "all" ? "" : `&time=${encodeURIComponent(time)}`}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }
    ).then((r) => r.text());

    const bHtml = await fetch(
      `https://play.limitlesstcg.com/decks/${opponent}/matchups?game=OP&set=${encodeURIComponent(set)}${time === "all" ? "" : `&time=${encodeURIComponent(time)}`}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }
    ).then((r) => r.text());

    const a = parseWinRow(aHtml, opponent);
    const b = parseWinRow(bHtml, leader);

    return NextResponse.json(
      {
        leader,
        opponent,
        set,
        period,
        range: requestedRange,
        effectiveRange,
        winRate: a?.winRate ?? null,
        matches: a?.matches ?? 0,
        firstWinRate: null,
        firstGames: null,
        secondWinRate: null,
        secondGames: null,
        reverseWinRate: b?.winRate ?? null,
        reverseMatches: b?.matches ?? 0,
        reverseFirstWinRate: null,
        reverseFirstGames: null,
        reverseSecondWinRate: null,
        reverseSecondGames: null,
        source: "live-aggregate",
        featureFlags: {
          matchIntelV2,
        },
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // continue to terminal no-data response
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

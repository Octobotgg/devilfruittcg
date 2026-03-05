import { NextRequest, NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { fetchExternalSnapshotBridge } from "@/lib/sources/external-snapshot-bridge";

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

  const pct = (v?: number | null) => (typeof v === "number" ? Number((v * 100).toFixed(2)) : null);

  return {
    winRate: pct(forward?.matchup_win_rate),
    matches: forward?.total_games ?? 0,
    firstWinRate: pct(forward?.first_win_rate),
    firstGames: forward?.first_games ?? null,
    secondWinRate: pct(forward?.second_win_rate),
    secondGames: forward?.second_games ?? null,

    reverseWinRate: pct(reverse?.matchup_win_rate),
    reverseMatches: reverse?.total_games ?? 0,
    reverseFirstWinRate: pct(reverse?.first_win_rate),
    reverseFirstGames: reverse?.first_games ?? null,
    reverseSecondWinRate: pct(reverse?.second_win_rate),
    reverseSecondGames: reverse?.second_games ?? null,
  };
}

export async function GET(req: NextRequest) {
  const leader = (req.nextUrl.searchParams.get("leader") || "").toUpperCase();
  const opponent = (req.nextUrl.searchParams.get("opponent") || "").toUpperCase();
  const set = (req.nextUrl.searchParams.get("set") || "OP12").toUpperCase();
  const time = (req.nextUrl.searchParams.get("time") || "3months").toLowerCase();
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const matchIntelV2 = isMatchIntelV2Enabled();

  if (!leader || !opponent) {
    return NextResponse.json({ error: "leader and opponent are required" }, { status: 400 });
  }

  // Prefer large-sample external snapshot bridge first.
  let bridgeSnapshotAvailable = false;
  try {
    const bridge = await fetchExternalSnapshotBridge(period, { maxLookbackDays: 2 });
    if (bridge?.snapshot?.matchups?.length) {
      bridgeSnapshotAvailable = true;
      const mapped = fromSnapshot(bridge.snapshot, leader, opponent);
      if (mapped) {
        return NextResponse.json(
          {
            leader,
            opponent,
            period,
            source: "bridge:external-snapshot",
            featureFlags: { matchIntelV2 },
            ...mapped,
          },
          { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } }
        );
      }

      // Snapshot exists but pair is not represented in large-sample data.
      return NextResponse.json(
        {
          leader,
          opponent,
          period,
          source: "bridge:external-snapshot",
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
          note: "no_large_sample_pair_data",
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } }
      );
    }
  } catch {
    // continue
  }

  if (matchIntelV2) {
    try {
      const repo = createMatchIntelSupabaseRepository();
      const snapshot = await repo.getLatestSnapshot(period);
      if (snapshot?.matchups?.length) {
        const mapped = fromSnapshot(snapshot, leader, opponent);
        if (mapped) {
          return NextResponse.json(
            {
              leader,
              opponent,
              period,
              source: "match-intel-v2",
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

  // Only use small-sample tournament fallback when no bridge snapshot is available.
  if (!bridgeSnapshotAvailable) {
    try {
      const aHtml = await fetch(
        `https://play.limitlesstcg.com/decks/${leader}/matchups?game=OP&set=${encodeURIComponent(set)}&time=${encodeURIComponent(time)}`,
        {
          headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
          cache: "no-store",
        }
      ).then((r) => r.text());

      const bHtml = await fetch(
        `https://play.limitlesstcg.com/decks/${opponent}/matchups?game=OP&set=${encodeURIComponent(set)}&time=${encodeURIComponent(time)}`,
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
          time,
          period,
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
          source: "tournament-aggregate",
          featureFlags: {
            matchIntelV2,
          },
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    } catch {
      // continue to terminal no-data response
    }
  }

  return NextResponse.json(
    {
      leader,
      opponent,
      period,
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

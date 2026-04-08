import { NextRequest, NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { parseInsightTimeRange, resolveEffectiveRange } from "@/lib/competitive-time-range";
import { getLatestMatchupSnapshotInWindow, resolveSimHeadToHead } from "@/lib/matchup-sim-resolver";

export async function GET(req: NextRequest) {
  const leader = (req.nextUrl.searchParams.get("leader") || "").toUpperCase();
  const opponent = (req.nextUrl.searchParams.get("opponent") || "").toUpperCase();
  const format = (req.nextUrl.searchParams.get("format") || "OP15").toUpperCase();
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const requestedRange = parseInsightTimeRange(req.nextUrl.searchParams.get("range"));
  const effectiveRange = resolveEffectiveRange(requestedRange);
  const matchIntelV2 = true;

  if (!leader || !opponent) {
    return NextResponse.json({ error: "leader and opponent are required" }, { status: 400 });
  }

  try {
    const repo = createMatchIntelSupabaseRepository();
    const covered = await getLatestMatchupSnapshotInWindow(repo, period, format);

    if (covered?.snapshot) {
      const result = resolveSimHeadToHead(covered.snapshot, leader, opponent);

      return NextResponse.json(
        {
          leader,
          opponent,
          format,
          period,
          range: requestedRange,
          effectiveRange,
          ...result,
          source: "sim-snapshot",
          featureFlags: {
            matchIntelV2,
          },
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } },
      );
    }
  } catch {
    // continue to neutral fallback response
  }

  return NextResponse.json(
    {
      leader,
      opponent,
      format,
      period,
      range: requestedRange,
      effectiveRange,
      winRate: 50,
      matches: 0,
      firstWinRate: null,
      firstGames: null,
      secondWinRate: null,
      secondGames: null,
      reverseWinRate: 50,
      reverseMatches: 0,
      reverseFirstWinRate: null,
      reverseFirstGames: null,
      reverseSecondWinRate: null,
      reverseSecondGames: null,
      source: "no-data",
      featureFlags: {
        matchIntelV2,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

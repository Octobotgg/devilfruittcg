import { NextRequest, NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { fetchLimitlessMatchups } from "@/lib/sources/limitless-matchups";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import {
  asMatchIntelPeriod,
  createMatchIntelSupabaseRepository,
  snapshotToMatchupDecks,
  snapshotTotalMatches,
} from "@/lib/analytics";
import { fetchExternalSnapshotBridge } from "@/lib/sources/external-snapshot-bridge";

export async function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") || process.env.MATCHUPS_SET || "OP12").toUpperCase();
  const time = (req.nextUrl.searchParams.get("time") || "3months").toLowerCase();
  const type = (req.nextUrl.searchParams.get("type") || "all").toLowerCase();
  const limit = Math.min(30, Math.max(8, Number(req.nextUrl.searchParams.get("limit") || 18)));

  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const matchIntelV2 = isMatchIntelV2Enabled();

  // Prefer large-sample external snapshot bridge first.
  try {
    const bridge = await fetchExternalSnapshotBridge(period, { maxLookbackDays: 2 });
    if (bridge?.snapshot?.leaders?.length) {
      const decks = snapshotToMatchupDecks(bridge.snapshot, null, limit);
      return NextResponse.json(
        {
          source: "bridge:external-snapshot",
          sources: ["bridge:external-snapshot"],
          updatedAt: new Date(`${bridge.snapshot.snapshotDate}T00:00:00.000Z`).toISOString(),
          sampleGames: snapshotTotalMatches(bridge.snapshot),
          period,
          snapshotDate: bridge.snapshot.snapshotDate,
          decks,
          featureFlags: {
            matchIntelV2,
          },
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" } }
      );
    }
  } catch {
    // continue to v2/fallback chain
  }

  if (matchIntelV2) {
    try {
      const repo = createMatchIntelSupabaseRepository();
      const dates = await repo.getRecentSnapshotDates(period, 2);
      if (dates.length) {
        const [currentSnapshot, previousSnapshot] = await Promise.all([
          repo.getSnapshot(period, dates[0]),
          dates[1] ? repo.getSnapshot(period, dates[1]) : Promise.resolve(null),
        ]);

        if (currentSnapshot?.leaders?.length) {
          const decks = snapshotToMatchupDecks(currentSnapshot, previousSnapshot, limit);
          return NextResponse.json(
            {
              source: "match-intel-v2",
              sources: ["match-intel-v2"],
              updatedAt: new Date(`${currentSnapshot.snapshotDate}T00:00:00.000Z`).toISOString(),
              sampleGames: snapshotTotalMatches(currentSnapshot),
              period,
              snapshotDate: currentSnapshot.snapshotDate,
              decks,
              featureFlags: {
                matchIntelV2,
              },
            },
            { status: 200, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } }
          );
        }
      }
    } catch {
      // continue fallback chain
    }
  }

  try {
    const live = await fetchLimitlessMatchups(limit, set, time, type);
    if (live?.decks?.length) {
      return NextResponse.json(
        {
          source: "tournament-aggregate",
          sources: ["tournament-aggregate"],
          updatedAt: live.updatedAt,
          sampleGames: live.sampleGames,
          decks: live.decks,
          featureFlags: {
            matchIntelV2,
          },
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // continue fallback chain
  }

  return NextResponse.json(
    {
      source: "seeded fallback",
      sources: ["seeded"],
      updatedAt: new Date().toISOString(),
      sampleGames: 0,
      decks: META_DECKS,
      featureFlags: {
        matchIntelV2,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

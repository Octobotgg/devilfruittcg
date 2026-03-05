import { NextRequest, NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository, snapshotTotalMatches } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

function trendLabel(delta: number): "up" | "down" | "stable" {
  if (delta >= 0.005) return "up";
  if (delta <= -0.005) return "down";
  return "stable";
}

export async function GET(req: NextRequest) {
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || "west_p");
  const limit = Math.max(5, Math.min(50, Number(req.nextUrl.searchParams.get("limit") || 20)));
  const matchIntelV2 = isMatchIntelV2Enabled();

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
          const prevMap = new Map<string, number>();
          for (const row of previousSnapshot?.leaders || []) {
            prevMap.set(row.leader_id, row.weighted_win_rate ?? row.raw_win_rate ?? 0.5);
          }

          const leaders = [...currentSnapshot.leaders]
            .sort((a, b) => {
              const wa = a.weighted_win_rate ?? a.raw_win_rate ?? 0;
              const wb = b.weighted_win_rate ?? b.raw_win_rate ?? 0;
              if (wb !== wa) return wb - wa;
              return b.number_of_matches - a.number_of_matches;
            })
            .slice(0, limit)
            .map((row, index) => {
              const wr = row.weighted_win_rate ?? row.raw_win_rate ?? 0.5;
              const prev = prevMap.get(row.leader_id) ?? wr;
              return {
                rank: index + 1,
                leader: row.leader_id,
                leaderName: row.leader_name,
                wins: row.wins,
                number_of_matches: row.number_of_matches,
                total_matches: row.total_matches,
                raw_win_rate: row.raw_win_rate,
                play_rate: row.play_rate,
                weighted_win_rate: row.weighted_win_rate,
                first_win_rate: row.first_win_rate,
                second_win_rate: row.second_win_rate,
                trend: trendLabel(wr - prev),
              };
            });

          return NextResponse.json(
            {
              source: "match-intel-v2",
              sources: ["match-intel-v2"],
              period,
              snapshotDate: currentSnapshot.snapshotDate,
              updatedAt: new Date(`${currentSnapshot.snapshotDate}T00:00:00.000Z`).toISOString(),
              sampleGames: snapshotTotalMatches(currentSnapshot),
              leaders,
              featureFlags: {
                matchIntelV2,
              },
            },
            { status: 200, headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" } }
          );
        }
      }
    } catch {
      // continue to fallback response
    }
  }

  const fallback = META_DECKS.slice(0, limit).map((deck, i) => ({
    rank: i + 1,
    leader: deck.cardId,
    leaderName: deck.name,
    wins: 0,
    number_of_matches: 0,
    total_matches: 0,
    raw_win_rate: deck.winRate / 100,
    play_rate: deck.metaShare / 100,
    weighted_win_rate: deck.winRate / 100,
    first_win_rate: null,
    second_win_rate: null,
    trend: deck.trend,
  }));

  return NextResponse.json(
    {
      source: "seeded fallback",
      sources: ["seeded"],
      period,
      updatedAt: new Date().toISOString(),
      sampleGames: 0,
      leaders: fallback,
      featureFlags: {
        matchIntelV2,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

import { NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository, snapshotTotalMatches } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { fetchCardKaizokuBridgeSnapshot } from "@/lib/sources/cardkaizoku-bridge";

export async function GET() {
  const matchIntelV2 = isMatchIntelV2Enabled();
  const defaultPeriod = asMatchIntelPeriod("west_p");

  try {
    const repo = createMatchIntelSupabaseRepository();

    const [totalMatchLogs, indexedPlayers, latestSnapshot] = await Promise.all([
      repo.countMatchEvents(),
      repo.countPlayerIndex(),
      repo.getLatestSnapshot(defaultPeriod),
    ]);

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        totalMatchLogs,
        indexedPlayers,
        bridgedSampleGames: latestSnapshot ? snapshotTotalMatches(latestSnapshot) : 0,
        period: defaultPeriod,
        updatedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    let bridgedSampleGames = 0;
    let bridgeSourceUrl: string | null = null;

    try {
      const bridge = await fetchCardKaizokuBridgeSnapshot(defaultPeriod, { maxLookbackDays: 2 });
      if (bridge?.snapshot) {
        bridgedSampleGames = snapshotTotalMatches(bridge.snapshot);
        bridgeSourceUrl = bridge.sourceUrl;
      }
    } catch {
      // ignore secondary failures
    }

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        totalMatchLogs: 0,
        indexedPlayers: 0,
        bridgedSampleGames,
        bridgeSourceUrl,
        period: defaultPeriod,
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

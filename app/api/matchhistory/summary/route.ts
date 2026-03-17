import { NextResponse } from "next/server";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository, snapshotTotalMatches } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { fetchExternalSnapshotBridge } from "@/lib/sources/external-snapshot-bridge";
import { isMatchIntelSyncConfigured } from "@/lib/analytics/snapshot-sync";

export async function GET() {
  const matchIntelV2 = isMatchIntelV2Enabled();
  const defaultPeriod = asMatchIntelPeriod("west_p");
  const syncConfigured = isMatchIntelSyncConfigured();

  try {
    const repo = createMatchIntelSupabaseRepository();

    const [totalMatchLogs, indexedPlayers, latestSnapshot, latestMatchEventAt] = await Promise.all([
      repo.countMatchEvents(),
      repo.countPlayerIndex(),
      repo.getLatestSnapshot(defaultPeriod),
      repo.getLatestMatchEventAt(),
    ]);

    const snapshotUpdatedAt = latestSnapshot
      ? new Date(`${latestSnapshot.snapshotDate}T00:00:00.000Z`).toISOString()
      : null;

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        syncConfigured,
        totalMatchLogs,
        indexedPlayers,
        bridgedSampleGames: latestSnapshot ? snapshotTotalMatches(latestSnapshot) : 0,
        period: defaultPeriod,
        latestMatchEventAt,
        latestSnapshotDate: latestSnapshot?.snapshotDate || null,
        updatedAt: snapshotUpdatedAt,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    let bridgedSampleGames = 0;
    let bridgeUpdatedAt: string | null = null;
    let latestSnapshotDate: string | null = null;

    try {
      const bridge = await fetchExternalSnapshotBridge(defaultPeriod, { maxLookbackDays: 2 });
      if (bridge?.snapshot) {
        bridgedSampleGames = snapshotTotalMatches(bridge.snapshot);
        latestSnapshotDate = bridge.snapshot.snapshotDate;
        bridgeUpdatedAt = new Date(`${bridge.snapshot.snapshotDate}T00:00:00.000Z`).toISOString();
      }
    } catch {
      // ignore secondary failures
    }

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        syncConfigured,
        totalMatchLogs: 0,
        indexedPlayers: 0,
        bridgedSampleGames,
        period: defaultPeriod,
        latestMatchEventAt: null,
        latestSnapshotDate,
        updatedAt: bridgeUpdatedAt,
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

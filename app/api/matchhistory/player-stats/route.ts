import { NextRequest, NextResponse } from "next/server";
import { computePlayerStats, createMatchIntelSupabaseRepository, mapMatchForDevice } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

function normalizeDeviceHash(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 128);
}

export async function GET(req: NextRequest) {
  const matchIntelV2 = isMatchIntelV2Enabled();

  const deviceIdRaw = req.nextUrl.searchParams.get("deviceId") || req.nextUrl.searchParams.get("deviceid") || "";
  const deviceId = normalizeDeviceHash(deviceIdRaw);
  const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") || undefined;

  if (!deviceId) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        error: "deviceId is required",
      },
      { status: 400 }
    );
  }

  if (!matchIntelV2) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        stats: {
          deviceId,
          wins: 0,
          losses: 0,
          draws: 0,
          matches: 0,
          winRate: 0,
          averageTurns: null,
          leaders: [],
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  let repo: ReturnType<typeof createMatchIntelSupabaseRepository>;
  try {
    repo = createMatchIntelSupabaseRepository();
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        stats: {
          deviceId,
          wins: 0,
          losses: 0,
          draws: 0,
          matches: 0,
          winRate: 0,
          averageTurns: null,
          leaders: [],
        },
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const rows = await repo.getMatchesByDeviceHash(deviceId, {
      offset: 0,
      limit: 5000,
      startDate,
      endDate,
    });

    const matches = rows.map((row) => mapMatchForDevice(row, deviceId));
    const stats = computePlayerStats(deviceId, matches);

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        updatedAt: new Date().toISOString(),
        stats,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        error: error instanceof Error ? error.message : "Failed to load player stats",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createMatchIntelSupabaseRepository, mapMatchForDevice } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

function normalizeDeviceHash(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 128);
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export async function GET(req: NextRequest) {
  const matchIntelV2 = isMatchIntelV2Enabled();

  const deviceIdRaw = req.nextUrl.searchParams.get("deviceId") || req.nextUrl.searchParams.get("deviceid") || "";
  const deviceId = normalizeDeviceHash(deviceIdRaw);

  if (!deviceId) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        matches: [],
        error: "deviceId is required",
      },
      { status: 400 }
    );
  }

  const page = parsePositiveInt(req.nextUrl.searchParams.get("page"), 1, 1, 100000);
  const pageSize = parsePositiveInt(req.nextUrl.searchParams.get("pageSize"), 50, 1, 100);
  const offset = (page - 1) * pageSize;

  const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") || undefined;

  if (!matchIntelV2) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        deviceId,
        page,
        pageSize,
        matches: [],
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
        deviceId,
        page,
        pageSize,
        matches: [],
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const rows = await repo.getMatchesByDeviceHash(deviceId, {
      offset,
      limit: pageSize,
      startDate,
      endDate,
    });

    const matches = rows.map((row) => mapMatchForDevice(row, deviceId));

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        updatedAt: new Date().toISOString(),
        deviceId,
        page,
        pageSize,
        matches,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        deviceId,
        page,
        pageSize,
        matches: [],
        error: error instanceof Error ? error.message : "Failed to fetch matches",
      },
      { status: 500 }
    );
  }
}

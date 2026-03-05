import { NextRequest, NextResponse } from "next/server";
import { getLiveMeta, getSeededMeta } from "@/lib/data/meta";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { asMatchIntelPeriod, createMatchIntelSupabaseRepository, snapshotToMetaResponse } from "@/lib/analytics";
import { fetchExternalSnapshotBridge } from "@/lib/sources/external-snapshot-bridge";

function periodFromRegion(region: string): ReturnType<typeof asMatchIntelPeriod> {
  if (region === "asia" || region === "east") return "east_p";
  return "west_p";
}

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") || "OP14").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();
  const period = asMatchIntelPeriod(req.nextUrl.searchParams.get("period") || periodFromRegion(region));
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
          const payload = snapshotToMetaResponse(currentSnapshot, period, previousSnapshot);
          return NextResponse.json(
            {
              ...payload,
              featureFlags: {
                matchIntelV2,
              },
            },
            {
              status: 200,
              headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
            }
          );
        }
      }
    } catch {
      // fall through to bridge/live/seeded paths
    }
  }

  try {
    const bridge = await fetchExternalSnapshotBridge(period, { maxLookbackDays: 2 });
    if (bridge?.snapshot?.leaders?.length) {
      const payload = snapshotToMetaResponse(bridge.snapshot, period, null);
      return NextResponse.json(
        {
          ...payload,
          source: "bridge:external-snapshot",
          sources: ["bridge:external-snapshot"],
          featureFlags: {
            matchIntelV2,
          },
        },
        {
          status: 200,
          headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=900" },
        }
      );
    }
  } catch {
    // continue to existing live/seeded flows
  }

  try {
    const live = await getLiveMeta({ format, region });
    return NextResponse.json(
      {
        ...live,
        featureFlags: {
          matchIntelV2,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch {
    const seeded = getSeededMeta();
    return NextResponse.json(
      {
        ...seeded,
        featureFlags: {
          matchIntelV2,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
      }
    );
  }
}

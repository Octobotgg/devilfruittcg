import { NextRequest, NextResponse } from "next/server";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";
import { getHybridMetaPayload } from "@/lib/competitive-insights";

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") || "OP14").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();
  const matchIntelV2 = isMatchIntelV2Enabled();
  const payload = await getHybridMetaPayload({
    range: req.nextUrl.searchParams.get("range"),
    format,
    region,
    period: req.nextUrl.searchParams.get("period"),
  });

  return NextResponse.json(
    {
      ...payload,
      featureFlags: {
        matchIntelV2,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": payload.source === "seeded" ? "s-maxage=120, stale-while-revalidate=300" : "s-maxage=300, stale-while-revalidate=600" },
    }
  );
}

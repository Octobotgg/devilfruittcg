import { NextRequest, NextResponse } from "next/server";
import { getHybridMatchupPayload } from "@/lib/competitive-insights";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.has("format")
    ? (req.nextUrl.searchParams.get("format") ?? "")
    : undefined;
  const type = (req.nextUrl.searchParams.get("type") || "all").toLowerCase();
  const limit = Math.min(30, Math.max(8, Number(req.nextUrl.searchParams.get("limit") || 18)));
  const matchIntelV2 = true;
  const payload = await getHybridMatchupPayload({
    range: req.nextUrl.searchParams.get("range"),
    format,
    type,
    limit,
    period: req.nextUrl.searchParams.get("period"),
    ranking: req.nextUrl.searchParams.get("ranking") === "relevance" ? "relevance" : "coverage",
    forceMatchIntelV2: true,
  });

  return NextResponse.json(
    {
      source: payload.source,
      sources: [payload.source],
      updatedAt: payload.updatedAt,
      sampleGames: payload.sampleGames,
      sampleLabel: payload.sampleLabel,
      sampleDescription: payload.sampleDescription,
      comparableSample: payload.comparableSample,
      decks: payload.decks,
      range: payload.requestedRange,
      effectiveRange: payload.effectiveRange,
      featureFlags: {
        matchIntelV2,
      },
    },
    { status: 200, headers: { "Cache-Control": payload.source === "seeded" ? "no-store" : "s-maxage=300, stale-while-revalidate=600" } }
  );
}

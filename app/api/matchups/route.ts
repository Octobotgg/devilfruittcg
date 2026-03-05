import { NextRequest, NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { fetchKaizokuMatchups } from "@/lib/sources/kaizoku-matchups";
import { fetchLimitlessMatchups } from "@/lib/sources/limitless-matchups";

export async function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") || process.env.MATCHUPS_SET || "OP12").toUpperCase();

  try {
    const live = await fetchLimitlessMatchups(12, set);
    if (live?.decks?.length) {
      return NextResponse.json(
        {
          source: live.source,
          sources: ["limitless-play"],
          updatedAt: live.updatedAt,
          sampleGames: live.sampleGames,
          decks: live.decks,
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // continue fallback chain
  }

  try {
    const live = await fetchKaizokuMatchups(12);
    if (live?.decks?.length) {
      return NextResponse.json(
        {
          source: live.source,
          sources: ["kaizoku"],
          updatedAt: live.updatedAt,
          sampleGames: live.sampleGames,
          decks: live.decks,
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // fallback
  }

  return NextResponse.json(
    {
      source: "seeded fallback",
      sources: ["seeded"],
      updatedAt: new Date().toISOString(),
      sampleGames: 0,
      decks: META_DECKS,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

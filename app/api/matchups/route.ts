import { NextRequest, NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { fetchKaizokuMatchups } from "@/lib/sources/kaizoku-matchups";
import { fetchLimitlessMatchups } from "@/lib/sources/limitless-matchups";

export async function GET(req: NextRequest) {
  const set = (req.nextUrl.searchParams.get("set") || process.env.MATCHUPS_SET || "OP12").toUpperCase();
  const time = (req.nextUrl.searchParams.get("time") || "3months").toLowerCase();
  const type = (req.nextUrl.searchParams.get("type") || "all").toLowerCase();
  const limit = Math.min(30, Math.max(8, Number(req.nextUrl.searchParams.get("limit") || 18)));

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
          source: "tournament-aggregate",
          sources: ["tournament-aggregate"],
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

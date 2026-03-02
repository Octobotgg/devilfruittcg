import { NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { fetchKaizokuMatchups } from "@/lib/sources/kaizoku-matchups";

export async function GET() {
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

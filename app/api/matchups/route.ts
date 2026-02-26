import { NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";
import { fetchGumGumMatchups } from "@/lib/sources/gumgum-matchups";

export async function GET() {
  try {
    const live = await fetchGumGumMatchups(12);
    if (live?.length) {
      return NextResponse.json(
        {
          source: "gumgum.gg",
          updatedAt: new Date().toISOString(),
          decks: live,
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // fallback
  }

  return NextResponse.json(
    {
      source: "seeded",
      updatedAt: new Date().toISOString(),
      decks: META_DECKS,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

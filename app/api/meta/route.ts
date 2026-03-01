import { NextResponse } from "next/server";
import { getSeededMeta, type MetaDeck } from "@/lib/data/meta";
import type { MetaDeck as MatchupDeck } from "@/lib/meta-decks";
import { fetchGumGumMatchups } from "@/lib/sources/gumgum-matchups";

function toMetaDecksFromLive(decks: MatchupDeck[]): MetaDeck[] {
  const safeDecks = Array.isArray(decks) ? decks : [];
  return safeDecks
    .slice()
    .sort((a, b) => b.winRate - a.winRate)
    .map((d, i) => ({
      rank: i + 1,
      name: d.name,
      tier: d.tier === "D" ? "C" : d.tier,
      color: d.color,
      winRate: d.winRate,
      popularity: d.metaShare,
      trend: d.trend === "up" ? "▲" : d.trend === "down" ? "▼" : "—",
    }));
}

export async function GET() {
  const seeded = getSeededMeta();

  try {
    const live = await fetchGumGumMatchups(12);
    if (live?.decks?.length) {
      return NextResponse.json(
        {
          ...seeded,
          updatedAt: live.updatedAt,
          source: live.source,
          sources: ["gumgum.gg/tier-list"],
          sampleGames: live.sampleGames,
          metaDecks: toMetaDecksFromLive(live.decks),
          decks: live.decks,
          matchups: Object.fromEntries(live.decks.map((d) => [d.id, d.matchups])),
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // fallback below
  }

  return NextResponse.json(seeded, { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}

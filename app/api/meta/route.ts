import { NextResponse } from "next/server";
import { getSeededMeta } from "@/lib/data/meta";
import { fetchGumGumMetaDecks } from "@/lib/sources/gumgum";

export async function GET() {
  const seeded = getSeededMeta();

  try {
    const gum = await fetchGumGumMetaDecks();
    if (gum?.metaDecks?.length) {
      return NextResponse.json(
        {
          ...seeded,
          updatedAt: gum.fetchedAt,
          source: gum.source,
          metaDecks: gum.metaDecks,
        },
        { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
      );
    }
  } catch {
    // fallback below
  }

  return NextResponse.json(seeded, { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}

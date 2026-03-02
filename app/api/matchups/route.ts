import { NextResponse } from "next/server";
import { META_DECKS } from "@/lib/meta-decks";

export async function GET() {
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

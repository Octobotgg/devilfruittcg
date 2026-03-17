import { NextResponse } from "next/server";
import { OFFICIAL_BASE_CARDS } from "@/lib/official-cards";

export async function GET() {
  const leaders = OFFICIAL_BASE_CARDS
    .filter((c) => c.type === "Leader")
    .map((c) => ({ id: c.id, name: c.name, setCode: c.setCode, color: c.color }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return NextResponse.json({ total: leaders.length, leaders }, { status: 200, headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}

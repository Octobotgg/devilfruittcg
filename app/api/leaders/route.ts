import { NextResponse } from "next/server";
import { loadCards } from "@/lib/card-feed";

export async function GET() {
  const all = await loadCards();

  const leaders = all
    .filter((c) => c.type === "Leader" && !/_p\d+$/i.test(c.id))
    .map((c) => ({ id: c.id, name: c.name, setCode: c.setCode, color: c.color }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return NextResponse.json({ total: leaders.length, leaders }, { status: 200, headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}

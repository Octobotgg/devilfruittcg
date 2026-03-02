import { NextResponse } from "next/server";
import { getSeededMeta } from "@/lib/data/meta";

export async function GET() {
  const seeded = getSeededMeta();
  return NextResponse.json(seeded, { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}

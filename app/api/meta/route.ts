import { NextResponse } from "next/server";
import { getSeededMeta } from "@/lib/data/meta";
// Future: import real fetchers/aggregators from sources.

export async function GET() {
  // In the future, merge live data from OPTCG Sim + tournaments here.
  const snapshot = getSeededMeta();
  return NextResponse.json(snapshot, { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}

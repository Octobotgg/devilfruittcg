import { NextResponse } from "next/server";
import { getLiveMeta, getSeededMeta } from "@/lib/data/meta";

export async function GET() {
  try {
    const live = await getLiveMeta();
    return NextResponse.json(live, {
      status: 200,
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    const seeded = getSeededMeta();
    return NextResponse.json(seeded, {
      status: 200,
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=300" },
    });
  }
}

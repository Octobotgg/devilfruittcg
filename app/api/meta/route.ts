import { NextRequest, NextResponse } from "next/server";
import { getLiveMeta, getSeededMeta } from "@/lib/data/meta";

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") || "OP14").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();

  try {
    const live = await getLiveMeta({ format, region });
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

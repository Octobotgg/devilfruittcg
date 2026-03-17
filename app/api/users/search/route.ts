import { NextRequest, NextResponse } from "next/server";
import { searchPublicProfilesSupabase } from "@/lib/profile-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = String(req.nextUrl.searchParams.get("q") || "");
  const limit = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 12)));
  const results = await searchPublicProfilesSupabase(query, limit);

  return NextResponse.json(
    {
      total: results.length,
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

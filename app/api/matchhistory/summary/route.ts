import { NextResponse } from "next/server";
import { createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

export async function GET() {
  const matchIntelV2 = isMatchIntelV2Enabled();

  let repo: ReturnType<typeof createMatchIntelSupabaseRepository>;
  try {
    repo = createMatchIntelSupabaseRepository();
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        totalMatchLogs: 0,
        indexedPlayers: 0,
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const [totalMatchLogs, indexedPlayers] = await Promise.all([
      repo.countMatchEvents(),
      repo.countPlayerIndex(),
    ]);

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        totalMatchLogs,
        indexedPlayers,
        updatedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        totalMatchLogs: 0,
        indexedPlayers: 0,
        error: error instanceof Error ? error.message : "Failed to load summary",
      },
      { status: 500 }
    );
  }
}

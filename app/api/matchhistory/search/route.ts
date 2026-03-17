import { NextRequest, NextResponse } from "next/server";
import { createMatchIntelSupabaseRepository } from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

interface SearchBody {
  searchTerm?: string;
  limit?: number;
}

function parseBody(body: unknown): SearchBody {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return {
    searchTerm: typeof b.searchTerm === "string" ? b.searchTerm : undefined,
    limit: typeof b.limit === "number" ? b.limit : undefined,
  };
}

export async function POST(req: NextRequest) {
  const matchIntelV2 = isMatchIntelV2Enabled();

  const parsed = parseBody(await req.json().catch(() => ({})));
  const searchTerm = (parsed.searchTerm || "").trim();
  const limit = Math.max(1, Math.min(50, Math.trunc(parsed.limit || 20)));

  if (!searchTerm || searchTerm.length < 2) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        results: [],
        error: "searchTerm must be at least 2 characters",
      },
      { status: 400 }
    );
  }

  if (!matchIntelV2) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        results: [],
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  let repo: ReturnType<typeof createMatchIntelSupabaseRepository>;
  try {
    repo = createMatchIntelSupabaseRepository();
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        results: [],
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const rows = await repo.getLatestPlayerIndexMatches(searchTerm, limit);
    const results = rows.map((r) => ({
      deviceId: r.device_hash,
      playerName: r.latest_player_name,
      playerLeader: r.last_leader_id,
      oppLeader: r.latest_opponent_leader_id,
      date: r.last_seen_at,
    }));

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        updatedAt: new Date().toISOString(),
        results,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        results: [],
        error: error instanceof Error ? error.message : "Failed to search",
      },
      { status: 500 }
    );
  }
}

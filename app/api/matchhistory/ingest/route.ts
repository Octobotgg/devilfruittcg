import { NextRequest, NextResponse } from "next/server";
import {
  buildPlayerIndexUpserts,
  createMatchIntelSupabaseRepository,
  normalizeMatchEventInput,
  type MatchEventInsert,
} from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

type IngestBody = {
  source?: string;
  matches?: Array<Record<string, unknown>>;
};

function parseBody(raw: unknown): IngestBody {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  return {
    source: typeof body.source === "string" ? body.source : undefined,
    matches: Array.isArray(body.matches) ? (body.matches as Array<Record<string, unknown>>) : undefined,
  };
}

function authorize(req: NextRequest): boolean {
  const expected = process.env.MATCH_INTEL_INGEST_KEY;
  if (!expected) return process.env.NODE_ENV !== "production";
  const supplied = req.headers.get("x-match-ingest-key");
  return Boolean(supplied && supplied === expected);
}

export async function POST(req: NextRequest) {
  const matchIntelV2 = isMatchIntelV2Enabled();

  if (!matchIntelV2) {
    return NextResponse.json(
      { source: "match-intel-v2", featureFlags: { matchIntelV2 }, inserted: 0, indexed: 0 },
      { status: 200 }
    );
  }

  if (!authorize(req)) {
    return NextResponse.json(
      { source: "match-intel-v2", featureFlags: { matchIntelV2 }, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = parseBody(await req.json().catch(() => ({})));
  const source = (body.source || "manual-ingest").trim().slice(0, 64);
  const input = body.matches || [];

  if (!input.length) {
    return NextResponse.json(
      { source: "match-intel-v2", featureFlags: { matchIntelV2 }, inserted: 0, indexed: 0, error: "No matches provided" },
      { status: 400 }
    );
  }

  if (input.length > 5000) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        inserted: 0,
        indexed: 0,
        error: "Payload too large (max 5000 matches)",
      },
      { status: 413 }
    );
  }

  const normalized: MatchEventInsert[] = [];
  for (const raw of input) {
    const event = normalizeMatchEventInput(source, raw);
    if (event) normalized.push(event);
  }

  if (!normalized.length) {
    return NextResponse.json(
      { source: "match-intel-v2", featureFlags: { matchIntelV2 }, inserted: 0, indexed: 0, error: "No valid match rows" },
      { status: 400 }
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
        inserted: 0,
        indexed: 0,
        error: error instanceof Error ? error.message : "Repository not configured",
      },
      { status: 500 }
    );
  }

  try {
    const inserted = await repo.upsertMatchEvents(normalized);
    const indexRows = buildPlayerIndexUpserts(normalized);
    const indexed = await repo.upsertPlayerIndex(indexRows);

    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        inserted,
        indexed,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        source: "match-intel-v2",
        featureFlags: { matchIntelV2 },
        inserted: 0,
        indexed: 0,
        error: error instanceof Error ? error.message : "Ingest failed",
      },
      { status: 500 }
    );
  }
}

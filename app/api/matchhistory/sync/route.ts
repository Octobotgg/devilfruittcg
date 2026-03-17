import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import {
  MATCH_INTEL_PERIODS,
  syncMatchIntelSnapshots,
  type MatchIntelPeriod,
  type MatchIntelSyncMode,
  isMatchIntelSyncConfigured,
} from "@/lib/analytics";
import { isMatchIntelV2Enabled } from "@/lib/config/flags";

export const runtime = "nodejs";

type SyncRequestBody = {
  mode?: MatchIntelSyncMode;
  periods?: string[] | string;
  days?: number;
  endDate?: string;
};

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization") || "";
  const queryKey = url.searchParams.get("key");
  return authHeader === `Bearer ${secret}` || queryKey === secret;
}

function parseMode(value: string | null | undefined): MatchIntelSyncMode {
  return value === "backfill" ? "backfill" : "incremental";
}

function parsePositiveInt(value: string | number | null | undefined, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parseEndDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parsePeriods(value: string[] | string | null | undefined): MatchIntelPeriod[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const periods = MATCH_INTEL_PERIODS.filter((period) =>
    raw.some((candidate) => candidate.trim().toLowerCase() === period)
  );
  return periods.length ? periods : undefined;
}

async function parseBody(req: NextRequest): Promise<SyncRequestBody> {
  if (req.method !== "POST") return {};
  return (await req.json().catch(() => ({}))) as SyncRequestBody;
}

async function runSync(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:matchhistory-sync",
    max: 6,
    windowMs: 60_000,
    blockMs: 10 * 60_000,
  });

  const withRateHeaders = (response: NextResponse) => {
    for (const [key, value] of Object.entries(rateLimit.headers)) {
      response.headers.set(key, value);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (!rateLimit.ok) {
    return withRateHeaders(NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 }));
  }

  if (!isAuthorized(req)) {
    return withRateHeaders(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }));
  }

  const body = await parseBody(req);
  const url = req.nextUrl;

  const mode = parseMode(url.searchParams.get("mode") || body.mode);
  const periods = parsePeriods(url.searchParams.get("periods") || body.periods);
  const days = parsePositiveInt(url.searchParams.get("days") || body.days, mode === "backfill" ? 14 : 14, 1, 180);
  const endDate = parseEndDate(url.searchParams.get("endDate") || body.endDate);

  if (!isMatchIntelSyncConfigured()) {
    return withRateHeaders(
      NextResponse.json(
        {
          ok: false,
          error:
            "Match-intel sync is not configured. Set MATCH_INTEL_SNAPSHOT_BASE_URL and a writable Supabase key (service role preferred, anon fallback supported by current policies).",
          featureFlags: {
            matchIntelV2: isMatchIntelV2Enabled(),
          },
        },
        { status: 503 }
      )
    );
  }

  const result = await syncMatchIntelSnapshots({
    mode,
    periods,
    days,
    endDate,
    logger: (message, meta) => {
      console.info(`[api/matchhistory/sync] ${message}`, meta || {});
    },
  });

  return withRateHeaders(
    NextResponse.json(
      {
        ok: true,
        featureFlags: {
          matchIntelV2: isMatchIntelV2Enabled(),
        },
        ...result,
      },
      { status: 200 }
    )
  );
}

export async function GET(req: NextRequest) {
  try {
    return await runSync(req);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await runSync(req);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

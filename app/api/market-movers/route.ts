import { NextResponse } from "next/server";
import { getGumGumMarketMoves } from "@/lib/gumgum-market-moves";
import { checkRateLimit } from "@/lib/abuse-protection";

export const runtime = "nodejs";

const MARKET_MOVERS_SOURCE_URL = "https://gumgum.gg/market-watch";
const MARKET_MOVERS_STALE_THRESHOLD_MS = 30 * 60 * 1000;

function toPositiveInt(input: string | null, fallback: number) {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function normalizeIsoTimestamp(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("$D") ? trimmed.slice(2) : trimmed;
  const parsedMs = Date.parse(normalized);
  if (!Number.isFinite(parsedMs)) return null;

  return new Date(parsedMs).toISOString();
}

function buildFreshness(input: { updatedAt?: string | null; fetchedAt?: string | null; stale?: boolean; staleAgeMs?: number }) {
  const referenceIso = normalizeIsoTimestamp(input.updatedAt) || normalizeIsoTimestamp(input.fetchedAt);
  const referenceMs = referenceIso ? Date.parse(referenceIso) : NaN;
  const ageMs = Number.isFinite(referenceMs) ? Math.max(0, Date.now() - referenceMs) : null;
  const stale = input.stale === true || (typeof ageMs === "number" ? ageMs > MARKET_MOVERS_STALE_THRESHOLD_MS : true);

  return {
    updatedAt: referenceIso,
    stale,
    staleAgeMs: typeof input.staleAgeMs === "number" && Number.isFinite(input.staleAgeMs) ? input.staleAgeMs : ageMs,
    staleThresholdMs: MARKET_MOVERS_STALE_THRESHOLD_MS,
  };
}

export async function GET(req: Request) {
  const rateLimit = checkRateLimit(req, {
    key: "api:market-movers",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for market movers endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const withRateHeaders = (response: NextResponse) => {
    for (const [k, v] of Object.entries(rateLimit.headers)) response.headers.set(k, v);
    return response;
  };

  const url = new URL(req.url);
  const limit = Math.min(30, Math.max(1, toPositiveInt(url.searchParams.get("limit"), 12)));

  try {
    const data = await getGumGumMarketMoves();

    return withRateHeaders(
      NextResponse.json(
        {
          ...data,
          board: data.board.slice(0, Math.min(limit, 10)),
          ticker: data.ticker.slice(0, limit),
          movers: data.movers.slice(0, Math.max(limit, 12)),
          source: {
            provider: "GumGum",
            feed: "market-watch",
            url: MARKET_MOVERS_SOURCE_URL,
          },
          freshness: buildFreshness({
            updatedAt: data.updatedAt,
            fetchedAt: data.fetchedAt,
            stale: data.stale,
            staleAgeMs: data.staleAgeMs,
          }),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
          },
        }
      )
    );
  } catch (error) {
    const fetchedAt = new Date().toISOString();

    return withRateHeaders(
      NextResponse.json(
        {
          updatedAt: null,
          fetchedAt,
          board: [],
          ticker: [],
          movers: [],
          error: String(error),
          source: {
            provider: "GumGum",
            feed: "market-watch",
            url: MARKET_MOVERS_SOURCE_URL,
          },
          freshness: buildFreshness({
            updatedAt: null,
            fetchedAt,
            stale: true,
          }),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    );
  }
}

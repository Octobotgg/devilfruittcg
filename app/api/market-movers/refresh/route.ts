import { NextResponse } from "next/server";
import { getGumGumMarketMoves } from "@/lib/gumgum-market-moves";
import { checkRateLimit } from "@/lib/abuse-protection";

export const runtime = "nodejs";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");
  const authHeader = req.headers.get("authorization") || "";

  return authHeader === `Bearer ${secret}` || queryKey === secret;
}

async function runRefresh(req: Request) {
  const rateLimit = checkRateLimit(req, {
    key: "api:market-movers-refresh",
    max: 12,
    windowMs: 60_000,
    blockMs: 10 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  const withRateHeaders = (response: NextResponse) => {
    for (const [k, v] of Object.entries(rateLimit.headers)) response.headers.set(k, v);
    return response;
  };

  if (!isAuthorized(req)) {
    return withRateHeaders(NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }));
  }

  const startedAt = Date.now();
  const data = await getGumGumMarketMoves(true);
  const durationMs = Date.now() - startedAt;

  return withRateHeaders(
    NextResponse.json(
      {
        ok: true,
        refreshedAt: new Date().toISOString(),
        durationMs,
        stale: Boolean(data.stale),
        boardCount: data.board.length,
        tickerCount: data.ticker.length,
        moversCount: data.movers.length,
        updatedAt: data.updatedAt,
        fetchedAt: data.fetchedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  );
}

export async function GET(req: Request) {
  try {
    return await runRefresh(req);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req: Request) {
  try {
    return await runRefresh(req);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

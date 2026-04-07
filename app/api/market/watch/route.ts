import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/abuse-protection";
import { getMarketHomeReadModel, toLegacyMarketWatchShape } from "@/lib/server/market/market-home";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:market-watch",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for market watch endpoint" },
      { status: 429, headers: rateLimit.headers },
    );
  }

  const withRateHeaders = (response: NextResponse) => {
    for (const [key, value] of Object.entries(rateLimit.headers)) {
      response.headers.set(key, value);
    }
    return response;
  };

  try {
    const payload = toLegacyMarketWatchShape(await getMarketHomeReadModel({ limit: 12 }));
    return withRateHeaders(
      NextResponse.json(payload, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }),
    );
  } catch (error) {
    return withRateHeaders(
      NextResponse.json(
        {
          source: "justtcg-runtime-pricing",
          updatedAt: null,
          topDaily: [],
          topWeekly: [],
          bountyBoard: [],
          error: error instanceof Error ? error.message : String(error),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
    );
  }
}

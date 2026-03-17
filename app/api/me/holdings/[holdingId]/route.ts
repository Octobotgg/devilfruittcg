import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { deleteUserHolding, getUserHolding } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

type RouteCtx = {
  params: Promise<{
    holdingId: string;
  }>;
};

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:holdings:item",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for holding item endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const { holdingId: rawHoldingId } = await ctx.params;
  const holdingId = String(rawHoldingId || "").trim();

  if (!holdingId) {
    return NextResponse.json({ error: "holdingId is required" }, { status: 400, headers: rateLimit.headers });
  }

  const holding = getUserHolding(userId, holdingId);
  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404, headers: rateLimit.headers });
  }

  return NextResponse.json(
    { userId, holding },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:holdings:item:delete",
    max: 24,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", detail: "Rate limit exceeded for holding delete endpoint" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }
  const { holdingId: rawHoldingId } = await ctx.params;
  const holdingId = String(rawHoldingId || "").trim();

  if (!holdingId) {
    return NextResponse.json({ error: "holdingId is required" }, { status: 400, headers: rateLimit.headers });
  }

  const deleted = deleteUserHolding(userId, holdingId);
  if (!deleted) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404, headers: rateLimit.headers });
  }

  return NextResponse.json(
    { ok: true, userId, holdingId },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    }
  );
}

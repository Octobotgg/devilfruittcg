import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function endpointBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "devilfruittcg.gg";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}/api/ebay/account-deletion`;
}

// eBay challenge verification
// GET /api/ebay/account-deletion?challenge_code=...
export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code") || "";
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || "";

  if (!challengeCode) {
    return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  }
  if (!verificationToken) {
    return NextResponse.json({ error: "missing EBAY_VERIFICATION_TOKEN" }, { status: 500 });
  }

  const endpoint = endpointBase(req);
  const hash = createHash("sha256")
    .update(challengeCode)
    .update(verificationToken)
    .update(endpoint)
    .digest("hex");

  return NextResponse.json({ challengeResponse: hash });
}

// Notification receiver
export async function POST() {
  // For now we just ACK. We can later persist/delete mapped user data if needed.
  return NextResponse.json({ received: true }, { status: 200 });
}

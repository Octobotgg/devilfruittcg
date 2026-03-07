import { NextRequest, NextResponse } from "next/server";
import { getOfficialCardById } from "@/lib/official-cards";

function placeholder(cardId: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
    <rect width="200" height="280" rx="8" fill="#0d1526" stroke="#f0c040" stroke-width="1" stroke-opacity="0.2"/>
    <text x="100" y="130" text-anchor="middle" fill="#f0c040" fill-opacity="0.4" font-size="48">🍇</text>
    <text x="100" y="165" text-anchor="middle" fill="white" fill-opacity="0.3" font-size="11" font-family="sans-serif">${cardId}</text>
    <text x="100" y="185" text-anchor="middle" fill="white" fill-opacity="0.2" font-size="10" font-family="sans-serif">Bandai image unavailable</text>
  </svg>`;
}

export async function GET(req: NextRequest) {
  const cardId = (req.nextUrl.searchParams.get("id") || "").trim().toUpperCase();
  if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const card = getOfficialCardById(cardId);
  const targetUrl =
    card?.imageUrl || `https://en.onepiece-cardgame.com/images/cardlist/card/${encodeURIComponent(cardId)}.png`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 DevilFruitTCG.gg image proxy",
      },
    });

    if (!res.ok) {
      return new NextResponse(placeholder(cardId), {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
      });
    }

    const img = await res.arrayBuffer();
    return new NextResponse(img, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(placeholder(cardId), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
    });
  }
}

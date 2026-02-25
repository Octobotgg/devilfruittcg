import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get("id");
  if (!cardId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const setCode = cardId.split("-")[0];
  const url = `https://en.onepiece-cardgame.com/images/card/${setCode}/${cardId}_p1.png`;

  try {
    const res = await fetch(url, {
      headers: {
        "Referer": "https://en.onepiece-cardgame.com/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      // Return a stylish SVG placeholder
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
        <rect width="200" height="280" rx="8" fill="#0d1526" stroke="#f0c040" stroke-width="1" stroke-opacity="0.2"/>
        <text x="100" y="130" text-anchor="middle" fill="#f0c040" fill-opacity="0.4" font-size="48">🍇</text>
        <text x="100" y="165" text-anchor="middle" fill="white" fill-opacity="0.3" font-size="11" font-family="sans-serif">${cardId}</text>
        <text x="100" y="185" text-anchor="middle" fill="white" fill-opacity="0.2" font-size="10" font-family="sans-serif">One Piece TCG</text>
      </svg>`;
      return new NextResponse(svg, {
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
      <rect width="200" height="280" rx="8" fill="#0d1526" stroke="#f0c040" stroke-width="1" stroke-opacity="0.2"/>
      <text x="100" y="140" text-anchor="middle" fill="#f0c040" fill-opacity="0.4" font-size="48">🃏</text>
    </svg>`;
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}

import { NextRequest, NextResponse } from "next/server";

function extractFirstDecklistId(html: string): string | null {
  const ids = Array.from(html.matchAll(/href="\/decks\/list\/(\d+)"/gi)).map((m) => m[1]);
  return ids.length ? ids[0] : null;
}

function parseDecklist(html: string) {
  const cards: Array<{ id: string; name: string; count: number; imageUrl: string }> = [];

  const re = /<div class="decklist-card"[^>]*data-count="(\d+)"[^>]*data-id="([A-Z0-9-]+)"[^>]*data-variant="(\d+)"[^>]*>[\s\S]*?<span class="card-name">([^<]+)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const count = Number(m[1]);
    const id = m[2];
    const variant = Number(m[3]);
    const name = m[4].trim();
    const imageUrl = variant > 0 ? `/api/card-image?id=${id}&variant=p${variant}` : `/api/card-image?id=${id}`;
    cards.push({ id, name, count, imageUrl });
  }

  return cards;
}

export async function GET(req: NextRequest) {
  const deckId = (req.nextUrl.searchParams.get("deckId") || "").trim();
  const format = (req.nextUrl.searchParams.get("format") || "OP14").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();

  if (!deckId) return NextResponse.json({ error: "deckId is required" }, { status: 400 });

  try {
    const candidates = [
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results?format=${encodeURIComponent(format)}${region !== "global" ? `&region=${encodeURIComponent(region)}` : ""}`,
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results?format=${encodeURIComponent(format)}`,
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results`,
    ];

    let listId: string | null = null;
    for (const url of candidates) {
      const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" }, cache: "no-store" }).then((r) => r.text());
      const found = extractFirstDecklistId(html);
      if (found) {
        listId = found;
        break;
      }
    }

    if (!listId) {
      return NextResponse.json({ deckId, format, region, cards: [], error: "No decklist found" }, { status: 404 });
    }

    const listUrl = `https://onepiece.limitlesstcg.com/decks/list/${listId}`;
    const listHtml = await fetch(listUrl, { headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" }, cache: "no-store" }).then((r) => r.text());

    const cards = parseDecklist(listHtml);

    return NextResponse.json(
      {
        deckId,
        format,
        region,
        listId,
        count: cards.length,
        cards,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch decklist" }, { status: 500 });
  }
}

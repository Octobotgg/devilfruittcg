import { NextRequest, NextResponse } from "next/server";

type DeckCard = { id: string; name: string; count: number; imageUrl: string };
type DecklistSummary = {
  listId: string;
  format: string;
  place: string;
  player: string;
  tournament: string;
  tournamentPath?: string;
  cards: DeckCard[];
};

function parseResultsTable(html: string, maxLists: number): Array<{
  listId: string;
  format: string;
  place: string;
  player: string;
  tournament: string;
  tournamentPath?: string;
}> {
  const rows: Array<{
    listId: string;
    format: string;
    place: string;
    player: string;
    tournament: string;
    tournamentPath?: string;
  }> = [];

  let currentTournament = "";
  let currentTournamentPath: string | undefined;

  for (const m of html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const row = m[1];

    const t = row.match(/<th class="sub-heading"[^>]*>\s*<a href="([^"]+)">([^<]+)<\/a>/i);
    if (t) {
      currentTournamentPath = t[1];
      currentTournament = t[2].trim();
      continue;
    }

    const rm = row.match(/<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>[\s\S]*?<a [^>]*>(?:<span class="lotp-name">)?([^<]+)(?:<\/span>)?<\/a>[\s\S]*?<a href="\/decks\/list\/(\d+)"/i);
    if (!rm) continue;

    rows.push({
      format: rm[1].trim(),
      place: rm[2].trim(),
      player: rm[3].trim(),
      listId: rm[4].trim(),
      tournament: currentTournament,
      tournamentPath: currentTournamentPath,
    });

    if (rows.length >= maxLists) break;
  }

  return rows;
}

function parseDecklist(html: string): DeckCard[] {
  const cards: DeckCard[] = [];
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

function aggregateUsage(lists: DecklistSummary[]) {
  const map = new Map<string, { id: string; name: string; totalQty: number; inLists: number; imageUrl: string }>();
  const totalLists = Math.max(lists.length, 1);

  for (const l of lists) {
    const seenInThisList = new Set<string>();
    for (const c of l.cards) {
      const key = c.id;
      const row = map.get(key) || { id: c.id, name: c.name, totalQty: 0, inLists: 0, imageUrl: c.imageUrl };
      row.totalQty += c.count;
      if (!seenInThisList.has(key)) {
        row.inLists += 1;
        seenInThisList.add(key);
      }
      map.set(key, row);
    }
  }

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      avgQty: Number((r.totalQty / totalLists).toFixed(2)),
      usagePct: Number(((r.inLists / totalLists) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.usagePct - a.usagePct || b.avgQty - a.avgQty);
}

export async function GET(req: NextRequest) {
  const deckId = (req.nextUrl.searchParams.get("deckId") || "").trim();
  const format = (req.nextUrl.searchParams.get("format") || "OP14").toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") || "global").toLowerCase();
  const listLimit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("lists") || 8)));

  if (!deckId) return NextResponse.json({ error: "deckId is required" }, { status: 400 });

  try {
    const candidates = [
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results?format=${encodeURIComponent(format)}${region !== "global" ? `&region=${encodeURIComponent(region)}` : ""}`,
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results?format=${encodeURIComponent(format)}`,
      `https://onepiece.limitlesstcg.com/decks/${deckId}/results`,
    ];

    let resultsHtml = "";
    for (const url of candidates) {
      const html = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }).then((r) => r.text());

      if (/\/decks\/list\/\d+/i.test(html)) {
        resultsHtml = html;
        break;
      }
    }

    if (!resultsHtml) {
      return NextResponse.json({ deckId, format, region, cards: [], lists: [], usage: [], error: "No decklist found" }, { status: 404 });
    }

    const rows = parseResultsTable(resultsHtml, listLimit);
    const uniqueRows: typeof rows = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.listId)) continue;
      seen.add(r.listId);
      uniqueRows.push(r);
    }

    const lists: DecklistSummary[] = [];
    for (const r of uniqueRows) {
      const listUrl = `https://onepiece.limitlesstcg.com/decks/list/${r.listId}`;
      const listHtml = await fetch(listUrl, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        cache: "no-store",
      }).then((res) => res.text());
      lists.push({ ...r, cards: parseDecklist(listHtml) });
    }

    const usage = aggregateUsage(lists);
    const representativeCards = lists[0]?.cards || [];

    return NextResponse.json(
      {
        deckId,
        format,
        region,
        listCount: lists.length,
        lists,
        usage,
        // backwards compatibility for existing UI
        count: representativeCards.length,
        cards: representativeCards,
        source: "tournament-aggregate",
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch decklist" }, { status: 500 });
  }
}

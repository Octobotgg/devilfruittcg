import { NextRequest, NextResponse } from "next/server";

function parseWinRow(html: string, opponentId: string) {
  const re = /<tr\s+data-name="[^"]*"\s+data-matches="(\d+)"\s+data-winrate="([0-9.]+)">[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\/matchups\?game=OP[^\"]*">/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const matches = Number(m[1]);
    const winrate = Number(m[2]) * 100;
    const opp = m[3].toUpperCase();
    if (opp === opponentId.toUpperCase()) {
      return { matches, winRate: Number(winrate.toFixed(2)) };
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const leader = (req.nextUrl.searchParams.get("leader") || "").toUpperCase();
  const opponent = (req.nextUrl.searchParams.get("opponent") || "").toUpperCase();
  const set = (req.nextUrl.searchParams.get("set") || "OP12").toUpperCase();
  const time = (req.nextUrl.searchParams.get("time") || "3months").toLowerCase();

  if (!leader || !opponent) {
    return NextResponse.json({ error: "leader and opponent are required" }, { status: 400 });
  }

  try {
    const aHtml = await fetch(`https://play.limitlesstcg.com/decks/${leader}/matchups?game=OP&set=${encodeURIComponent(set)}&time=${encodeURIComponent(time)}`, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      cache: "no-store",
    }).then((r) => r.text());

    const bHtml = await fetch(`https://play.limitlesstcg.com/decks/${opponent}/matchups?game=OP&set=${encodeURIComponent(set)}&time=${encodeURIComponent(time)}`, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      cache: "no-store",
    }).then((r) => r.text());

    const a = parseWinRow(aHtml, opponent);
    const b = parseWinRow(bHtml, leader);

    return NextResponse.json(
      {
        leader,
        opponent,
        set,
        time,
        winRate: a?.winRate ?? null,
        matches: a?.matches ?? 0,
        reverseWinRate: b?.winRate ?? null,
        reverseMatches: b?.matches ?? 0,
        source: "tournament-aggregate",
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }
}

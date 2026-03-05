import type { MetaDeck } from "@/lib/meta-decks";

export interface LimitlessSnapshot {
  source: string;
  updatedAt: string;
  sampleGames: number;
  decks: MetaDeck[];
}

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function deckIdFromCardId(cardId: string): string {
  return cardId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function tierFromRank(rank: number): MetaDeck["tier"] {
  if (rank <= 3) return "S";
  if (rank <= 6) return "A";
  if (rank <= 10) return "B";
  if (rank <= 14) return "C";
  return "D";
}

export async function fetchLimitlessMatchups(limit = 12, set = "OP12"): Promise<LimitlessSnapshot | null> {
  try {
    const topUrl = `https://play.limitlesstcg.com/decks?game=OP&set=${encodeURIComponent(set)}`;
    const topHtml = await fetch(topUrl, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      next: { revalidate: 900 },
    }).then((r) => r.text());

    const summary = topHtml.match(/(\d+) tournaments,\s*(\d+) players,\s*(\d+) matches/i);
    const sampleGames = summary ? Number(summary[3]) : 0;

    const rowRegex = /<tr\s+data-share="([0-9.]+)"\s+data-winrate="([0-9.]+)">[\s\S]*?<td>(\d+)<\/td>[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\?game=OP[^\"]*">([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;

    const decks: MetaDeck[] = [];
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(topHtml)) !== null) {
      const metaShare = Number(m[1]) * 100;
      const winRate = Number(m[2]) * 100;
      const rank = Number(m[3]);
      const cardId = m[4];
      const name = clean(m[5]);

      decks.push({
        id: deckIdFromCardId(cardId),
        name,
        leader: name,
        cardId,
        color: "Mixed",
        tier: tierFromRank(rank),
        metaShare: Number(metaShare.toFixed(2)),
        winRate: Number(winRate.toFixed(2)),
        trend: "stable",
        description: `Live aggregate from Limitless (${set})`,
        matchups: {},
      });

      if (decks.length >= limit) break;
    }

    if (!decks.length) return null;

    const byCardId = new Map(decks.map((d) => [d.cardId, d]));

    for (const deck of decks) {
      const matchupsUrl = `https://play.limitlesstcg.com/decks/${deck.cardId}/matchups?game=OP&set=${encodeURIComponent(set)}`;
      const h = await fetch(matchupsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        next: { revalidate: 900 },
      }).then((r) => r.text());

      const matchupRegex = /<tr\s+data-name="[^"]*"\s+data-matches="\d+"\s+data-winrate="([0-9.]+)">[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\/matchups\?game=OP[^\"]*">/gi;
      let mm: RegExpExecArray | null;
      while ((mm = matchupRegex.exec(h)) !== null) {
        const rate = Number(mm[1]) * 100;
        const oppCardId = mm[2];
        const oppDeck = byCardId.get(oppCardId);
        if (!oppDeck) continue;
        deck.matchups[oppDeck.id] = Number(rate.toFixed(2));
      }

      deck.matchups[deck.id] = 50;
    }

    // fill missing cells with 50 for matrix stability
    for (const row of decks) {
      for (const col of decks) {
        if (row.matchups[col.id] == null) row.matchups[col.id] = 50;
      }
    }

    return {
      source: `limitless-play (${set})`,
      updatedAt: new Date().toISOString(),
      sampleGames,
      decks,
    };
  } catch {
    return null;
  }
}

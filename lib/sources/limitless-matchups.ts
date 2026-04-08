import type { MetaDeck } from "@/lib/meta-decks";
import { getOfficialCardById } from "@/lib/official-cards";

export interface LimitlessSnapshot {
  source: string;
  updatedAt: string;
  sampleGames: number;
  decks: MetaDeck[];
  leaderSampleGames?: Record<string, number>;
  matchupSamples?: Record<string, Record<string, { winRate: number; matches: number }>>;
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

function colorFromCardId(cardId: string): string {
  return getOfficialCardById(cardId)?.color || "Mixed";
}

function tierFromRank(rank: number): MetaDeck["tier"] {
  if (rank <= 3) return "S";
  if (rank <= 6) return "A";
  if (rank <= 10) return "B";
  if (rank <= 14) return "C";
  return "D";
}

function trendFromWinRate(winRate: number): MetaDeck["trend"] {
  if (winRate >= 53) return "up";
  if (winRate <= 48) return "down";
  return "stable";
}

export async function fetchLimitlessMatchups(limit = 12, set = "OP12", time = "3months", type = "all"): Promise<LimitlessSnapshot | null> {
  try {
    const qs = new URLSearchParams({ game: "OP", set });
    if (time && time !== "all") qs.set("time", time);
    if (type && type !== "all") qs.set("type", type);
    const topUrl = `https://play.limitlesstcg.com/decks?${qs.toString()}`;
    const topHtml = await fetch(topUrl, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      next: { revalidate: 900 },
    }).then((r) => r.text());

    const summary = topHtml.match(/(\d+) tournaments,\s*(\d+) players,\s*(\d+) matches/i);
    const sampleGames = summary ? Number(summary[3]) : 0;

    const rowRegex = /<tr\s+data-share="([0-9.]+)"\s+data-winrate="([0-9.]+)">[\s\S]*?<td>(\d+)<\/td>[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\?game=OP[^\"]*">([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi;

    const decks: MetaDeck[] = [];
    const leaderSampleGames: Record<string, number> = {};
    const matchupSamples: Record<string, Record<string, { winRate: number; matches: number }>> = {};
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(topHtml)) !== null) {
      const metaShare = Number(m[1]) * 100;
      const winRate = Number(m[2]) * 100;
      const rank = Number(m[3]);
      const cardId = m[4];
      const name = clean(m[5]);

      decks.push({
        id: deckIdFromCardId(cardId),
        name: getOfficialCardById(cardId)?.name || name,
        leader: getOfficialCardById(cardId)?.name || name,
        cardId,
        color: colorFromCardId(cardId),
        tier: tierFromRank(rank),
        metaShare: Number(metaShare.toFixed(2)),
        winRate: Number(winRate.toFixed(2)),
        trend: trendFromWinRate(Number(winRate.toFixed(2))),
        description: `Live aggregate from Limitless (${set})`,
        matchups: {},
      });

      leaderSampleGames[cardId] = Math.max(0, Math.round((sampleGames * metaShare) / 100));

      if (decks.length >= limit) break;
    }

    if (!decks.length) return null;

    const byCardId = new Map(decks.map((d) => [d.cardId, d]));

    for (const deck of decks) {
      const matchupParams = new URLSearchParams({ game: "OP", set });
      if (time && time !== "all") matchupParams.set("time", time);
      if (type && type !== "all") matchupParams.set("type", type);
      const matchupsUrl = `https://play.limitlesstcg.com/decks/${deck.cardId}/matchups?${matchupParams.toString()}`;
      const h = await fetch(matchupsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
        next: { revalidate: 900 },
      }).then((r) => r.text());

      const matchupRegex = /<tr\s+data-name="[^"]*"\s+data-matches="(\d+)"\s+data-winrate="([0-9.]+)">[\s\S]*?<a href="\/decks\/([A-Z0-9-]+)\/matchups\?game=OP[^\"]*">/gi;
      let mm: RegExpExecArray | null;
      matchupSamples[deck.cardId] = matchupSamples[deck.cardId] || {};
      while ((mm = matchupRegex.exec(h)) !== null) {
        const matches = Number(mm[1]);
        const rate = Number(mm[2]) * 100;
        const oppCardId = mm[3];
        const oppDeck = byCardId.get(oppCardId);
        if (!oppDeck) continue;
        deck.matchups[oppDeck.id] = Number(rate.toFixed(2));
        matchupSamples[deck.cardId][oppCardId] = {
          winRate: Number(rate.toFixed(2)),
          matches,
        };
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
      source: `tournament-aggregate (${set}, ${time}${type !== "all" ? `, ${type}` : ""})`,
      updatedAt: new Date().toISOString(),
      sampleGames,
      decks,
      leaderSampleGames,
      matchupSamples,
    };
  } catch {
    return null;
  }
}

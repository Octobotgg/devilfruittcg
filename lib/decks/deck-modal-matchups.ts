import type { MetaDeck } from "@/lib/meta-decks";

export type DeckMatchupTone = "favored" | "even" | "unfavored";

export type DeckMatchupRow = {
  opponentId: string;
  opponentCardId: string;
  opponentName: string;
  opponentColor: string;
  metaShare: number;
  winRate: number;
  tone: DeckMatchupTone;
};

function toneForWinRate(winRate: number): DeckMatchupTone {
  if (winRate >= 55) return "favored";
  if (winRate < 45) return "unfavored";
  return "even";
}

export function buildDeckMatchupSnapshot(
  leaderCardId: string | null | undefined,
  metaDecks: MetaDeck[],
  limit = 6,
): DeckMatchupRow[] {
  const leaderId = String(leaderCardId || "").trim().toUpperCase();
  if (!leaderId) return [];

  const leaderDeck = metaDecks.find((deck) => deck.cardId.toUpperCase() === leaderId);
  if (!leaderDeck) return [];

  return [...metaDecks]
    .filter((deck) => deck.cardId.toUpperCase() !== leaderId)
    .sort((a, b) => b.metaShare - a.metaShare)
    .slice(0, limit)
    .map((deck) => {
      const winRate = Number(leaderDeck.matchups[deck.id] ?? 50);
      return {
        opponentId: deck.id,
        opponentCardId: deck.cardId,
        opponentName: deck.leader,
        opponentColor: deck.color,
        metaShare: deck.metaShare,
        winRate,
        tone: toneForWinRate(winRate),
      };
    });
}

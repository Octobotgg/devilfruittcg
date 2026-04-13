import type { Card } from "@/lib/cards";
import type { Collection, Deck } from "@/lib/cloud/types";

export type DeckCoverageMissingCard = {
  cardId: string;
  cardName: string;
  quantity: number;
  owned: number;
  needed: number;
};

export type DeckCollectionCoverage = {
  totalCopies: number;
  ownedCopies: number;
  missingCopies: number;
  missingCards: DeckCoverageMissingCard[];
};

export function buildDeckCollectionCoverage(
  deck: Deck,
  collection: Collection,
  cardsById: Map<string, Card>,
): DeckCollectionCoverage {
  let totalCopies = 0;
  let ownedCopies = 0;
  const missingCards: DeckCoverageMissingCard[] = [];

  for (const entry of deck.cards) {
    totalCopies += entry.quantity;

    const owned = Math.min(collection[entry.cardId]?.quantity || 0, entry.quantity);
    ownedCopies += owned;

    if (owned >= entry.quantity) continue;

    missingCards.push({
      cardId: entry.cardId,
      cardName: cardsById.get(entry.cardId)?.name || entry.cardId,
      quantity: entry.quantity,
      owned,
      needed: entry.quantity - owned,
    });
  }

  return {
    totalCopies,
    ownedCopies,
    missingCopies: totalCopies - ownedCopies,
    missingCards,
  };
}


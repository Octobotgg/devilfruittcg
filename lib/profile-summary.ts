import type { Card } from "@/lib/cards";
import type { Collection, Deck } from "@/lib/cloud/types";
import type { ProfileSummary } from "@/lib/profile-types";

type PriceLike = {
  marketPrice?: number | null;
  estimatedPrice?: number | null;
  price?: number | null;
};

type BuildProfileSummaryOptions = {
  collection: Collection;
  decks: Deck[];
  watchlistCount: number;
  tradeCount: number;
  cards: Card[];
  priceMap?: Map<string, PriceLike>;
};

type DeckSummaryPatch = Pick<ProfileSummary, "totalDecksBuilt" | "battleReadyDecks"> &
  Partial<Pick<ProfileSummary, "favoriteColors" | "mostUsedLeader">>;

function baseCards(cards: Card[]) {
  return cards.filter((card) => !card.baseId || card.id === card.baseId);
}

function cardPrice(cardId: string, priceMap?: Map<string, PriceLike>) {
  if (!priceMap) return 0;
  const price = priceMap.get(cardId.toUpperCase());
  const direct = typeof price?.marketPrice === "number" ? price.marketPrice : null;
  if (direct && Number.isFinite(direct)) return direct;
  const estimated = typeof price?.estimatedPrice === "number" ? price.estimatedPrice : null;
  if (estimated && Number.isFinite(estimated)) return estimated;
  const fallback = typeof price?.price === "number" ? price.price : null;
  return fallback && Number.isFinite(fallback) ? fallback : 0;
}

function mainDeckCount(deck: Deck) {
  return deck.cards.reduce((sum, entry) => sum + entry.quantity, 0);
}

function buildDeckStats(decks: Deck[], cards: Card[]): DeckSummaryPatch {
  const allBaseCards = baseCards(cards);
  const cardById = new Map(allBaseCards.map((card) => [card.id.toUpperCase(), card]));
  const leaderUsage = new Map<string, number>();
  const colorUsage = new Map<string, number>();

  decks.forEach((deck) => {
    if (!deck.leaderId) return;
    const leaderId = deck.leaderId.toUpperCase();
    leaderUsage.set(leaderId, (leaderUsage.get(leaderId) || 0) + 1);

    const leaderCard = cardById.get(leaderId);
    String(leaderCard?.color || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((color) => colorUsage.set(color, (colorUsage.get(color) || 0) + 1));
  });

  const patch: DeckSummaryPatch = {
    totalDecksBuilt: decks.length,
    battleReadyDecks: decks.filter((deck) => Boolean(deck.leaderId) && mainDeckCount(deck) === 50).length,
  };

  if (decks.length === 0) {
    patch.favoriteColors = [];
    patch.mostUsedLeader = null;
    return patch;
  }

  const mostUsedLeaderEntry = Array.from(leaderUsage.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostUsedLeaderCard = mostUsedLeaderEntry ? cardById.get(mostUsedLeaderEntry[0]) : null;
  const favoriteColors = Array.from(colorUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);

  if (favoriteColors.length) {
    patch.favoriteColors = favoriteColors;
  }

  if (mostUsedLeaderCard) {
    patch.mostUsedLeader = {
      cardId: mostUsedLeaderCard.id,
      name: mostUsedLeaderCard.name,
      color: mostUsedLeaderCard.color,
      imageUrl: mostUsedLeaderCard.imageUrl || null,
    };
  }

  return patch;
}

export function buildDeckSummaryPatch(input: { decks: Deck[]; cards: Card[] }): DeckSummaryPatch {
  return buildDeckStats(input.decks, input.cards);
}

export function buildProfileSummary({
  collection,
  decks,
  watchlistCount,
  tradeCount,
  cards,
  priceMap,
}: BuildProfileSummaryOptions): ProfileSummary {
  const allBaseCards = baseCards(cards);
  const cardById = new Map(allBaseCards.map((card) => [card.id.toUpperCase(), card]));
  const collectionEntries = Object.values(collection).filter((entry) => entry.quantity > 0);
  const uniqueCardsOwned = collectionEntries.length;
  const totalCardsOwned = collectionEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  const collectionValue = collectionEntries.reduce((sum, entry) => {
    const price = cardPrice(entry.cardId, priceMap);
    return sum + price * entry.quantity;
  }, 0);

  const topValuableCards = collectionEntries
    .map((entry) => {
      const card = cardById.get(entry.cardId.toUpperCase());
      const price = cardPrice(entry.cardId, priceMap);
      return {
        cardId: entry.cardId.toUpperCase(),
        name: card?.name || entry.cardId.toUpperCase(),
        imageUrl: card?.imageUrl || null,
        price: Number((price * entry.quantity).toFixed(2)),
        quantity: entry.quantity,
      };
    })
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  const totalBySet = new Map<string, number>();
  const ownedBySet = new Map<string, number>();
  const ownedCardIds = new Set(collectionEntries.map((entry) => entry.cardId.toUpperCase()));

  allBaseCards.forEach((card) => {
    totalBySet.set(card.setCode, (totalBySet.get(card.setCode) || 0) + 1);
    if (ownedCardIds.has(card.id.toUpperCase())) {
      ownedBySet.set(card.setCode, (ownedBySet.get(card.setCode) || 0) + 1);
    }
  });

  const completedSetCodes = Array.from(totalBySet.entries())
    .filter(([setCode, total]) => total > 0 && (ownedBySet.get(setCode) || 0) >= total)
    .map(([setCode]) => setCode)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const deckStats = buildDeckStats(decks, cards);

  return {
    uniqueCardsOwned,
    totalCardsOwned,
    collectionValue: Number(collectionValue.toFixed(2)),
    setsCompleted: completedSetCodes.length,
    completedSetCodes,
    topValuableCards,
    totalDecksBuilt: deckStats.totalDecksBuilt,
    battleReadyDecks: deckStats.battleReadyDecks,
    favoriteColors: deckStats.favoriteColors || [],
    mostUsedLeader: deckStats.mostUsedLeader || null,
    wishlistCount: watchlistCount,
    tradeCount,
    collectionCards: collectionEntries.map((entry) => ({
      cardId: entry.cardId.toUpperCase(),
      quantity: entry.quantity,
    })),
    updatedAt: new Date().toISOString(),
  };
}

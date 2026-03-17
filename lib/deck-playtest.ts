import type { Deck } from "@/lib/cloud/types";

export type PlaytestTurnOrder = "first" | "second";

export type PlaytestState = {
  order: PlaytestTurnOrder;
  drawPile: string[];
  hand: string[];
  life: string[];
  turn: number;
  donCount: number;
  lastDrawnId: string | null;
};

type CreatePlaytestOptions = {
  order?: PlaytestTurnOrder;
  handSize?: number;
  lifeCards?: number;
};

function shuffle<T>(input: T[]) {
  const next = [...input];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function expandDeck(deck: Deck) {
  const output: string[] = [];

  deck.cards.forEach((entry) => {
    for (let copy = 0; copy < entry.quantity; copy += 1) output.push(entry.cardId);
  });

  return output;
}

export function createPlaytestState(deck: Deck, options: CreatePlaytestOptions = {}): PlaytestState {
  const order = options.order || "first";
  const handSize = options.handSize ?? 5;
  const lifeCards = options.lifeCards ?? 5;
  const shuffledDeck = shuffle(expandDeck(deck));
  const hand = shuffledDeck.splice(0, handSize);
  const life = shuffledDeck.splice(0, lifeCards);

  return {
    order,
    hand,
    life,
    drawPile: shuffledDeck,
    turn: 0,
    donCount: 0,
    lastDrawnId: null,
  };
}

export function drawPlaytestCard(state: PlaytestState): PlaytestState {
  const nextDrawPile = [...state.drawPile];
  const nextCard = nextDrawPile.shift() || null;
  const nextTurn = state.turn + 1;
  const nextDonCount = Math.min(10, state.donCount + (state.turn === 0 ? (state.order === "first" ? 1 : 2) : 2));

  return {
    ...state,
    turn: nextTurn,
    donCount: nextDonCount,
    drawPile: nextDrawPile,
    hand: nextCard ? [...state.hand, nextCard] : state.hand,
    lastDrawnId: nextCard,
  };
}

import type { Deck } from "@/lib/cloud/types";

export function buildDeckSimExportLines(deck: Deck) {
  const lines: string[] = [];

  if (deck.leaderId) {
    lines.push(`1x ${deck.leaderId} (Leader)`);
  }

  for (const entry of deck.cards) {
    lines.push(`${entry.quantity}x ${entry.cardId}`);
  }

  return lines;
}

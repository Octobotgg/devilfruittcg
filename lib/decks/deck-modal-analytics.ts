import type { Card } from "@/lib/cards";

export type DeckCostCurveBucket = {
  label: string;
  count: number;
};

export type DeckCounterBreakdown = {
  plus2000: number;
  plus1000: number;
  zero: number;
};

export type DeckAnalyticsSummary = {
  costCurve: DeckCostCurveBucket[];
  counterBreakdown: DeckCounterBreakdown;
};

export function buildDeckAnalytics(entries: Array<{ card: Card; quantity: number }>): DeckAnalyticsSummary {
  const costCurve = Array.from({ length: 10 }, (_, index) => ({
    label: String(index),
    count: 0,
  }));
  costCurve.push({ label: "10+", count: 0 });

  const counterBreakdown: DeckCounterBreakdown = {
    plus2000: 0,
    plus1000: 0,
    zero: 0,
  };

  for (const entry of entries) {
    if (entry.card.type === "Leader") continue;

    const cost = typeof entry.card.cost === "number" ? entry.card.cost : Number(entry.card.cost || 0);
    const costIndex = cost >= 10 ? 10 : Math.max(0, cost);
    costCurve[costIndex].count += entry.quantity;

    const counter = typeof entry.card.counter === "number" ? entry.card.counter : Number(entry.card.counter || 0);
    if (counter >= 2000) counterBreakdown.plus2000 += entry.quantity;
    else if (counter >= 1000) counterBreakdown.plus1000 += entry.quantity;
    else counterBreakdown.zero += entry.quantity;
  }

  return {
    costCurve,
    counterBreakdown,
  };
}


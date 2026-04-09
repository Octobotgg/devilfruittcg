import type { CardPrintRuntimePrice } from "./server/pricing/external-products.ts";

export type CardPriceQuote = {
  cardId: string;
  marketPrice: number | null;
  estimatedPrice: number;
  source: "published" | "unpriced";
  stale: boolean;
  updatedAt: string | null;
  priced: boolean;
  missingReason: string | null;
  priceType: "market" | "near_mint" | null;
};

export function toCardPriceQuote(cardId: string, runtimePrice: CardPrintRuntimePrice): CardPriceQuote {
  const normalizedId = String(cardId || "").trim().toUpperCase();

  if (runtimePrice.status !== "priced") {
    return {
      cardId: normalizedId,
      marketPrice: null,
      estimatedPrice: 0,
      source: "unpriced",
      stale: false,
      updatedAt: null,
      priced: false,
      missingReason: runtimePrice.reason,
      priceType: null,
    };
  }

  const resolvedPrice = typeof runtimePrice.priceMarket === "number" ? runtimePrice.priceMarket : runtimePrice.currentPrice;

  return {
    cardId: normalizedId,
    marketPrice: resolvedPrice,
    estimatedPrice: resolvedPrice,
    source: "published",
    stale: false,
    updatedAt: runtimePrice.updatedAt,
    priced: true,
    missingReason: null,
    priceType: typeof runtimePrice.priceMarket === "number" ? "market" : "near_mint",
  };
}

type MarketLike = {
  ebay?: {
    averagePrice?: number | null;
  };
  tcgplayer?: {
    market?: number | null;
  };
};

type JustTcgPriceLike = {
  marketPrice?: number | null;
};

export function resolveCardDetailPricingState({
  market,
  tcgPrice,
  hasResolvedTcgPrice,
}: {
  market: MarketLike | null;
  tcgPrice: JustTcgPriceLike | null;
  hasResolvedTcgPrice: boolean;
}) {
  const justTcgMarketPrice =
    tcgPrice && typeof tcgPrice.marketPrice === "number" ? tcgPrice.marketPrice : null;

  if (justTcgMarketPrice !== null) {
    return {
      mode: "priced" as const,
      headlinePrice: justTcgMarketPrice,
      usesJustTcgPrice: true,
    };
  }

  if (hasResolvedTcgPrice) {
    return {
      mode: "unpriced" as const,
      headlinePrice: null,
      usesJustTcgPrice: false,
    };
  }

  return {
    mode: market ? ("legacy" as const) : ("loading" as const),
    headlinePrice: market?.ebay?.averagePrice ?? null,
    usesJustTcgPrice: false,
  };
}

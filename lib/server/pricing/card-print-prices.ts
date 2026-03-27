import type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";

export type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";
export type LoadCardPrintPriceRows = (
  cardPrintIds: string[],
) => Promise<CardPrintPriceRow[]>;

export {
  getCardPrintRuntimeDetail,
  getCardPrintRuntimePrice,
  getCardPrintRuntimePrices,
  resolvePublishedCardPrintRuntimePrice as resolveCardPrintRuntimePrice,
} from "./published-card-prices.ts";

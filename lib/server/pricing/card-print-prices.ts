import type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";

export type { CardPrintPriceRow, CardPrintRuntimePrice } from "./external-products";
export type LoadCardPrintPriceRows = (
  cardPrintIds: string[],
) => Promise<CardPrintPriceRow[]>;

export {
  getCardPrintRuntimeDetail,
  getCardPrintRuntimePrice,
  getCardPrintRuntimePrices,
  resolveJustTcgVariantRuntimePrice as resolveCardPrintRuntimePrice,
} from "./justtcg-variant-read-model.ts";

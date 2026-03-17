import type { Card } from "@/lib/cards";

export type MarketSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "number_asc"
  | "newest";

export type MarketPriceSummary = {
  marketPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  updatedAt: string | null;
  stale: boolean;
  cached: boolean;
};

export type MarketCardResult = Card & {
  market: MarketPriceSummary | null;
};

export type MarketFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type MarketRange = {
  min: number;
  max: number;
};

export type MarketFacets = {
  sets: MarketFacetOption[];
  types: MarketFacetOption[];
  colors: MarketFacetOption[];
  rarities: MarketFacetOption[];
  counters: MarketFacetOption[];
  attributes: MarketFacetOption[];
};

export type MarketCatalogResponse = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: MarketSort;
  query: string;
  results: MarketCardResult[];
  facets: MarketFacets;
  ranges: {
    cost: MarketRange;
    life: MarketRange;
    power: MarketRange;
  };
};

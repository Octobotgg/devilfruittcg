import type { Card } from "@/lib/cards";

export type MarketSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "number_asc"
  | "newest";

export type MarketCatalogQuery = {
  q?: string;
  sets?: string[];
  types?: string[];
  colors?: string[];
  rarities?: string[];
  counters?: number[];
  attributes?: string[];
  costMin?: number;
  costMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  powerMin?: number;
  powerMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: MarketSort;
  page?: number;
  pageSize?: number;
  includeMetadata?: boolean;
};

export type MarketPriceSummary = {
  marketPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  updatedAt: string | null;
  fetchedAt?: string | null;
  priceChange7d?: number | null;
  stale: boolean;
  cached: boolean;
  source?: "justtcg" | "market_cache";
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

export type MarketCatalogSnapshotResponse = {
  total: number;
  cards: MarketCardResult[];
  facets: MarketFacets;
  ranges: {
    cost: MarketRange;
    life: MarketRange;
    power: MarketRange;
  };
};

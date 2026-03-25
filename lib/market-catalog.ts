import { createRequire } from "node:module";

import type { MarketCatalogResponse, MarketSort } from "./market-types";

const require = createRequire(import.meta.url);
if (process.env.NODE_ENV !== "test") {
  require("server-only");
}
const marketSearch = require("./server/market/market-search.ts") as typeof import("./server/market/market-search");

type MarketCatalogQuery = {
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
};

type MarketCatalogMetadata = Pick<MarketCatalogResponse, "facets" | "ranges">;
type SearchMarketCatalogReadModel = typeof marketSearch.searchMarketCatalogReadModel;

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 96;
const VALID_SORTS = new Set<MarketSort>([
  "relevance",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "number_asc",
  "newest",
]);

const EMPTY_METADATA: MarketCatalogMetadata = {
  facets: {
    sets: [],
    types: [],
    colors: [],
    rarities: [],
    counters: [],
    attributes: [],
  },
  ranges: {
    cost: { min: 0, max: 0 },
    life: { min: 0, max: 0 },
    power: { min: 0, max: 0 },
  },
};

let cachedMetadata: MarketCatalogMetadata = EMPTY_METADATA;

function clampPage(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
}

function clampPageSize(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(12, Math.trunc(value)));
}

function normalizeSort(sort: MarketCatalogQuery["sort"], query: string | undefined): MarketSort {
  if (sort && VALID_SORTS.has(sort)) return sort;
  return String(query || "").trim() ? "relevance" : "newest";
}

export function getMarketCatalogMetadata() {
  return cachedMetadata;
}

export async function searchMarketCatalog(
  query: MarketCatalogQuery,
  options?: {
    searchReadModel?: SearchMarketCatalogReadModel;
  },
): Promise<MarketCatalogResponse> {
  const searchReadModel = options?.searchReadModel ?? marketSearch.searchMarketCatalogReadModel;
  const result = await searchReadModel({
    ...query,
    sort: normalizeSort(query.sort, query.q),
    page: clampPage(query.page),
    pageSize: clampPageSize(query.pageSize),
  });

  cachedMetadata = {
    facets: result.facets,
    ranges: result.ranges,
  };

  return result;
}

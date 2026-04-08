import type { ReadonlyURLSearchParams } from "next/navigation";

import type { MarketCatalogQuery, MarketSort } from "@/lib/market-types";

export type ViewMode = "grid" | "list";

export type MarketUrlState = {
  q: string;
  sets: string[];
  types: string[];
  colors: string[];
  rarities: string[];
  counters: string[];
  attributes: string[];
  costMin: string;
  costMax: string;
  lifeMin: string;
  lifeMax: string;
  powerMin: string;
  powerMax: string;
  priceMin: string;
  priceMax: string;
  sort: MarketSort;
  page: number;
  pageSize: number;
  view: ViewMode;
};

export const MARKET_PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export const DEFAULT_MARKET_PAGE_SIZE = 24;

function parseListParams(searchParams: URLSearchParams | ReadonlyURLSearchParams, key: string) {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export function defaultMarketSortForQuery(q: string): MarketSort {
  return q.trim() ? "relevance" : "newest";
}

export function parseMarketUrlState(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  options?: { allowAnyPageSize?: boolean },
): MarketUrlState {
  const q = (searchParams.get("q") || searchParams.get("card") || "").trim();
  const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_MARKET_PAGE_SIZE);

  return {
    q,
    sets: parseListParams(searchParams, "set"),
    types: parseListParams(searchParams, "type"),
    colors: parseListParams(searchParams, "color"),
    rarities: parseListParams(searchParams, "rarity"),
    counters: parseListParams(searchParams, "counter"),
    attributes: parseListParams(searchParams, "attribute"),
    costMin: searchParams.get("costMin") || "",
    costMax: searchParams.get("costMax") || "",
    lifeMin: searchParams.get("lifeMin") || "",
    lifeMax: searchParams.get("lifeMax") || "",
    powerMin: searchParams.get("powerMin") || "",
    powerMax: searchParams.get("powerMax") || "",
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    sort: (searchParams.get("sort") as MarketSort) || defaultMarketSortForQuery(q),
    page: parsePositiveInt(searchParams.get("page"), 1),
    pageSize: options?.allowAnyPageSize || MARKET_PAGE_SIZE_OPTIONS.includes(pageSize as (typeof MARKET_PAGE_SIZE_OPTIONS)[number])
      ? pageSize
      : DEFAULT_MARKET_PAGE_SIZE,
    view: searchParams.get("view") === "list" ? "list" : "grid",
  };
}

export function applyMarketStateToParams(state: MarketUrlState) {
  const params = new URLSearchParams();

  if (state.q) params.set("q", state.q);
  state.sets.forEach((value) => params.append("set", value));
  state.types.forEach((value) => params.append("type", value));
  state.colors.forEach((value) => params.append("color", value));
  state.rarities.forEach((value) => params.append("rarity", value));
  state.counters.forEach((value) => params.append("counter", value));
  state.attributes.forEach((value) => params.append("attribute", value));

  if (state.costMin) params.set("costMin", state.costMin);
  if (state.costMax) params.set("costMax", state.costMax);
  if (state.lifeMin) params.set("lifeMin", state.lifeMin);
  if (state.lifeMax) params.set("lifeMax", state.lifeMax);
  if (state.powerMin) params.set("powerMin", state.powerMin);
  if (state.powerMax) params.set("powerMax", state.powerMax);
  if (state.priceMin) params.set("priceMin", state.priceMin);
  if (state.priceMax) params.set("priceMax", state.priceMax);

  params.set("sort", state.sort);
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  if (state.view === "list") params.set("view", state.view);

  return params;
}

export function buildMarketCatalogApiQuery(state: MarketUrlState) {
  return applyMarketStateToParams(state).toString();
}

function parseMaybeNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function marketUrlStateToCatalogQuery(
  state: MarketUrlState,
  options?: { includeMetadata?: boolean },
): MarketCatalogQuery {
  return {
    q: state.q,
    sets: state.sets,
    types: state.types,
    colors: state.colors,
    rarities: state.rarities,
    counters: state.counters.map((value) => Number(value)).filter((value) => Number.isFinite(value)),
    attributes: state.attributes,
    costMin: parseMaybeNumber(state.costMin),
    costMax: parseMaybeNumber(state.costMax),
    lifeMin: parseMaybeNumber(state.lifeMin),
    lifeMax: parseMaybeNumber(state.lifeMax),
    powerMin: parseMaybeNumber(state.powerMin),
    powerMax: parseMaybeNumber(state.powerMax),
    priceMin: parseMaybeNumber(state.priceMin),
    priceMax: parseMaybeNumber(state.priceMax),
    sort: state.sort,
    page: state.page,
    pageSize: state.pageSize,
    includeMetadata: options?.includeMetadata,
  };
}

export function searchParamsRecordToUrlSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => params.append(key, entry));
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }

  return params;
}

import type { MarketUrlState } from "./market-query";

function hasValues(values: readonly unknown[]) {
  return values.length > 0;
}

export function hasNarrowingMarketQuery(state: MarketUrlState) {
  return (
    state.q.trim().length > 0 ||
    hasValues(state.sets) ||
    hasValues(state.types) ||
    hasValues(state.colors) ||
    hasValues(state.rarities) ||
    hasValues(state.counters) ||
    hasValues(state.attributes) ||
    state.costMin.length > 0 ||
    state.costMax.length > 0 ||
    state.lifeMin.length > 0 ||
    state.lifeMax.length > 0 ||
    state.powerMin.length > 0 ||
    state.powerMax.length > 0 ||
    state.priceMin.length > 0 ||
    state.priceMax.length > 0
  );
}

export function shouldUseMarketSnapshotResult(state: MarketUrlState, snapshotTotal: number) {
  if (snapshotTotal > 0) return true;

  // A warmed snapshot can lag behind newly imported cards; confirm empty narrowed views with the live API.
  return !hasNarrowingMarketQuery(state);
}

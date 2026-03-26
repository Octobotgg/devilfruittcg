export type MarketSectionKey =
  | "sets"
  | "types"
  | "colors"
  | "rarities"
  | "costLife"
  | "power"
  | "counter"
  | "attribute"
  | "price";

export type MarketFilterSectionState = Record<MarketSectionKey, boolean>;

type DesktopOpenSectionsInput = {
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
};

export function getInitialMarketOpenSections(): MarketFilterSectionState {
  return {
    sets: true,
    types: true,
    colors: true,
    rarities: true,
    costLife: true,
    power: true,
    counter: true,
    attribute: true,
    price: true,
  };
}

export function getDesktopMarketOpenSections(state: DesktopOpenSectionsInput): MarketFilterSectionState {
  return {
    sets: state.sets.length > 0,
    types: state.types.length > 0,
    colors: state.colors.length > 0,
    rarities: state.rarities.length > 0,
    costLife: Boolean(state.costMin || state.costMax || state.lifeMin || state.lifeMax),
    power: Boolean(state.powerMin || state.powerMax),
    counter: state.counters.length > 0,
    attribute: state.attributes.length > 0,
    price: Boolean(state.priceMin || state.priceMax),
  };
}

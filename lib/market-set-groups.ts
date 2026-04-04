import type { MarketFacetOption } from "@/lib/market-types";

export type MarketSetGroupKey = "boosters" | "starterDecks" | "promos";

export type MarketSetGroup = {
  key: MarketSetGroupKey;
  label: string;
  options: MarketFacetOption[];
};

const GROUP_LABELS: Record<MarketSetGroupKey, string> = {
  boosters: "Boosters",
  starterDecks: "Starter Decks",
  promos: "Promos",
};

const EVENT_LANE_HINT = /(EVENT|CHAMPIONSHIP|REGIONAL|FINALIST|WINNER|TOP_PLAYER|ANNIVERSARY|FEST|PACK|PROMO)/iu;

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function extractPrimarySetCode(value: string) {
  const normalizedValue = String(value || "").trim().toUpperCase();
  if (!normalizedValue || EVENT_LANE_HINT.test(normalizedValue)) return null;

  const match = normalizedValue.match(/^(OP|EB|ST|PRB)\d{1,2}/u);
  return match?.[0] || null;
}

function compareFacetOptions(left: MarketFacetOption, right: MarketFacetOption) {
  return left.value.localeCompare(right.value, undefined, { numeric: true });
}

function classifyMarketSetOption(option: MarketFacetOption): MarketSetGroupKey {
  const value = extractPrimarySetCode(option.value);

  if (!value) return "promos";
  if (/^ST\d{1,2}$/u.test(value)) return "starterDecks";
  if (/^(OP|EB|PRB)\d{1,2}$/u.test(value)) return "boosters";
  return "promos";
}

function scoreSearchResult(option: MarketFacetOption, query: string) {
  const normalizedQuery = normalizeText(query);
  const normalizedValue = normalizeText(option.value);
  const normalizedLabel = normalizeText(option.label);

  if (normalizedValue === normalizedQuery) return 400;
  if (normalizedLabel === normalizedQuery) return 350;
  if (normalizedValue.startsWith(normalizedQuery)) return 300;
  if (normalizedLabel.startsWith(normalizedQuery)) return 250;
  if (normalizedValue.includes(normalizedQuery)) return 200;
  if (normalizedLabel.includes(normalizedQuery)) return 150;
  return 0;
}

export function buildMarketSetFilterGroups(options: MarketFacetOption[]) {
  const grouped = options
    .reduce<Record<MarketSetGroupKey, MarketFacetOption[]>>(
      (accumulator, option) => {
        accumulator[classifyMarketSetOption(option)].push(option);
        return accumulator;
      },
      { boosters: [], starterDecks: [], promos: [] },
    );

  const groups: MarketSetGroup[] = (["boosters", "starterDecks", "promos"] as const).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    options: grouped[key].toSorted(compareFacetOptions),
  }));

  return groups;
}

export function searchMarketSetOptions(options: MarketFacetOption[], query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return options
    .map((option) => ({ option, score: scoreSearchResult(option, normalizedQuery) }))
    .filter((entry) => entry.score > 0)
    .toSorted((left, right) => right.score - left.score || compareFacetOptions(left.option, right.option))
    .map((entry) => entry.option);
}

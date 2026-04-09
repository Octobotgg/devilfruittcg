const DAY_MS = 24 * 60 * 60 * 1000;

export const MARKET_HISTORY_RANGES = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
} as const;

export const MARKET_HISTORY_RANGE_DAYS = {
  30: "1M",
  90: "3M",
  180: "6M",
  365: "1Y",
} as const;

export type MarketHistoryRangeId = keyof typeof MARKET_HISTORY_RANGES;

export type MarketHistoryPoint = {
  ts: number;
  date: string;
  tcgMarket: number;
};

export type MarketHistoryPointInput = {
  ts?: number | string | Date | null;
  date?: string | null;
  tcgMarket?: number | string | null;
};

export type MarketHistoryState = {
  rangeId: MarketHistoryRangeId;
  rangeDays: number;
  points: MarketHistoryPoint[];
  mode: "empty" | "sparse" | "ready";
};

type MarketHistoryDateLabelOptions = {
  locale?: string;
  year?: boolean;
};

function parseTimestamp(value: MarketHistoryPointInput["ts"]) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsePrice(value: MarketHistoryPointInput["tcgMarket"]) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePoint(point: MarketHistoryPointInput): MarketHistoryPoint | null {
  const ts = parseTimestamp(point.ts);
  const tcgMarket = parsePrice(point.tcgMarket);
  if (ts === null || tcgMarket === null) return null;

  return {
    ts,
    date: new Date(ts).toISOString().slice(0, 10),
    tcgMarket,
  };
}

export function normalizeMarketHistoryPoints(points: MarketHistoryPointInput[]) {
  const byTs = new Map<number, MarketHistoryPoint>();

  for (const point of points) {
    const normalized = normalizePoint(point);
    if (!normalized) continue;
    byTs.set(normalized.ts, normalized);
  }

  return [...byTs.values()].sort((left, right) => left.ts - right.ts);
}

export function filterMarketHistoryPoints(
  points: MarketHistoryPointInput[],
  rangeDays: number,
  now: number,
) {
  const normalized = normalizeMarketHistoryPoints(points);
  const cutoff = now - Math.max(1, rangeDays) * DAY_MS;
  return normalized.filter((point) => point.ts >= cutoff);
}

export function formatMarketHistoryDateLabel(
  value: unknown,
  options?: MarketHistoryDateLabelOptions,
) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (!text) return "";

  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (directMatch) {
    const [, year, month, day] = directMatch;
    const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return utcDate.toLocaleDateString(options?.locale, {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      ...(options?.year ? { year: "numeric" as const } : {}),
    });
  }

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return text;

  return new Date(parsed).toLocaleDateString(options?.locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(options?.year ? { year: "numeric" as const } : {}),
  });
}

export function buildMarketHistoryState({
  points,
  rangeId,
  now,
}: {
  points: MarketHistoryPointInput[];
  rangeId: MarketHistoryRangeId;
  now: number;
}): MarketHistoryState {
  const rangeDays = MARKET_HISTORY_RANGES[rangeId];
  const rangedPoints = filterMarketHistoryPoints(points, rangeDays, now);

  return {
    rangeId,
    rangeDays,
    points: rangedPoints,
    mode: rangedPoints.length >= 2 ? "ready" : rangedPoints.length === 1 ? "sparse" : "empty",
  };
}

import {
  MARKET_HISTORY_RANGES,
  normalizeMarketHistoryPoints,
  type MarketHistoryPoint,
  type MarketHistoryPointInput,
  type MarketHistoryRangeId,
} from "../../lib/market-history.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const PARTIAL_RANGE_SLOP_DAYS = 2;

export const CHART_GAP_BREAK_DAYS = 7;

export type ChartHistoryPoint = Omit<MarketHistoryPoint, "tcgMarket"> & {
  t: number;
  tcgMarket: number | null;
  isGap?: boolean;
};

function withChartTimestamp(point: MarketHistoryPoint): ChartHistoryPoint {
  return {
    ...point,
    t: point.ts,
  };
}

export function insertChartGapBreaks(points: MarketHistoryPoint[]): ChartHistoryPoint[] {
  if (points.length <= 1) return points.map(withChartTimestamp);

  const chartPoints: ChartHistoryPoint[] = [];
  const gapThresholdMs = CHART_GAP_BREAK_DAYS * DAY_MS;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    chartPoints.push(withChartTimestamp(current));

    if (!next) continue;
    const gapMs = next.ts - current.ts;
    if (gapMs <= gapThresholdMs) continue;

    const midpoint = current.ts + Math.round(gapMs / 2);
    chartPoints.push({
      ts: midpoint,
      t: midpoint,
      date: new Date(midpoint).toISOString().slice(0, 10),
      tcgMarket: null,
      isGap: true,
    });
  }

  return chartPoints;
}

export function buildTimeTicks(points: Array<{ t: number }>, preferredTickCount = 5) {
  const timestamps = [
    ...new Set(
      points
        .map((point) => point.t)
        .filter((timestamp) => Number.isFinite(timestamp))
        .sort((left, right) => left - right),
    ),
  ];
  if (timestamps.length <= preferredTickCount) return timestamps;

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const span = last - first;
  if (span <= 0) return [first];

  const ticks = [];
  for (let index = 0; index < preferredTickCount; index += 1) {
    ticks.push(Math.round(first + (span * index) / (preferredTickCount - 1)));
  }

  return [...new Set(ticks)];
}

export function getAvailableHistoryDays(points: MarketHistoryPointInput[]) {
  const normalized = normalizeMarketHistoryPoints(points);
  if (normalized.length < 2) return null;

  const oldest = normalized[0];
  const newest = normalized[normalized.length - 1];
  return Math.round((newest.ts - oldest.ts) / DAY_MS);
}

export function buildAccumulatingHistoryNote(
  points: MarketHistoryPointInput[],
  rangeId: MarketHistoryRangeId,
) {
  const actualAvailableDays = getAvailableHistoryDays(points);
  if (actualAvailableDays == null) return null;

  const requestedRangeDays = MARKET_HISTORY_RANGES[rangeId];
  if (actualAvailableDays >= requestedRangeDays - PARTIAL_RANGE_SLOP_DAYS) return null;

  const dayLabel = actualAvailableDays === 1 ? "day" : "days";
  return `${actualAvailableDays} ${dayLabel} of history available — more accumulating daily.`;
}

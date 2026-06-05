import RELEASES from "@/data/bandai-en-official-releases.json";

export const INSIGHT_TIME_RANGES = [
  "season",
  "all",
  "year",
  "6months",
  "3months",
  "1month",
  "1week",
] as const;

export type InsightTimeRange = (typeof INSIGHT_TIME_RANGES)[number];
export type InsightFixedTimeRange = Exclude<InsightTimeRange, "all" | "season">;

type ReleaseRow = {
  name?: string | null;
  productTitle?: string | null;
  releaseDate?: string | null;
  category?: string | null;
};

const COMPETITIVE_RELEASE_CATEGORIES = new Set([
  "BOOSTER_PACK",
  "EXTRA_BOOSTER",
  "PREMIUM_BOOSTER",
  "STARTER_DECK",
]);

export function parseInsightTimeRange(value: string | null | undefined, fallback: InsightTimeRange = "season"): InsightTimeRange {
  const normalized = (value || "").trim().toLowerCase();
  return (INSIGHT_TIME_RANGES as readonly string[]).includes(normalized)
    ? (normalized as InsightTimeRange)
    : fallback;
}

export function insightTimeRangeLabel(range: InsightTimeRange): string {
  switch (range) {
    case "all":
      return "All Time";
    case "year":
      return "This Year";
    case "6months":
      return "6 Months";
    case "3months":
      return "3 Months";
    case "1month":
      return "This Month";
    case "1week":
      return "This Week";
    case "season":
    default:
      return "This Season";
  }
}

export function getLatestCompetitiveRelease(asOf = new Date()): { name: string; releaseDate: string } | null {
  const today = asOf.toISOString().slice(0, 10);

  const rows = (RELEASES as unknown as ReleaseRow[])
    .filter((row) => row.releaseDate && row.releaseDate <= today && COMPETITIVE_RELEASE_CATEGORIES.has(String(row.category || "").toUpperCase()))
    .sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate)));

  const latest = rows[0];
  if (!latest?.releaseDate) return null;

  return {
    name: latest.name || latest.productTitle || "Latest release",
    releaseDate: latest.releaseDate,
  };
}

export function daysSince(dateIso: string, asOf = new Date()): number {
  const start = new Date(`${dateIso}T00:00:00.000Z`).getTime();
  const end = new Date(asOf.toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function startOfUtcDay(asOf = new Date()): Date {
  return new Date(`${asOf.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractUtcDays(asOf: Date, days: number): string {
  const date = new Date(asOf.getTime());
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

function subtractUtcMonths(asOf: Date, months: number): string {
  const date = new Date(asOf.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return isoDate(date);
}

function startOfCurrentUtcYear(asOf: Date): string {
  return `${asOf.getUTCFullYear()}-01-01`;
}

export function getSeasonStartDate(asOf = new Date()): string | null {
  return getLatestCompetitiveRelease(asOf)?.releaseDate || null;
}

export function seasonApproximationRange(asOf = new Date()): InsightFixedTimeRange {
  const latest = getLatestCompetitiveRelease(asOf);
  if (!latest) return "3months";

  const ageDays = daysSince(latest.releaseDate, asOf);
  if (ageDays <= 7) return "1week";
  if (ageDays <= 31) return "1month";
  if (ageDays <= 93) return "3months";
  if (ageDays <= 186) return "6months";
  return "year";
}

export function resolveEffectiveRange(range: InsightTimeRange, asOf = new Date()): Exclude<InsightTimeRange, "season"> {
  if (range === "season") return seasonApproximationRange(asOf);
  return range;
}

export function getInsightDateWindow(
  range: InsightTimeRange,
  asOf = new Date()
): { startDate: string | null; endDate: string } {
  const end = startOfUtcDay(asOf);
  const endDate = isoDate(end);

  switch (range) {
    case "all":
      return { startDate: null, endDate };
    case "season": {
      const seasonStart = getSeasonStartDate(asOf);
      return { startDate: seasonStart || subtractUtcDays(end, 89), endDate };
    }
    case "year":
      return { startDate: startOfCurrentUtcYear(end), endDate };
    case "6months":
      return { startDate: subtractUtcMonths(end, 6), endDate };
    case "3months":
      return { startDate: subtractUtcMonths(end, 3), endDate };
    case "1month":
      return { startDate: subtractUtcMonths(end, 1), endDate };
    case "1week":
    default:
      return { startDate: subtractUtcDays(end, 6), endDate };
  }
}

export function toLimitlessTime(range: Exclude<InsightTimeRange, "all" | "1week" | "season">): "1month" | "3months" | "6months" | "12months" {
  switch (range) {
    case "1month":
      return "1month";
    case "3months":
      return "3months";
    case "6months":
      return "6months";
    case "year":
    default:
      return "12months";
  }
}

import "server-only";

import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const JUSTTCG_SUMMARY_REVALIDATE_SECONDS = 60 * 60;
const JUSTTCG_STALE_THRESHOLD_MS = 8 * 24 * 60 * 60 * 1000;

type JustTcgPriceRow = {
  devilfruit_id: string;
  justtcg_id: string;
  price_nm: number | null;
  price_lp: number | null;
  price_change_24h: number | null;
  price_change_7d: number | null;
  price_change_30d: number | null;
  last_updated_justtcg: string | null;
  fetched_at: string | null;
  raw_response?: Record<string, unknown> | null;
};

type JustTcgHistoryRow = {
  recorded_at: string;
  price_nm: number | null;
};

type JustTcgVariant = {
  condition?: string | null;
  printing?: string | null;
  language?: string | null;
  priceHistory?: Array<{ p?: number; t?: number }>;
  priceHistory30d?: Array<{ p?: number; t?: number }>;
  priceHistory90d?: Array<{ p?: number; t?: number }>;
};

export type JustTcgPriceSummary = {
  cardId: string;
  justtcgId: string;
  marketPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  priceLp: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  updatedAt: string | null;
  fetchedAt: string | null;
  stale: boolean;
  cached: true;
  source: "justtcg";
};

export type JustTcgHistoryPoint = {
  ts: number;
  date: string;
  tcgMarket: number | null;
};

let adminClient: SupabaseClient | null = null;

function cleanEnvValue(value: string | undefined) {
  return String(value || "").replace(/\\n/g, "").trim();
}

function getSupabaseConfig() {
  const url = cleanEnvValue(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);

  if (!url) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, key };
}

function getAdminClient() {
  if (adminClient) return adminClient;
  const config = getSupabaseConfig();
  adminClient = createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

function summaryFromRow(row: JustTcgPriceRow): JustTcgPriceSummary {
  const updatedAt = row.last_updated_justtcg || row.fetched_at || null;
  const updatedAtMs = updatedAt ? Date.parse(updatedAt) : NaN;
  const stale = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs > JUSTTCG_STALE_THRESHOLD_MS : true;

  return {
    cardId: row.devilfruit_id.toUpperCase(),
    justtcgId: row.justtcg_id,
    marketPrice: row.price_nm,
    averagePrice: row.price_nm,
    lowestPrice: null,
    highestPrice: null,
    priceLp: row.price_lp,
    priceChange24h: row.price_change_24h,
    priceChange7d: row.price_change_7d,
    priceChange30d: row.price_change_30d,
    updatedAt,
    fetchedAt: row.fetched_at || null,
    stale,
    cached: true,
    source: "justtcg",
  };
}

async function fetchAllPriceRows(): Promise<JustTcgPriceRow[]> {
  const supabase = getAdminClient();
  const rows: JustTcgPriceRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("justtcg_prices")
      .select("devilfruit_id,justtcg_id,price_nm,price_lp,price_change_24h,price_change_7d,price_change_30d,last_updated_justtcg,fetched_at")
      .order("devilfruit_id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    const page = (data || []) as JustTcgPriceRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

const getAllCachedSummaries = unstable_cache(
  async () => {
    const rows = await fetchAllPriceRows();
    return rows.reduce<Record<string, JustTcgPriceSummary>>((acc, row) => {
      acc[row.devilfruit_id.toUpperCase()] = summaryFromRow(row);
      return acc;
    }, {});
  },
  ["justtcg-price-summaries"],
  { revalidate: JUSTTCG_SUMMARY_REVALIDATE_SECONDS },
);

export async function getJustTcgPriceSummaries(cardIds: string[]) {
  const all = await getAllCachedSummaries();
  const selected: Record<string, JustTcgPriceSummary> = {};
  for (const cardId of cardIds) {
    const normalized = cardId.trim().toUpperCase();
    if (!normalized) continue;
    const summary = all[normalized];
    if (summary) selected[normalized] = summary;
  }
  return selected;
}

async function getSinglePriceRow(cardId: string): Promise<JustTcgPriceRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("justtcg_prices")
    .select("devilfruit_id,justtcg_id,price_nm,price_lp,price_change_24h,price_change_7d,price_change_30d,last_updated_justtcg,fetched_at,raw_response")
    .eq("devilfruit_id", cardId.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return (data as JustTcgPriceRow | null) || null;
}

function variantScore(variant: JustTcgVariant) {
  const condition = String(variant.condition || "").toLowerCase();
  const printing = String(variant.printing || "").toLowerCase();
  const language = String(variant.language || "").toLowerCase();

  let score = 0;
  if (language === "english") score += 100;
  if (condition === "near mint") score += 60;
  if (printing === "normal") score += 20;
  if (printing === "foil") score += 10;
  return score;
}

function pickPreferredVariant(rawResponse: Record<string, unknown> | null | undefined): JustTcgVariant | null {
  const variants = Array.isArray(rawResponse?.variants) ? (rawResponse?.variants as JustTcgVariant[]) : [];
  if (!variants.length) return null;
  return [...variants].sort((left, right) => variantScore(right) - variantScore(left))[0] || null;
}

function normalizeHistoryEntry(entry: { p?: number; t?: number } | null | undefined): JustTcgHistoryPoint | null {
  if (!entry || typeof entry.t !== "number") return null;
  const ts = entry.t * 1000;
  const value = typeof entry.p === "number" ? entry.p : null;
  return {
    ts,
    date: new Date(ts).toISOString().slice(0, 10),
    tcgMarket: value,
  };
}

function supplementalHistoryFromRaw(rawResponse: Record<string, unknown> | null | undefined, rangeDays: number) {
  const variant = pickPreferredVariant(rawResponse);
  if (!variant) return [] as JustTcgHistoryPoint[];

  const source =
    rangeDays > 30
      ? variant.priceHistory90d || variant.priceHistory30d || variant.priceHistory || []
      : rangeDays > 7
        ? variant.priceHistory30d || variant.priceHistory || []
        : variant.priceHistory || [];

  return (source || [])
    .map((entry) => normalizeHistoryEntry(entry))
    .filter((entry): entry is JustTcgHistoryPoint => Boolean(entry));
}

async function fetchHistoryRows(cardId: string, rangeDays: number): Promise<JustTcgHistoryPoint[]> {
  const supabase = getAdminClient();
  const fromIso = new Date(Date.now() - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("justtcg_price_history")
    .select("recorded_at,price_nm")
    .eq("devilfruit_id", cardId.trim().toUpperCase())
    .gte("recorded_at", fromIso)
    .order("recorded_at", { ascending: true });

  if (error) throw error;

  return ((data || []) as JustTcgHistoryRow[]).map((row) => {
    const ts = Date.parse(row.recorded_at);
    return {
      ts,
      date: new Date(ts).toISOString().slice(0, 10),
      tcgMarket: row.price_nm,
    };
  });
}

function mergeHistory(rangeDays: number, primary: JustTcgHistoryPoint[], supplemental: JustTcgHistoryPoint[]) {
  const fromTs = Date.now() - Math.max(1, rangeDays) * 24 * 60 * 60 * 1000;
  const merged = new Map<number, JustTcgHistoryPoint>();

  for (const point of supplemental) {
    if (point.ts >= fromTs) merged.set(point.ts, point);
  }
  for (const point of primary) {
    if (point.ts >= fromTs) merged.set(point.ts, point);
  }

  return [...merged.values()].sort((left, right) => left.ts - right.ts);
}

export async function getJustTcgPriceDetail(cardId: string, rangeDays: number) {
  const row = await getSinglePriceRow(cardId);
  if (!row) {
    return {
      price: null,
      points: [] as JustTcgHistoryPoint[],
    };
  }

  const [historyRows] = await Promise.all([
    fetchHistoryRows(cardId, rangeDays),
  ]);
  const supplemental = supplementalHistoryFromRaw(row.raw_response || null, rangeDays);

  return {
    price: summaryFromRow(row),
    points: mergeHistory(rangeDays, historyRows, supplemental),
  };
}

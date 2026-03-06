import { NextResponse } from "next/server";
import { loadCards } from "@/lib/card-feed";
import { getBaseCardId } from "@/lib/card-variants";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";

type WatchMover = {
  productId: number | null;
  cardId: string;
  name: string;
  dailyChangePct: number | null;
  weeklyChangePct: number | null;
  marketPrice: number | null;
  source: "gumgum" | "fallback";
};

const GUMGUM_MARKET_WATCH_URL = "https://gumgum.gg/market-watch";
const GUMGUM_PRICE_URL = "https://gumgum.gg/api/prices/card";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pct(curr: number | null, prev: number | null): number | null {
  if (!curr || !prev || prev === 0) return null;
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}

function extractCardId(text: string): string | null {
  const m = /\b([A-Z]{2,5}-\d{3}(?:_[A-Za-z0-9]+)?)\b/.exec(text);
  return m ? m[1].toUpperCase() : null;
}

function extractName(text: string): string | null {
  const m = /(?:name|cardName|title)\s*[:=]\s*["']([^"']{2,120})["']/i.exec(text);
  return m ? m[1].trim() : null;
}

function extractChange(text: string, kind: "daily" | "weekly"): number | null {
  const key = kind === "daily" ? "(?:daily|day|24h)" : "(?:weekly|week|7d)";
  const rx = new RegExp(`${key}(?:Change|Delta|Pct|Percent)?\\s*["':=\\]]+\\s*(-?\\d+(?:\\.\\d+)?)`, "i");
  const m = rx.exec(text);
  return m ? toNumber(m[1]) : null;
}

function extractPrice(text: string): number | null {
  const rx = /(?:marketPrice|latestPrice|price|market)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i;
  const m = rx.exec(text);
  return m ? toNumber(m[1]) : null;
}

function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function historySeriesFromPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.daily)) return obj.daily as Array<Record<string, unknown>>;
    if (obj.history && typeof obj.history === "object") {
      const h = obj.history as Record<string, unknown>;
      if (Array.isArray(h.daily)) return h.daily as Array<Record<string, unknown>>;
      if (Array.isArray(h.series)) return h.series as Array<Record<string, unknown>>;
    }
    if (obj.data && typeof obj.data === "object") {
      const d = obj.data as Record<string, unknown>;
      if (Array.isArray(d.daily)) return d.daily as Array<Record<string, unknown>>;
      if (Array.isArray(d.series)) return d.series as Array<Record<string, unknown>>;
    }
  }

  return [];
}

function readPointValue(point: Record<string, unknown>): number | null {
  const keys = ["m", "market", "marketPrice", "latestPrice", "l", "price"];
  for (const k of keys) {
    const v = toNumber(point[k]);
    if (v != null) return v;
  }
  return null;
}

async function computeChangesFromHistory(productId: number): Promise<{ daily: number | null; weekly: number | null; market: number | null }> {
  const url = `${GUMGUM_PRICE_URL}?game=one-piece&productId=${encodeURIComponent(String(productId))}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return { daily: null, weekly: null, market: null };

  const payload = await res.json();
  const series = historySeriesFromPayload(payload);
  if (!series.length) return { daily: null, weekly: null, market: null };

  const last = readPointValue(series[series.length - 1]);
  const prevDay = readPointValue(series[Math.max(0, series.length - 2)]);
  const weekAgo = readPointValue(series[Math.max(0, series.length - 8)]);

  return {
    daily: pct(last, prevDay),
    weekly: pct(last, weekAgo),
    market: last,
  };
}

function fallbackMovers(): WatchMover[] {
  return MARKET_HOT_CARDS.slice(0, 12).map((c, i) => ({
    productId: null,
    cardId: c.id,
    name: c.name,
    dailyChangePct: Number((2.8 - i * 0.35).toFixed(2)),
    weeklyChangePct: Number((6.2 - i * 0.5).toFixed(2)),
    marketPrice: null,
    source: "fallback",
  }));
}

export async function GET() {
  const cards = await loadCards();
  const byName = new Map<string, string>();
  for (const c of cards) {
    if (c.language && c.language !== "EN") continue;
    const key = normalize(c.name);
    if (!byName.has(key)) byName.set(key, c.id);
  }

  try {
    const res = await fetch(GUMGUM_MARKET_WATCH_URL, {
      headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
      next: { revalidate: 900 },
    });

    if (!res.ok) throw new Error(`gumgum market-watch ${res.status}`);
    const html = await res.text();

    const scriptSrcMatches = [...html.matchAll(/src=["']([^"']+_next\/static\/chunks\/[^"']+\.js)["']/g)]
      .map((m) => m[1])
      .slice(0, 24);

    const chunkUrls = Array.from(new Set(scriptSrcMatches)).map((s) => (s.startsWith("http") ? s : `https://gumgum.gg${s}`));

    const candidates: Array<WatchMover> = [];
    const seenKey = new Set<string>();

    for (const url of chunkUrls) {
      try {
        const jsRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 DevilFruitTCG/1.0" },
          next: { revalidate: 3600 },
        });
        if (!jsRes.ok) continue;
        const js = await jsRes.text();

        const pidRegex = /productId["']?\s*[:=]\s*(\d+)/gi;
        let m: RegExpExecArray | null;

        while ((m = pidRegex.exec(js)) !== null) {
          const productId = Number(m[1]);
          const start = Math.max(0, m.index - 420);
          const end = Math.min(js.length, m.index + 620);
          const block = js.slice(start, end);

          let cardId = extractCardId(block);
          let name = extractName(block) || "";
          const daily = extractChange(block, "daily");
          const weekly = extractChange(block, "weekly");
          const market = extractPrice(block);

          if (!cardId && name) {
            cardId = byName.get(normalize(name)) || null;
          }

          if (!name && cardId) {
            const baseId = getBaseCardId(cardId);
            const found = cards.find((c) => c.id.toUpperCase() === cardId || c.id.toUpperCase() === baseId);
            name = found?.name || baseId;
          }

          if (!cardId || !name) continue;

          const key = `${productId}|${cardId}`;
          if (seenKey.has(key)) continue;
          seenKey.add(key);

          candidates.push({
            productId,
            cardId,
            name,
            dailyChangePct: daily,
            weeklyChangePct: weekly,
            marketPrice: market,
            source: "gumgum",
          });
        }
      } catch {
        // ignore chunk fetch errors
      }
    }

    // Backfill missing daily/weekly using product history endpoint (limited for performance)
    const enriched: WatchMover[] = [];
    for (const mover of candidates.slice(0, 120)) {
      let daily = mover.dailyChangePct;
      let weekly = mover.weeklyChangePct;
      let market = mover.marketPrice;

      if ((daily == null || weekly == null || market == null) && mover.productId) {
        try {
          const h = await computeChangesFromHistory(mover.productId);
          if (daily == null) daily = h.daily;
          if (weekly == null) weekly = h.weekly;
          if (market == null) market = h.market;
        } catch {
          // ignore
        }
      }

      enriched.push({
        ...mover,
        dailyChangePct: daily,
        weeklyChangePct: weekly,
        marketPrice: market,
      });
    }

    const valid = enriched.filter((m) => m.cardId && m.name);
    if (!valid.length) throw new Error("no movers parsed");

    const byCard = new Map<string, WatchMover>();
    for (const mover of valid) {
      const prev = byCard.get(mover.cardId);
      if (!prev) {
        byCard.set(mover.cardId, mover);
        continue;
      }
      const prevStrength = Math.abs(prev.dailyChangePct || 0) + Math.abs(prev.weeklyChangePct || 0);
      const currStrength = Math.abs(mover.dailyChangePct || 0) + Math.abs(mover.weeklyChangePct || 0);
      if (currStrength > prevStrength) byCard.set(mover.cardId, mover);
    }

    const merged = [...byCard.values()];

    const topDaily = [...merged]
      .filter((m) => m.dailyChangePct != null)
      .sort((a, b) => Math.abs(b.dailyChangePct || 0) - Math.abs(a.dailyChangePct || 0))
      .slice(0, 12);

    const topWeekly = [...merged]
      .filter((m) => m.weeklyChangePct != null)
      .sort((a, b) => Math.abs(b.weeklyChangePct || 0) - Math.abs(a.weeklyChangePct || 0))
      .slice(0, 12);

    const topDailyIds = new Set(topDaily.map((m) => m.cardId));
    const bountyBoard = [...topDaily, ...topWeekly.filter((m) => !topDailyIds.has(m.cardId))].slice(0, 12);

    return NextResponse.json(
      {
        source: "gumgum-market-watch",
        updatedAt: new Date().toISOString(),
        topDaily,
        topWeekly,
        bountyBoard,
      },
      { status: 200, headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1800" } }
    );
  } catch {
    const fallback = fallbackMovers();
    return NextResponse.json(
      {
        source: "fallback",
        updatedAt: new Date().toISOString(),
        topDaily: fallback,
        topWeekly: fallback,
        bountyBoard: fallback,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

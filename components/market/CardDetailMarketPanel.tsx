"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketData } from "@/lib/ebay";

type MarketResponse = MarketData & {
  cached?: boolean;
  freshness?: {
    updatedAt?: string | null;
    stale?: boolean;
  };
  source?: {
    provider?: string;
  };
};

const HISTORY_RANGES = [
  { id: "7d", label: "1W" },
  { id: "30d", label: "1M" },
  { id: "90d", label: "3M" },
  { id: "180d", label: "6M" },
  { id: "365d", label: "1Y" },
] as const;

function TrendIcon({ direction }: { direction: MarketData["trend"]["direction"] | undefined }) {
  if (direction === "up") return <TrendingUp className="h-4 w-4" />;
  if (direction === "down") return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

export default function CardDetailMarketPanel({
  cardId,
  cardName,
}: {
  cardId: string;
  cardName: string;
}) {
  const [marketCache, setMarketCache] = useState<Record<string, MarketResponse>>({});
  const [marketErrors, setMarketErrors] = useState<Record<string, string>>({});
  const [range, setRange] = useState<(typeof HISTORY_RANGES)[number]["id"]>("30d");
  const [historyCache, setHistoryCache] = useState<Record<string, Record<string, Array<{ date: string; ebayAvg: number | null; tcgMarket: number | null }>>>>({});
  const marketPendingRef = useRef<Set<string>>(new Set());
  const historyPendingRef = useRef<Set<string>>(new Set());
  const market = marketCache[cardId] || null;
  const error = marketErrors[cardId] || "";
  const loading = !market && !error;
  const history = historyCache[cardId]?.[range] || [];

  useEffect(() => {
    if (marketCache[cardId] || marketPendingRef.current.has(cardId)) return;

    const controller = new AbortController();
    const pendingMarketRequests = marketPendingRef.current;
    pendingMarketRequests.add(cardId);

    void fetch(`/api/market?id=${encodeURIComponent(cardId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load market data");
        return (await res.json()) as MarketResponse & { error?: string };
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setMarketCache((current) => ({ ...current, [cardId]: json }));
        setMarketErrors((current) => {
          if (!current[cardId]) return current;
          const next = { ...current };
          delete next[cardId];
          return next;
        });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setMarketErrors((current) => ({
          ...current,
          [cardId]: fetchError instanceof Error ? fetchError.message : "Unable to load market data",
        }));
      })
      .finally(() => {
        pendingMarketRequests.delete(cardId);
      });

    return () => {
      controller.abort();
      pendingMarketRequests.delete(cardId);
    };
  }, [cardId, marketCache]);

  useEffect(() => {
    const requestKey = `${cardId}:${range}`;
    if (historyCache[cardId]?.[range] || historyPendingRef.current.has(requestKey)) return;

    const controller = new AbortController();
    const pendingHistoryRequests = historyPendingRef.current;
    pendingHistoryRequests.add(requestKey);

    void fetch(`/api/market/history?id=${encodeURIComponent(cardId)}&range=${range}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load price history");
        return await res.json();
      })
      .then((json) => {
        const points = Array.isArray(json.points) ? json.points : [];
        setHistoryCache((current) => ({
          ...current,
          [cardId]: {
            ...(current[cardId] || {}),
            [range]: points,
          },
        }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setHistoryCache((current) => ({
          ...current,
          [cardId]: {
            ...(current[cardId] || {}),
            [range]: [],
          },
        }));
      })
      .finally(() => {
        pendingHistoryRequests.delete(requestKey);
      });

    return () => {
      controller.abort();
      pendingHistoryRequests.delete(requestKey);
    };
  }, [cardId, range, historyCache]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-3 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin text-[#F0C040]" />
          Loading market data for {cardName}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 p-5">
        <p className="text-lg font-black text-white">Market data unavailable</p>
        <p className="mt-2 text-sm text-red-100/75">{error}</p>
      </div>
    );
  }

  if (!market) return null;

  const updatedAt = market.freshness?.updatedAt || market.lastUpdated || null;
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown";
  const stale = Boolean(market.freshness?.stale);
  const trendTone = market.trend.direction === "up" ? "text-emerald-300" : market.trend.direction === "down" ? "text-red-300" : "text-white/55";

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(240,192,64,0.14),transparent_36%),rgba(255,255,255,0.03)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#F0C040]">Market Snapshot</p>
            <p className="mt-2 text-4xl font-black text-[#F0C040]">${market.ebay.averagePrice.toFixed(2)}</p>
            <p className="mt-1 text-sm text-white/45">Average of the last {market.ebay.saleCount} eBay comps</p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold ${trendTone}`}>
            <TrendIcon direction={market.trend.direction} />
            {market.trend.percent}% this week
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "eBay Low", value: market.ebay.lowestPrice },
            { label: "eBay Avg", value: market.ebay.averagePrice },
            { label: "eBay High", value: market.ebay.highestPrice },
            { label: "TCG Market", value: market.tcgplayer.market },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{item.label}</p>
              <p className="mt-1 text-lg font-black text-white">
                {typeof item.value === "number" ? `$${item.value.toFixed(2)}` : "—"}
              </p>
            </div>
          ))}
        </div>

        <p className={`mt-4 text-xs ${stale ? "text-amber-300/90" : "text-white/40"}`}>
          Updated {updatedLabel}
          {market.cached ? " · cached" : ""}
          {stale ? " · stale" : ""}
          {market.source?.provider ? ` · ${market.source.provider}` : ""}
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-lg font-black text-white">Price History</p>
            <p className="text-sm text-white/45">Tracks cached eBay average and TCG market snapshots.</p>
          </div>

          <div className="flex gap-2">
            {HISTORY_RANGES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRange(option.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  range === option.id
                    ? "border-[#F0C040]/40 bg-[#F0C040]/15 text-[#F0C040]"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[280px] p-5">
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0c1324", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}
                  formatter={(value: unknown, name?: string) => [`$${Number(value || 0).toFixed(2)}`, name === "ebayAvg" ? "eBay Avg" : "TCG Market"]}
                />
                <Line type="monotone" dataKey="ebayAvg" stroke="#F0C040" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="tcgMarket" stroke="#60A5FA" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/45">
              Not enough history yet. Open the card again later as the cache fills in.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-lg font-black text-white">Recent eBay Listings</p>
            <p className="text-sm text-white/45">
              Variant target: {market.ebay.queryTemplate?.variantLabel || "Unknown"}
            </p>
          </div>

          {market.ebay.queryTemplate?.searchUrl ? (
            <a
              href={market.ebay.queryTemplate.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white"
            >
              eBay Recent Sales
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-[0.16em] text-white/35">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Condition</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {market.ebay.sales.map((sale, index) => (
                <tr key={`${sale.url || sale.title}-${index}`} className="border-b border-white/5 last:border-b-0">
                  <td className="px-5 py-3 text-white/75">
                    {sale.url ? (
                      <a href={sale.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                        <span className="line-clamp-2">{sale.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="line-clamp-2">{sale.title}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-white/50">{sale.condition}</td>
                  <td className="px-5 py-3 text-white/50">{sale.soldDate}</td>
                  <td className="px-5 py-3 text-right font-black text-[#F0C040]">${sale.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

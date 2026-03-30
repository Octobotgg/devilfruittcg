"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketData } from "@/lib/ebay";
import { resolveCardDetailPricingState } from "@/lib/market-detail-pricing";

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

type HistoryRange = (typeof HISTORY_RANGES)[number]["id"];

type CacheHistoryPoint = {
  date: string;
  ebayAvg: number | null;
  tcgMarket: number | null;
};

type JustTcgPriceResponse = {
  marketPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  updatedAt: string | null;
  fetchedAt?: string | null;
  priceChange7d?: number | null;
  stale: boolean;
  cached: boolean;
};

type JustTcgDetailResponse = {
  price: JustTcgPriceResponse | null;
  points: Array<{ date: string; tcgMarket: number | null }>;
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

function trendDirectionFromValue(value: number | null | undefined): MarketData["trend"]["direction"] {
  if (typeof value !== "number" || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

function formatTrendValue(value: number) {
  return Math.abs(value).toFixed(1).replace(/\.0$/u, "");
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
  const [range, setRange] = useState<HistoryRange>("30d");
  const [historyCache, setHistoryCache] = useState<Record<string, Record<string, CacheHistoryPoint[]>>>({});
  const [tcgDetailCache, setTcgDetailCache] = useState<Record<string, Partial<Record<HistoryRange, JustTcgDetailResponse>>>>({});
  const marketPendingRef = useRef<Set<string>>(new Set());
  const historyPendingRef = useRef<Set<string>>(new Set());
  const tcgPendingRef = useRef<Set<string>>(new Set());
  const market = marketCache[cardId] || null;
  const error = marketErrors[cardId] || "";
  const loading = !market && !error;
  const history = historyCache[cardId]?.[range] || [];
  const tcgDetail = tcgDetailCache[cardId]?.[range] || null;
  const hasResolvedTcgPrice = Boolean(tcgDetailCache[cardId]?.[range]);
  const tcgPrice =
    tcgDetail?.price ||
    Object.values(tcgDetailCache[cardId] || {}).find((entry) => entry?.price)?.price ||
    null;
  const justTcgAvailable = typeof tcgPrice?.marketPrice === "number";

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

  useEffect(() => {
    const requestKey = `${cardId}:${range}`;
    if (tcgDetailCache[cardId]?.[range] || tcgPendingRef.current.has(requestKey)) return;

    const controller = new AbortController();
    const pendingTcgRequests = tcgPendingRef.current;
    pendingTcgRequests.add(requestKey);

    void fetch(`/api/market/tcg-price?id=${encodeURIComponent(cardId)}&range=${range}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load cached TCG pricing");
        return (await res.json()) as JustTcgDetailResponse;
      })
      .then((json) => {
        setTcgDetailCache((current) => ({
          ...current,
          [cardId]: {
            ...(current[cardId] || {}),
            [range]: {
              price: json.price || null,
              points: Array.isArray(json.points) ? json.points : [],
              freshness: json.freshness,
              source: json.source,
            },
          },
        }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTcgDetailCache((current) => ({
          ...current,
          [cardId]: {
            ...(current[cardId] || {}),
            [range]: {
              price: null,
              points: [],
            },
          },
        }));
      })
      .finally(() => {
        pendingTcgRequests.delete(requestKey);
      });

    return () => {
      controller.abort();
      pendingTcgRequests.delete(requestKey);
    };
  }, [cardId, range, tcgDetailCache]);

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

  const pricingState = resolveCardDetailPricingState({
    market,
    tcgPrice,
    hasResolvedTcgPrice,
  });
  const showLegacySnapshot = pricingState.mode === "legacy";

  const updatedAt = justTcgAvailable
    ? tcgPrice.updatedAt || tcgPrice.fetchedAt || null
    : showLegacySnapshot
      ? market.freshness?.updatedAt || market.lastUpdated || null
      : null;
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown";
  const stale = justTcgAvailable
    ? Boolean(tcgDetail?.freshness?.stale ?? tcgPrice.stale)
    : showLegacySnapshot
      ? Boolean(market.freshness?.stale)
      : true;
  const weeklyTrendValue = justTcgAvailable && typeof tcgPrice.priceChange7d === "number" ? tcgPrice.priceChange7d : null;
  const trendDirection = weeklyTrendValue !== null ? trendDirectionFromValue(weeklyTrendValue) : showLegacySnapshot ? market.trend.direction : "flat";
  const trendValueLabel = weeklyTrendValue !== null ? formatTrendValue(weeklyTrendValue) : showLegacySnapshot ? String(market.trend.percent) : "0";
  const trendTone = trendDirection === "up" ? "text-emerald-300" : trendDirection === "down" ? "text-red-300" : "text-white/55";
  const headlinePrice = pricingState.headlinePrice;
  const priceHistory = justTcgAvailable ? tcgDetail?.points || [] : showLegacySnapshot ? history : [];
  const historyHasEnoughPoints = priceHistory.length > 1;
  const footerProvider = justTcgAvailable
    ? tcgDetail?.source?.provider || "JustTCG cache"
    : showLegacySnapshot
      ? market.source?.provider
      : tcgDetail?.source?.provider || "JustTCG read model";

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(240,192,64,0.14),transparent_36%),rgba(255,255,255,0.03)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#F0C040]">Market Snapshot</p>
            <p className="mt-2 text-4xl font-black text-[#F0C040]">
              {typeof headlinePrice === "number" ? `$${headlinePrice.toFixed(2)}` : "Unpriced"}
            </p>
            <p className="mt-1 text-sm text-white/45">
              {justTcgAvailable
                ? `TCG Market · Updated ${updatedLabel}`
                : showLegacySnapshot
                  ? `Average of the last ${market.ebay.saleCount} eBay comps`
                  : "No approved JustTCG Near Mint price for this print"}
            </p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold ${trendTone}`}>
            <TrendIcon direction={trendDirection} />
            {trendValueLabel}% this week
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "eBay Low", value: market.ebay.lowestPrice },
            { label: "eBay Avg", value: market.ebay.averagePrice },
            { label: "eBay High", value: market.ebay.highestPrice },
            { label: "TCG Market", value: justTcgAvailable ? tcgPrice.marketPrice : showLegacySnapshot ? market.tcgplayer.market : null },
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
          {footerProvider || "Cache"}
          {(justTcgAvailable ? tcgPrice.cached : showLegacySnapshot ? market.cached : false) ? " · cached" : ""}
          {stale ? " · stale" : ""}
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-lg font-black text-white">Price History</p>
            <p className="text-sm text-white/45">
              {justTcgAvailable
                ? "Tracks cached JustTCG market pricing for the selected print."
                : showLegacySnapshot
                  ? "Tracks cached eBay average and TCG market snapshots."
                  : "No approved JustTCG price history for this print yet."}
            </p>
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
          {historyHasEnoughPoints ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0c1324", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}
                  formatter={(value: unknown, name?: string) => [
                    `$${Number(value || 0).toFixed(2)}`,
                    name === "ebayAvg" ? "eBay Avg" : "TCG Market",
                  ]}
                />
                {justTcgAvailable ? (
                  <Line type="monotone" dataKey="tcgMarket" stroke="#60A5FA" strokeWidth={2.5} dot={false} />
                ) : (
                  <>
                    <Line type="monotone" dataKey="ebayAvg" stroke="#F0C040" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="tcgMarket" stroke="#60A5FA" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/45">
              {justTcgAvailable
                ? "Price tracking started — history building."
                : showLegacySnapshot
                  ? "Not enough history yet. Open the card again later as the cache fills in."
                  : "This print is currently unpriced in the approved JustTCG model."}
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

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
      <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] p-5 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
        <div className="flex items-center gap-3 font-sans text-sm text-[#5a4e40]">
          <Loader2 className="h-4 w-4 animate-spin text-[#d4a054]" />
          Loading market data for {cardName}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-[#e6c7c1] bg-[#f8ece9] p-5">
        <p className="font-sans text-lg font-black text-[#2a2118]">Market data unavailable</p>
        <p className="mt-2 font-sans text-sm text-[#8f4b42]">{error}</p>
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
      <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] p-6 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a7e70]">TCG Market</p>
            <p className="mt-2 font-sans text-4xl font-bold text-[#2a2118]">
              {typeof headlinePrice === "number" ? `$${headlinePrice.toFixed(2)}` : "Unpriced"}
            </p>
            <p className="mt-1 font-sans text-sm text-[#8a7e70]">
              {justTcgAvailable
                ? `TCG Market · Updated ${updatedLabel}`
                : showLegacySnapshot
                  ? `Average of the last ${market.ebay.saleCount} eBay comps`
                  : "No approved JustTCG Near Mint price for this print"}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-sans text-sm font-bold ${
              trendDirection === "up"
                ? "border-[#b8d5be] bg-[#edf6ef] text-[#4a8c5c]"
                : trendDirection === "down"
                  ? "border-[#e7c1ba] bg-[#faece9] text-[#c0392b]"
                  : "border-[#ddd3c4] bg-[#faf7f2] text-[#5a4e40]"
            }`}
          >
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
            <div key={item.label} className="rounded-[12px] border border-[#e3d8c5] bg-[#faf7f2] px-4 py-3">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a7e70]">{item.label}</p>
              <p className="mt-1 font-sans text-lg font-bold text-[#2a2118]">
                {typeof item.value === "number" ? `$${item.value.toFixed(2)}` : "—"}
              </p>
            </div>
          ))}
        </div>

        <p className={`mt-4 font-sans text-xs ${stale ? "text-[#b8863c]" : "text-[#8a7e70]"}`}>
          {footerProvider || "Cache"}
          {(justTcgAvailable ? tcgPrice.cached : showLegacySnapshot ? market.cached : false) ? " · cached" : ""}
          {stale ? " · stale" : ""}
        </p>
      </div>

      <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8dfd0] px-5 py-4">
          <div>
            <p className="font-sans text-lg font-black text-[#2a2118]">Price History</p>
            <p className="font-sans text-sm text-[#8a7e70]">
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
                className={`rounded-full border px-3 py-2 font-sans text-xs font-bold transition-all ${
                  range === option.id
                    ? "border-[#d4a054] bg-[#d4a054]/12 text-[#b8863c]"
                    : "border-[#ddd3c4] bg-[#faf7f2] text-[#5a4e40] hover:border-[#d4a054]/60 hover:text-[#2a2118]"
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
                <CartesianGrid stroke="rgba(138,126,112,0.18)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#8a7e70", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8a7e70", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#faf7f2", border: "1px solid #e3d8c5", borderRadius: 12, color: "#2a2118" }}
                  formatter={(value: unknown, name?: string) => [
                    `$${Number(value || 0).toFixed(2)}`,
                    name === "ebayAvg" ? "eBay Avg" : "TCG Market",
                  ]}
                />
                {justTcgAvailable ? (
                  <Line type="monotone" dataKey="tcgMarket" stroke="#2d6a8f" strokeWidth={2.5} dot={false} />
                ) : (
                  <>
                    <Line type="monotone" dataKey="ebayAvg" stroke="#d4a054" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="tcgMarket" stroke="#2d6a8f" strokeWidth={2} dot={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center font-sans text-sm text-[#8a7e70]">
              {justTcgAvailable
                ? "Price tracking started — history building."
                : showLegacySnapshot
                  ? "Not enough history yet. Open the card again later as the cache fills in."
                  : "This print is currently unpriced in the approved JustTCG model."}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8dfd0] px-5 py-4">
          <div>
            <p className="font-sans text-lg font-black text-[#2a2118]">Recent eBay Listings</p>
            <p className="font-sans text-sm text-[#8a7e70]">
              Variant target: {market.ebay.queryTemplate?.variantLabel || "Unknown"}
            </p>
          </div>

          {market.ebay.queryTemplate?.searchUrl ? (
            <a
              href={market.ebay.queryTemplate.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#d4a054]/35 bg-[#faf7f2] px-3 py-2 font-sans text-sm font-semibold text-[#2d6a8f] transition-all hover:border-[#d4a054] hover:text-[#1b2838]"
            >
              eBay Recent Sales
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#e8dfd0] bg-[#1b2838] text-left font-sans text-[11px] uppercase tracking-[0.16em] text-[#f5efe3]">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Condition</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {market.ebay.sales.map((sale, index) => (
                <tr
                  key={`${sale.url || sale.title}-${index}`}
                  className={`border-b border-[#e8dfd0] last:border-b-0 ${index % 2 === 0 ? "bg-[#faf7f2]" : "bg-[#f5efe3]"}`}
                >
                  <td className="px-5 py-3 font-sans text-[#2a2118]">
                    {sale.url ? (
                      <a href={sale.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-[#2d6a8f]">
                        <span className="line-clamp-2">{sale.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="line-clamp-2">{sale.title}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-sans text-[#5a4e40]">{sale.condition}</td>
                  <td className="px-5 py-3 font-sans text-[#5a4e40]">{sale.soldDate}</td>
                  <td className="px-5 py-3 text-right font-sans font-bold text-[#2a2118]">${sale.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

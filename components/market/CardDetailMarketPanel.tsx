"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MarketData } from "@/lib/ebay";
import {
  MARKET_HISTORY_RANGES,
  buildMarketHistoryState,
  formatMarketHistoryDateLabel,
  type MarketHistoryPointInput,
  type MarketHistoryRangeId,
} from "@/lib/market-history";
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

type HistoryRange = MarketHistoryRangeId;

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
  points: MarketHistoryPointInput[];
  freshness?: {
    updatedAt?: string | null;
    stale?: boolean;
  };
  source?: {
    provider?: string;
  };
};

const HISTORY_RANGE_OPTIONS = (Object.keys(MARKET_HISTORY_RANGES) as HistoryRange[]).map((id) => ({
  id,
  label: id,
}));

const DEFAULT_HISTORY_RANGE: HistoryRange = "3M";
const FULL_HISTORY_API_RANGE = "365d";

export default function CardDetailMarketPanel({
  cardId,
  cardName,
}: {
  cardId: string;
  cardName: string;
}) {
  const [marketCache, setMarketCache] = useState<Record<string, MarketResponse>>({});
  const [marketErrors, setMarketErrors] = useState<Record<string, string>>({});
  const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);
  const [tcgDetailCache, setTcgDetailCache] = useState<Record<string, JustTcgDetailResponse>>({});
  const [tcgErrors, setTcgErrors] = useState<Record<string, string>>({});
  const [tcgRetryNonce, setTcgRetryNonce] = useState<Record<string, number>>({});
  const marketPendingRef = useRef<Set<string>>(new Set());
  const tcgPendingRef = useRef<Set<string>>(new Set());
  const market = marketCache[cardId] || null;
  const error = marketErrors[cardId] || "";
  const tcgError = tcgErrors[cardId] || "";
  const loading = !market && !error;
  const tcgDetail = tcgDetailCache[cardId] || null;
  const hasResolvedTcgPrice = Object.prototype.hasOwnProperty.call(tcgDetailCache, cardId);
  const tcgPrice = tcgDetail?.price || null;
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
    const requestKey = `${cardId}:${FULL_HISTORY_API_RANGE}`;
    if (tcgDetailCache[cardId] || tcgPendingRef.current.has(requestKey) || tcgErrors[cardId]) return;

    const controller = new AbortController();
    const pendingTcgRequests = tcgPendingRef.current;
    pendingTcgRequests.add(requestKey);

    void fetch(`/api/market/tcg-price?id=${encodeURIComponent(cardId)}&range=${FULL_HISTORY_API_RANGE}`, {
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
            price: json.price || null,
            points: Array.isArray(json.points) ? json.points : [],
            freshness: json.freshness,
            source: json.source,
          },
        }));
        setTcgErrors((current) => {
          if (!current[cardId]) return current;
          const next = { ...current };
          delete next[cardId];
          return next;
        });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setTcgErrors((current) => ({
          ...current,
          [cardId]: fetchError instanceof Error ? fetchError.message : "Unable to load approved JustTCG history",
        }));
      })
      .finally(() => {
        pendingTcgRequests.delete(requestKey);
      });

    return () => {
      controller.abort();
      pendingTcgRequests.delete(requestKey);
    };
  }, [cardId, tcgDetailCache, tcgErrors, tcgRetryNonce]);

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
  const headlinePrice = pricingState.headlinePrice;
  const historyState = buildMarketHistoryState({
    points: (tcgDetail?.points || []).map((point) => ({
      ...point,
      ts: point.ts ?? point.date ?? null,
    })) as MarketHistoryPointInput[],
    rangeId: range,
    now: Date.now(),
  });
  const footerProvider = justTcgAvailable
    ? tcgDetail?.source?.provider || "JustTCG cache"
    : showLegacySnapshot
      ? market.source?.provider
      : tcgDetail?.source?.provider || "JustTCG read model";
  const statusTone = !hasResolvedTcgPrice
    ? "border-[#ddd3c4] bg-[#faf7f2] text-[#5a4e40]"
    : justTcgAvailable
      ? stale
        ? "border-[#e7d3ac] bg-[#fbf3e3] text-[#9b6a1b]"
        : "border-[#c9d8e7] bg-[#eef4fa] text-[#2d6a8f]"
      : "border-[#ddd3c4] bg-[#faf7f2] text-[#5a4e40]";
  const statusLabel = !hasResolvedTcgPrice
    ? "Loading exact print"
    : justTcgAvailable
      ? stale
        ? "Exact print · stale"
        : "Exact print only"
      : "Exact print unpriced";

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
                : tcgError
                  ? "Unable to refresh approved JustTCG price right now"
                : !hasResolvedTcgPrice
                  ? "Loading approved JustTCG price for this exact print"
                : showLegacySnapshot
                  ? `Average of the last ${market.ebay.saleCount} eBay comps`
                  : "No approved JustTCG Near Mint price for this exact print"}
            </p>
          </div>

          <div className={`inline-flex rounded-full border px-3 py-2 font-sans text-sm font-bold ${statusTone}`}>
            {statusLabel}
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

        <p className="mt-4 font-sans text-xs text-[#8a7e70]">
          {footerProvider || "Cache"}
          {(justTcgAvailable ? tcgPrice.cached : showLegacySnapshot ? market.cached : false) ? " · cached" : ""}
          {stale ? " · stale" : ""}
        </p>
      </div>

      <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8dfd0] px-5 py-4">
          <div>
            <p className="font-sans text-lg font-black text-[#2a2118]">Price History</p>
            <p className="font-sans text-sm text-[#8a7e70]">Tracks approved JustTCG pricing for this exact print only.</p>
          </div>

          <div className="flex gap-2">
            {HISTORY_RANGE_OPTIONS.map((option) => (
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
          {historyState.mode === "ready" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyState.points}>
                <CartesianGrid stroke="rgba(138,126,112,0.18)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#8a7e70", fontSize: 11 }}
                  tickFormatter={(value: string) => formatMarketHistoryDateLabel(value)}
                />
                <YAxis
                  tick={{ fill: "#8a7e70", fontSize: 11 }}
                  tickFormatter={(value: number) => `$${Number(value).toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ background: "#faf7f2", border: "1px solid #e3d8c5", borderRadius: 12, color: "#2a2118" }}
                  formatter={(value: unknown) => [`$${Number(value || 0).toFixed(2)}`, "TCG Market"]}
                  labelFormatter={(value: unknown) =>
                    formatMarketHistoryDateLabel(value, {
                      year: true,
                    })
                  }
                />
                <Line type="monotone" dataKey="tcgMarket" stroke="#2d6a8f" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : tcgError && !hasResolvedTcgPrice ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#e7d3ac] bg-[#fbf3e3] px-6 text-center font-sans">
              <p className="text-sm font-semibold text-[#9b6a1b]">Unable to load exact-print history</p>
              <p className="max-w-md text-xs text-[#8a7e70]">{tcgError}</p>
              <button
                type="button"
                onClick={() => {
                  setTcgErrors((current) => {
                    if (!current[cardId]) return current;
                    const next = { ...current };
                    delete next[cardId];
                    return next;
                  });
                  setTcgRetryNonce((current) => ({
                    ...current,
                    [cardId]: (current[cardId] || 0) + 1,
                  }));
                }}
                className="rounded-full border border-[#d4a054] bg-[#faf7f2] px-3 py-2 text-xs font-bold text-[#2a2118] transition hover:border-[#b8863c] hover:text-[#9b6a1b]"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#e3d8c5] bg-[#faf7f2] px-6 text-center font-sans">
              <p className="text-sm font-semibold text-[#5a4e40]">
                {!hasResolvedTcgPrice ? "Loading exact-print history..." : "Not enough exact-print history yet"}
              </p>
              <p className="text-lg font-bold text-[#2a2118]">
                {typeof headlinePrice === "number" ? `$${headlinePrice.toFixed(2)}` : "Unpriced"}
              </p>
              <p className="max-w-md text-xs text-[#8a7e70]">
                {!hasResolvedTcgPrice
                  ? "We are still loading the approved JustTCG timeline for this print."
                  : justTcgAvailable
                    ? `This chart only uses this exact print. More points will appear as new JustTCG updates arrive. Updated ${updatedLabel}${stale ? " · stale" : ""}`
                  : showLegacySnapshot
                    ? `Updated ${updatedLabel}${stale ? " · stale" : ""}`
                    : "No approved JustTCG Near Mint price for this exact print."}
              </p>
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

"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw } from "lucide-react";
import type { MarketData } from "@/lib/ebay";

function MarketContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCard = searchParams.get("card") || "";

  const [query, setQuery] = useState(initialCard);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<(MarketData & { cached?: boolean }) | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCard) fetchMarket(initialCard);
  }, [initialCard]);

  async function fetchMarket(cardQuery: string) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/market?card=${encodeURIComponent(cardQuery)}`);
      if (!res.ok) throw new Error("Card not found");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/market?card=${encodeURIComponent(query.trim())}`);
      fetchMarket(query.trim());
    }
  }

  const TrendIcon = data?.trend.direction === "up"
    ? TrendingUp
    : data?.trend.direction === "down"
    ? TrendingDown
    : Minus;

  const trendColor = data?.trend.direction === "up"
    ? "text-green-400"
    : data?.trend.direction === "down"
    ? "text-red-400"
    : "text-white/40";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">📈 Market Watch</h1>
        <p className="text-white/50">Live prices from eBay last 5 sold + TCGPlayer</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search card name or ID (e.g. Luffy, OP01-001)"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f0c040]/50 transition-all"
          />
        </div>
        <button
          type="submit"
          className="bg-[#f0c040] hover:bg-[#f0c040]/90 text-black font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          Search
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-white/50 py-12 justify-center">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Fetching market data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Card Header */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{data.cardName}</h2>
                <p className="text-white/40 text-sm mt-1">{data.cardId}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-[#f0c040]">
                  ${data.ebay.averagePrice.toFixed(2)}
                </div>
                <div className="text-sm text-white/40 mt-1">avg last {data.ebay.saleCount} sold</div>
                <div className={`flex items-center justify-end gap-1 mt-1 text-sm font-medium ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  {data.trend.percent}% 7-day
                </div>
              </div>
            </div>
          </div>

          {/* Price Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "eBay Low", value: data.ebay.lowestPrice },
              { label: "eBay Avg", value: data.ebay.averagePrice },
              { label: "eBay High", value: data.ebay.highestPrice },
              { label: "TCG Market", value: data.tcgplayer.market },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-white">
                  {item.value !== null ? `$${item.value.toFixed(2)}` : "—"}
                </div>
                <div className="text-xs text-white/40 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* TCGPlayer Row */}
          {data.tcgplayer.low && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3">TCGPlayer Prices</h3>
              <div className="flex gap-6 flex-wrap">
                <div><span className="text-white/40 text-sm">Low</span> <span className="text-white font-medium ml-2">${data.tcgplayer.low?.toFixed(2)}</span></div>
                <div><span className="text-white/40 text-sm">Mid</span> <span className="text-white font-medium ml-2">${data.tcgplayer.mid?.toFixed(2)}</span></div>
                <div><span className="text-white/40 text-sm">High</span> <span className="text-white font-medium ml-2">${data.tcgplayer.high?.toFixed(2)}</span></div>
                <div><span className="text-white/40 text-sm">Market</span> <span className="text-[#f0c040] font-medium ml-2">${data.tcgplayer.market?.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {/* eBay Sales Table */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold text-white">Recent eBay Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="text-left p-4 font-medium">Title</th>
                    <th className="text-left p-4 font-medium">Condition</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-right p-4 font-medium">Price</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.ebay.sales.map((sale, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white/80 max-w-xs truncate">{sale.title}</td>
                      <td className="p-4 text-white/50">{sale.condition}</td>
                      <td className="p-4 text-white/50">{sale.soldDate}</td>
                      <td className="p-4 text-right font-semibold text-[#f0c040]">${sale.price.toFixed(2)}</td>
                      <td className="p-4">
                        {sale.url && (
                          <a href={sale.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 text-white/30 hover:text-white transition-colors" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-white/30 text-right">
            Updated: {new Date(data.lastUpdated).toLocaleString()} {data.cached ? "(cached)" : "(fresh)"}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-16 text-white/30">
          <div className="text-5xl mb-4">🍇</div>
          <p>Search a card above to see market data</p>
        </div>
      )}
    </div>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="text-white/40 py-12 text-center">Loading...</div>}>
      <MarketContent />
    </Suspense>
  );
}

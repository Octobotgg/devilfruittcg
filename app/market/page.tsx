"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MarketData } from "@/lib/ebay";
import CardModal, { type CardModalData } from "@/components/CardModal";

function MarketContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCard = searchParams.get("card") || "";

  const [query, setQuery] = useState(initialCard);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<(MarketData & { cached?: boolean }) | null>(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<CardModalData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);

  useEffect(() => { if (initialCard) fetchMarket(initialCard); }, [initialCard]);

  useEffect(() => {
    const run = async () => {
      const q = query.trim();
      if (q.length < 2) { setSuggestions([]); return; }
      try {
        const res = await fetch(`/api/cards?q=${encodeURIComponent(q)}&pageSize=8`);
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(json.results || []);
      } catch { setSuggestions([]); }
    };
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [query]);

  async function fetchMarket(cardQuery: string) {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch(`/api/market?card=${encodeURIComponent(cardQuery)}`);
      if (!res.ok) throw new Error("Card not found");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  // Fetch full card data by ID for the modal
  async function openCardModal(id: string, fallback?: Partial<CardModalData>) {
    // Try to get full card data from cards API
    try {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(id)}&pageSize=1`);
      if (res.ok) {
        const json = await res.json();
        if (json.results?.length) {
          setModalCard(json.results[0]);
          return;
        }
      }
    } catch {}
    // Fall back to minimal data
    if (fallback?.id) setModalCard(fallback as CardModalData);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/market?card=${encodeURIComponent(query.trim())}`);
      fetchMarket(query.trim());
      setShowSuggestions(false);
    }
  }

  const TrendIcon = data?.trend.direction === "up" ? TrendingUp : data?.trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = data?.trend.direction === "up" ? "text-green-400" : data?.trend.direction === "down" ? "text-red-400" : "text-white/40";

  return (
    <div className="space-y-10 pb-24 md:pb-0">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-[#F0C040]/10 border border-[#F0C040]/20 rounded-full">
          <TrendingUp className="w-3.5 h-3.5 text-[#F0C040]" />
          <span className="text-[#F0C040] text-xs font-semibold tracking-wider uppercase">Live Prices</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C040] to-[#DC2626]">Watch</span>
        </h1>
        <p className="text-white/40 text-lg">Real-time prices from eBay last sold + TCGPlayer</p>
        <div className="mt-4 max-w-3xl rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          <span className="font-semibold text-white/80">Data integrity:</span> Card IDs, set codes, and card numbers are validated in build checks before deployment. Market data is public-source live pricing (eBay sold + TCGPlayer) and may lag briefly.
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search any card — Shanks, Luffy, OP01-001..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#F0C040]/50 focus:bg-white/8 transition-all text-base"
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 mt-2 w-full bg-[#0c1324]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
                >
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => { setQuery(s.name); setSuggestions([]); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors group"
                    >
                      {/* Clickable thumbnail → opens modal */}
                      <div
                        onClick={e => { e.stopPropagation(); setModalCard(s); }}
                        className="flex-shrink-0 cursor-zoom-in"
                        title="Click to preview card"
                      >
                        <img
                          src={s.imageUrl || `/api/card-image?id=${s.id}`}
                          alt={s.name}
                          className="w-9 h-12 object-cover rounded-lg border border-white/10 group-hover:border-[#F0C040]/40 transition-all hover:scale-110"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{s.name}</p>
                        <p className="text-white/40 text-xs">{s.id} · {s.setCode ?? s.set}{s.rarity ? ` · ${s.rarity}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-2xl text-base"
          >
            <Zap className="w-4 h-4" />
            Search
          </motion.button>
        </form>
      </motion.div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 text-white/50 py-16 justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-[#F0C040]" />
            <span>Fetching market data...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-400">
          {error}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
            {/* Card Hero */}
            <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#F0C040]/5 to-transparent pointer-events-none" />
              <div className="relative flex items-start gap-6 flex-wrap">
                {/* Clickable card image */}
                <motion.div
                  className="cursor-zoom-in flex-shrink-0"
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  onClick={() => openCardModal(data.cardId, { id: data.cardId, name: data.cardName })}
                  title="Click to view card"
                >
                  <img
                    src={`/api/card-image?id=${data.cardId}`}
                    alt={data.cardName}
                    className="w-28 md:w-36 rounded-2xl shadow-2xl shadow-black/50 border border-white/10"
                  />
                  <p className="text-center text-white/30 text-xs mt-2">Click to zoom</p>
                </motion.div>

                <div className="flex-1">
                  <h2 className="text-3xl font-black text-white mb-1">{data.cardName}</h2>
                  <p className="text-white/30 text-sm mb-5 font-mono">{data.cardId}</p>
                  <div className="flex items-end gap-4 flex-wrap">
                    <div>
                      <div className="text-5xl font-black text-[#F0C040]">${data.ebay.averagePrice.toFixed(2)}</div>
                      <div className="text-sm text-white/40 mt-1">avg of last {data.ebay.saleCount} eBay sales</div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-lg font-bold mb-1 ${trendColor}`}>
                      <TrendIcon className="w-5 h-5" />
                      {data.trend.percent}% this week
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "eBay Low",   value: data.ebay.lowestPrice,  accent: false },
                { label: "eBay Avg",   value: data.ebay.averagePrice, accent: true  },
                { label: "eBay High",  value: data.ebay.highestPrice, accent: false },
                { label: "TCG Market", value: data.tcgplayer.market,  accent: false },
              ].map((item, i) => (
                <motion.div key={item.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl p-5 text-center border ${item.accent ? "bg-[#F0C040]/5 border-[#F0C040]/20" : "bg-white/[0.03] border-white/10"}`}>
                  <div className={`text-2xl font-black ${item.accent ? "text-[#F0C040]" : "text-white"}`}>
                    {item.value !== null ? `$${item.value!.toFixed(2)}` : "—"}
                  </div>
                  <div className="text-xs text-white/40 mt-1">{item.label}</div>
                </motion.div>
              ))}
            </div>

            {/* eBay Sales Table */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-lg">Recent eBay Sales</h3>
                <p className="text-xs text-white/30">{new Date(data.lastUpdated).toLocaleString()} {data.cached ? "(cached)" : ""}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                      <th className="text-left p-4 font-medium">Title</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Condition</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Date</th>
                      <th className="text-right p-4 font-medium">Price</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ebay.sales.map((sale, i) => (
                      <motion.tr key={i}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-white/70 max-w-xs truncate">{sale.title}</td>
                        <td className="p-4 text-white/40 hidden md:table-cell">{sale.condition}</td>
                        <td className="p-4 text-white/40 hidden md:table-cell">{sale.soldDate}</td>
                        <td className="p-4 text-right font-black text-[#F0C040]">${sale.price.toFixed(2)}</td>
                        <td className="p-4">
                          {sale.url && (
                            <a href={sale.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 text-white/20 hover:text-white transition-colors" />
                            </a>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured cards spotlight */}
      {!data && !loading && !error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-gradient-to-b from-[#F0C040] to-[#DC2626] rounded-full" />
              <h2 className="text-white font-black text-xl">🔥 Hot Right Now</h2>
              <span className="text-white/30 text-sm hidden sm:inline">Click any card to check live price</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { id: "OP01-060", name: "Shanks", set: "OP01" },
                { id: "OP01-001", name: "Monkey D. Luffy", set: "OP01" },
                { id: "OP07-001", name: "Gear 5 Luffy", set: "OP07" },
                { id: "OP02-002", name: "Edward Newgate", set: "OP02" },
                { id: "OP09-006", name: "Shanks", set: "OP09" },
                { id: "OP10-003", name: "Rebecca", set: "OP10" },
              ].map((card, i) => (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  whileHover={{ y: -6, scale: 1.04 }}
                  onClick={() => { setQuery(card.name); router.push(`/market?card=${encodeURIComponent(card.id)}`); fetchMarket(card.id); }}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#F0C040]/50 transition-all bg-white/[0.03] flex flex-col"
                >
                  <div className="relative overflow-hidden">
                    <img src={`/api/card-image?id=${card.id}`} alt={card.name} className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-bold truncate leading-tight">{card.name}</p>
                      <p className="text-white/50 text-[10px]">{card.set}</p>
                    </div>
                  </div>
                  <div className="px-2 py-2 text-center">
                    <span className="text-[#F0C040] text-xs font-bold">Check Price →</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: "💎", label: "Secret Rares", tip: "Try searching 'SEC' or 'Secret' for chase card pricing" },
              { icon: "📈", label: "Trending Leaders", tip: "Leader cards move fast — check OP09-006, OP10-003" },
              { icon: "🏆", label: "Tournament Staples", tip: "OP01-060 Shanks is historically the #1 value card" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{item.label}</p>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">{item.tip}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mobile one-thumb search bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-[#0c1324]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search card..."
              className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-white text-sm placeholder:text-white/30"
            />
            <button className="h-11 px-4 rounded-xl bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black text-sm font-bold">
              Search
            </button>
          </form>
        </div>
      </div>
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

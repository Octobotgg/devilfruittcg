"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import type { MarketData } from "@/lib/ebay";
import CardModal, { type CardModalData } from "@/components/CardModal";
import DonButton from "@/components/ui/DonButton";
import WantedPosterCard from "@/components/ui/WantedPosterCard";
import TickerRow from "@/components/ui/TickerRow";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";

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
  const [filterSet, setFilterSet] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterCostMin, setFilterCostMin] = useState("");
  const [filterCostMax, setFilterCostMax] = useState("");
  const [historyRange, setHistoryRange] = useState<"7d" | "30d" | "90d" | "180d" | "365d">("30d");
  const [historyPoints, setHistoryPoints] = useState<Array<{ date: string; ebayAvg: number | null; tcgMarket: number | null }>>([]);

  useEffect(() => { if (initialCard) fetchMarket(initialCard); }, [initialCard]);

  async function fetchCardList() {
    const q = query.trim();
    const setQuery = q.toUpperCase();
    const isSetCode = /^(OP\d{1,2}|EB\d{1,2}|ST\d{1,2}|PRB\d{1,2}|P-\d{3})$/.test(setQuery);

    if (q.length < 2 && !filterSet && !isSetCode) { setSuggestions([]); return; }

    try {
      const params = new URLSearchParams();
      if (isSetCode) params.set("set", setQuery);
      else if (filterSet) params.set("set", filterSet);
      if (!isSetCode && q.length >= 2) params.set("q", q);
      if (filterColor) params.set("color", filterColor);
      if (filterRarity) params.set("rarity", filterRarity);
      if (filterCostMin) params.set("costMin", filterCostMin);
      if (filterCostMax) params.set("costMax", filterCostMax);
      params.set("pageSize", isSetCode || filterSet ? "240" : "24");

      const res = await fetch(`/api/cards?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setSuggestions(json.results || []);
    } catch { setSuggestions([]); }
  }

  useEffect(() => {
    const t = setTimeout(fetchCardList, 200);
    return () => clearTimeout(t);
  }, [query, filterSet, filterColor, filterRarity, filterCostMin, filterCostMax]);

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
    const q = query.trim();
    if (!q && !filterSet) return;

    const setQuery = q.toUpperCase();
    const isSetCode = /^(OP\d{1,2}|EB\d{1,2}|ST\d{1,2}|PRB\d{1,2}|P-\d{3})$/.test(setQuery);

    if (isSetCode || filterSet) {
      setShowSuggestions(false);
      fetchCardList();
      return;
    }

    router.push(`/market?card=${encodeURIComponent(q)}`);
    fetchMarket(q);
    setShowSuggestions(false);
  }

  const TrendIcon = data?.trend.direction === "up" ? TrendingUp : data?.trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = data?.trend.direction === "up" ? "text-green-400" : data?.trend.direction === "down" ? "text-red-400" : "text-white/40";
  const isSetBrowse = /^(OP\d{1,2}|EB\d{1,2}|ST\d{1,2}|PRB\d{1,2}|P-\d{3})$/.test(query.trim().toUpperCase()) || !!filterSet;

  const sortedSuggestions = useMemo(() => {
    if (!isSetBrowse) return suggestions;
    const variantRank = (id: string) => {
      if (!id.includes("_")) return 0;
      if (id.toLowerCase().endsWith("_p1")) return 1;
      if (id.toLowerCase().endsWith("_p2")) return 2;
      return 3;
    };
    const baseId = (id: string) => id.split("_")[0];
    const num = (id: string) => {
      const m = /-(\d+)/.exec(baseId(id));
      return m ? Number(m[1]) : 9999;
    };
    return [...suggestions].sort((a, b) => {
      const aId = (a.id || "").toUpperCase();
      const bId = (b.id || "").toUpperCase();
      const n = num(aId) - num(bId);
      if (n !== 0) return n;
      const vr = variantRank(aId) - variantRank(bId);
      if (vr !== 0) return vr;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [suggestions, isSetBrowse]);
  useEffect(() => {
    const run = async () => {
      if (!data?.cardId) { setHistoryPoints([]); return; }
      try {
        const res = await fetch(`/api/market/history?id=${encodeURIComponent(data.cardId)}&range=${historyRange}`);
        if (!res.ok) return;
        const json = await res.json();
        setHistoryPoints(json.points || []);
      } catch {
        setHistoryPoints([]);
      }
    };
    run();
  }, [data?.cardId, historyRange]);

  const quality = data?.ebay.qualityConfidence ?? 0;
  const qualityBadge = quality >= 0.8
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : quality >= 0.6
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-red-500/15 text-red-300 border-red-500/30";

  return (
    <div className="space-y-10 pb-24 md:pb-0">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-[#F0C040]/10 border border-[#F0C040]/20 rounded-full">
          <TrendingUp className="w-3.5 h-3.5 text-[#F0C040]" />
          <span className="text-[#F0C040] text-xs font-semibold tracking-wider uppercase">Bounty Board</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C040] to-[#DC2626]">Bounty Board</span>
        </h1>
        <p className="text-white/40 text-lg">Live bounties from eBay sold comps + TCGPlayer market</p>
      </motion.div>

      <TickerRow
        items={[
          { label: "OP01-120", value: "$1,429", delta: 5.2 },
          { label: "OP09-118", value: "$899", delta: -1.7 },
          { label: "Manga Ace", value: "$2,750", delta: 3.1 },
          { label: "SP Nami", value: "$620", delta: 2.3 },
          { label: "OP12-020", value: "$208", delta: 1.2 },
        ]}
      />

      {/* Most Wanted */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45 }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Most Wanted Bounties</h3>
          <p className="text-xs text-white/45">Popular + premium targets</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {MARKET_HOT_CARDS.slice(0, 4).map((c) => (
            <WantedPosterCard
              key={c.id}
              id={c.id}
              name={c.name}
              subtitle={c.id}
              href={`/market?card=${encodeURIComponent(c.id)}`}
            />
          ))}
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
              placeholder="Set sail to a card — Shanks, Luffy, OP01-001..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#F0C040]/50 focus:bg-white/8 transition-all text-base"
            />
            <AnimatePresence>
              {showSuggestions && sortedSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 mt-2 w-full max-h-[420px] overflow-y-auto bg-[#0c1324]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60"
                >
                  {sortedSuggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setQuery(s.id || s.name);
                        setSuggestions([]);
                        setShowSuggestions(false);
                        router.push(`/market?card=${encodeURIComponent(s.id || s.name)}`);
                        fetchMarket(s.id || s.name);
                      }}
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
                        <p className="text-white/40 text-xs">{(s.id || '').split('_')[0]} · {s.setCode ?? s.set}{s.rarity ? ` · ${s.rarity}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DonButton type="submit" className="h-[52px] w-full sm:w-auto">
            <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4" /> Search</span>
          </DonButton>
        </form>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 max-w-5xl">
          <select value={filterSet} onChange={(e) => { setFilterSet(e.target.value); setShowSuggestions(true); }} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
            <option value="">All Sets</option>
            {[
              "OP01","OP02","OP03","OP04","OP05","OP06","OP07","OP08","OP09","OP10","OP11","OP12","OP13","OP14","OP15",
              "EB01","EB02","EB03","EB04",
              "ST01","ST02","ST03","ST04","ST05","ST06","ST07","ST08","ST09","ST10","ST11","ST12","ST13","ST14","ST15","ST16","ST17","ST18","ST19","ST20","ST21","ST22","ST23","ST24","ST25","ST26","ST27","ST28","ST29",
              "PRB01","PRB02","P"
            ].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterColor} onChange={(e) => { setFilterColor(e.target.value); setShowSuggestions(true); }} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
            <option value="">All Colors</option>
            {['Red','Blue','Green','Purple','Black','Yellow'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterRarity} onChange={(e) => { setFilterRarity(e.target.value); setShowSuggestions(true); }} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
            <option value="">All Rarity</option>
            {['C','UC','R','SR','SEC','L','SP','P','TR'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <input value={filterCostMin} onChange={(e) => { setFilterCostMin(e.target.value.replace(/[^0-9]/g, "")); setShowSuggestions(true); }} placeholder="Min Cost" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30" />
          <input value={filterCostMax} onChange={(e) => { setFilterCostMax(e.target.value.replace(/[^0-9]/g, "")); setShowSuggestions(true); }} placeholder="Max Cost" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30" />

          <button
            type="button"
            onClick={() => { setFilterSet(""); setFilterColor(""); setFilterRarity(""); setFilterCostMin(""); setFilterCostMax(""); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:text-white"
          >
            Clear Filters
          </button>
        </div>
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

      {/* Set Browse Results */}
      {isSetBrowse && sortedSuggestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Showing {sortedSuggestions.length} cards</h3>
            <p className="text-xs text-white/50">Click any card to open market details</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sortedSuggestions.map((s) => (
              <button
                key={`${s.id}-${s.imageUrl || "base"}`}
                type="button"
                onClick={() => {
                  const selectedId = s.id || s.name;
                  setQuery(selectedId);
                  router.push(`/market?card=${encodeURIComponent(selectedId)}`);
                  fetchMarket(selectedId);
                }}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-left hover:border-[#F0C040]/40 transition-all"
              >
                <img
                  src={s.imageUrl || `/api/card-image?id=${s.id}`}
                  alt={s.name}
                  className="w-full aspect-[5/7] object-contain rounded-xl border border-white/10 bg-[#0b1222] p-1 group-hover:scale-[1.02] transition-transform"
                />
                <p className="mt-2 text-xs font-bold text-white truncate">{s.name}</p>
                <p className="text-[11px] text-white/45">{(s.id || '').split('_')[0]}</p>
              </button>
            ))}
          </div>
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
                      <div className="text-xs text-white/30 mt-1">quality {(data.ebay.qualityConfidence * 100).toFixed(0)}% · filtered {data.ebay.filteredOut}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <div className={`flex items-center gap-1.5 text-lg font-bold ${trendColor}`}>
                        <TrendIcon className="w-5 h-5" />
                        {data.trend.percent}% this week
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${qualityBadge}`}>
                        Confidence {(data.ebay.qualityConfidence * 100).toFixed(0)}%
                      </span>
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

            {/* Price History */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-bold text-white text-lg">Price History</h3>
                <div className="flex gap-2">
                  {([
                    { id: "7d", label: "1W" },
                    { id: "30d", label: "1M" },
                    { id: "90d", label: "3M" },
                    { id: "180d", label: "6M" },
                    { id: "365d", label: "1Y" },
                  ] as const).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setHistoryRange(r.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        historyRange === r.id
                          ? "bg-[#F0C040]/20 border-[#F0C040]/40 text-[#F0C040]"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5 h-[260px]">
                {historyPoints.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyPoints}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "#0c1324", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}
                        formatter={(value: unknown, name?: string) => [`$${Number(value ?? 0).toFixed(2)}`, name === "ebayAvg" ? "eBay Avg" : "TCG Market"]}
                      />
                      <Line type="monotone" dataKey="ebayAvg" stroke="#F0C040" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="tcgMarket" stroke="#60A5FA" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm">
                    Not enough history yet — this fills as card lookups accumulate.
                  </div>
                )}
              </div>
            </div>

            {/* eBay Sales Table */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-white text-lg">Recent eBay Sales</h3>
                <p className="text-xs text-white/30">{new Date(data.lastUpdated).toLocaleString()} {data.cached ? "(cached)" : ""} · source {data.ebay.source === "completed" ? "sold comps" : data.ebay.source === "active" ? "active fallback" : "seeded fallback"}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                      <th className="text-left p-4 font-medium">Title</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Condition</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Date</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Source</th>
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
                        <td className="p-4 hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${
                            sale.sourceType === "completed"
                              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                              : sale.sourceType === "active"
                                ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                                : "text-white/60 bg-white/5 border-white/15"
                          }`}>
                            {sale.sourceType === "completed" ? "Sold" : sale.sourceType === "active" ? "Active Fallback" : "Seeded"}
                          </span>
                        </td>
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

      {/* Empty state */}
      {!data && !loading && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
          <div className="text-7xl mb-6">🍇</div>
          <p className="text-white/30 text-lg">Search a card to see live market data</p>
          <p className="text-white/20 text-sm mt-2">Try &quot;Shanks&quot;, &quot;Luffy&quot;, or &quot;OP01-001&quot;</p>
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
            <DonButton type="submit" className="h-11 px-4">
              Search
            </DonButton>
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

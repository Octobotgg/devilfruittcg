"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Trash2, TrendingUp, Package, DollarSign, RefreshCw, Star } from "lucide-react";
import { SEED_CARDS, searchCards, type Card } from "@/lib/cards";
import CardModal, { type CardModalData } from "@/components/CardModal";

interface CollectionEntry { cardId: string; quantity: number; price?: number; lastUpdated?: string; }
interface Collection { [cardId: string]: CollectionEntry; }
const STORAGE_KEY = "devilfruit_collection";

function loadCollection(): Collection {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveCollection(c: Collection) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

const rarityBadge: Record<string, string> = {
  L:   "text-[#F0C040] bg-[#F0C040]/10 border-[#F0C040]/30",
  SEC: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  SR:  "text-purple-400 bg-purple-400/10 border-purple-400/30",
  R:   "text-blue-400 bg-blue-400/10 border-blue-400/30",
  UC:  "text-green-400 bg-green-400/10 border-green-400/30",
  C:   "text-white/40 bg-white/5 border-white/10",
};

export default function CollectionPage() {
  const [collection, setCollection] = useState<Collection>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [activeTab, setActiveTab] = useState<"collection" | "add">("collection");
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);

  function openModal(card: Card) {
    setModalCard({
      id: card.id, name: card.name, set: card.set, setCode: card.setCode,
      number: card.number, type: card.type, color: card.color, rarity: card.rarity,
      cost: card.cost, power: card.power, attribute: card.attribute, imageUrl: card.imageUrl,
    });
  }

  useEffect(() => { setCollection(loadCollection()); }, []);

  useEffect(() => {
    const run = async () => {
      const q = query.trim();
      if (!q) { setResults(SEED_CARDS.slice(0, 12)); return; }
      setSearching(true);
      try {
        const res = await fetch(`/api/cards?q=${encodeURIComponent(q)}&pageSize=24`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.results || []);
        } else {
          setResults(searchCards(q));
        }
      } catch {
        setResults(searchCards(q));
      } finally {
        setSearching(false);
      }
    };
    const t = setTimeout(run, 220);
    return () => clearTimeout(t);
  }, [query]);

  function addCard(card: Card) {
    const updated = { ...collection };
    if (updated[card.id]) updated[card.id].quantity += 1;
    else updated[card.id] = { cardId: card.id, quantity: 1 };
    setCollection(updated); saveCollection(updated);
  }

  function removeCard(cardId: string, delta: number) {
    const updated = { ...collection };
    if (!updated[cardId]) return;
    updated[cardId].quantity += delta;
    if (updated[cardId].quantity <= 0) delete updated[cardId];
    setCollection(updated); saveCollection(updated);
  }

  function deleteCard(cardId: string) {
    const updated = { ...collection };
    delete updated[cardId];
    setCollection(updated); saveCollection(updated);
  }

  const refreshPrices = useCallback(async () => {
    const entries = Object.values(collection);
    if (!entries.length) return;
    setLoadingPrices(true);
    const updated = { ...collection };
    await Promise.all(entries.slice(0, 5).map(async (entry) => {
      try {
        const res = await fetch(`/api/market?id=${entry.cardId}`);
        if (res.ok) {
          const data = await res.json();
          updated[entry.cardId].price = data.ebay?.averagePrice || 0;
          updated[entry.cardId].lastUpdated = new Date().toISOString();
        }
      } catch {}
    }));
    setCollection(updated); saveCollection(updated); setLoadingPrices(false);
  }, [collection]);

  const entries = Object.values(collection);
  const totalCards  = entries.reduce((a, b) => a + b.quantity, 0);
  const uniqueCards = entries.length;
  const totalValue  = entries.reduce((sum, e) => sum + (e.price || 0) * e.quantity, 0);
  const getCard = (id: string) => SEED_CARDS.find(c => c.id === id);

  return (
    <div className="space-y-10">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-purple-500/10 border border-purple-500/20 rounded-full">
          <Package className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-400 text-xs font-semibold tracking-wider uppercase">Personal Collection</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Collection <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[#F0C040]">Tracker</span>
        </h1>
        <p className="text-white/40 text-lg">Track your cards, see live value, know what to sell or hold.</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Package,   value: totalCards,  label: "Total Cards",   color: "text-[#F0C040]",  iconColor: "text-[#F0C040]",  bg: "from-[#F0C040]/10 to-transparent", border: "border-[#F0C040]/20" },
          { icon: DollarSign,value: totalValue > 0 ? `$${totalValue.toFixed(2)}` : "—", label: "Est. Value", color: "text-green-400", iconColor: "text-green-400", bg: "from-green-400/10 to-transparent", border: "border-green-400/20" },
          { icon: Star,      value: uniqueCards, label: "Unique Cards",  color: "text-purple-400", iconColor: "text-purple-400", bg: "from-purple-400/10 to-transparent", border: "border-purple-400/20" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className={`relative bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-3xl p-6 text-center overflow-hidden`}>
            <stat.icon className={`w-6 h-6 ${stat.iconColor} mx-auto mb-3`} />
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-3">
        {[
          { id: "collection", label: `My Collection (${uniqueCards})` },
          { id: "add",        label: "+ Add Cards" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black shadow-lg"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
            }`}>
            {tab.label}
          </button>
        ))}
        {uniqueCards > 0 && (
          <button onClick={refreshPrices} disabled={loadingPrices}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all">
            <RefreshCw className={`w-4 h-4 ${loadingPrices ? "animate-spin" : ""}`} />
            {loadingPrices ? "Updating..." : "Refresh Prices"}
          </button>
        )}
      </motion.div>

      {/* Collection Tab */}
      <AnimatePresence mode="wait">
        {activeTab === "collection" && (
          <motion.div key="col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {entries.length === 0 ? (
              <div className="text-center py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                <div className="text-6xl mb-5">📦</div>
                <p className="text-white/40 text-lg mb-3">Your collection is empty</p>
                <button onClick={() => setActiveTab("add")}
                  className="text-[#F0C040] text-sm font-semibold hover:underline">
                  Add your first card →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, i) => {
                  const card = getCard(entry.cardId);
                  if (!card) return null;
                  const ev = (entry.price || 0) * entry.quantity;
                  return (
                    <motion.div key={entry.cardId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:border-white/20 transition-all group">
                      <motion.div whileHover={{ scale: 1.05, rotate: 2 }} transition={{ type: "spring", stiffness: 300 }}
                        className="cursor-zoom-in" onClick={() => openModal(card)} title="Click to view card">
                        <img src={`/api/card-image?id=${card.id}`} alt={card.name}
                          className="w-12 h-16 object-cover rounded-xl border border-white/10 shadow-lg" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold truncate">{card.name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-lg border font-black flex-shrink-0 ${rarityBadge[card.rarity] ?? rarityBadge.C}`}>{card.rarity}</span>
                        </div>
                        <p className="text-xs text-white/30 font-mono">{card.id} · {card.set}</p>
                        {entry.price
                          ? <p className="text-xs text-green-400 mt-1 font-semibold">${entry.price.toFixed(2)} ea · <span className="text-green-300">${ev.toFixed(2)} total</span></p>
                          : <p className="text-xs text-white/20 mt-1">Price not loaded — click Refresh</p>
                        }
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => removeCard(entry.cardId, -1)}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-white font-black text-sm">{entry.quantity}</span>
                        <button onClick={() => addCard(card)}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteCard(entry.cardId)}
                          className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                {totalValue > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gradient-to-r from-[#F0C040]/10 to-transparent border border-[#F0C040]/20 rounded-2xl p-5 flex items-center justify-between">
                    <span className="text-white/60 font-bold">Total Collection Value</span>
                    <span className="text-3xl font-black text-[#F0C040]">${totalValue.toFixed(2)}</span>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Add Cards Tab */}
        {activeTab === "add" && (
          <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, set, or card ID..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#F0C040]/50 transition-all" />
              {searching && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((card, i) => {
                const inCol = collection[card.id];
                return (
                  <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`bg-white/[0.03] border rounded-2xl p-4 flex items-center gap-3 transition-all ${
                      inCol ? "border-[#F0C040]/30 bg-[#F0C040]/5" : "border-white/10 hover:border-white/20"
                    }`}>
                    <motion.div whileHover={{ scale: 1.05 }} className="cursor-zoom-in flex-shrink-0"
                      onClick={e => { e.stopPropagation(); openModal(card); }} title="Click to view card">
                      <img src={`/api/card-image?id=${card.id}`} alt={card.name}
                        className="w-10 h-14 object-cover rounded-lg border border-white/10" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{card.name}</p>
                      <p className="text-white/30 text-xs font-mono">{card.id}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-lg border font-black ${rarityBadge[card.rarity] ?? rarityBadge.C}`}>{card.rarity}</span>
                        <span className="text-xs text-white/30">{card.color}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {inCol && <span className="text-xs text-[#F0C040] font-black">×{inCol.quantity}</span>}
                      <motion.button onClick={() => addCard(card)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                        className="w-9 h-9 rounded-xl bg-[#F0C040]/10 border border-[#F0C040]/20 flex items-center justify-center text-[#F0C040] hover:bg-[#F0C040]/20 transition-all">
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {results.length === 0 && !searching && (
              <div className="text-center py-14 text-white/30">
                <div className="text-5xl mb-4">🔍</div>
                No cards found for &quot;{query}&quot;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

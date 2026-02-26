"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Trash2, Download, Save, Crown, X, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { searchCards, type Card } from "@/lib/cards";

interface DeckCard { cardId: string; quantity: number; }
interface Deck {
  id: string; name: string; leaderId: string | null;
  cards: DeckCard[]; createdAt: string; updatedAt: string;
}

const COLORS = ["Red", "Blue", "Green", "Purple", "Black", "Yellow"];
const TYPES = ["Leader", "Character", "Event", "Stage"];
const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e",
  Purple: "#a855f7", Black: "#6b7280", Yellow: "#eab308",
};

function newDeck(): Deck {
  return { id: Date.now().toString(), name: "My Deck", leaderId: null, cards: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function saveDecks(decks: Deck[]) {
  localStorage.setItem("devilfruit_decks", JSON.stringify(decks));
}
function loadDecks(): Deck[] {
  try { return JSON.parse(localStorage.getItem("devilfruit_decks") || "[]"); } catch { return []; }
}

export default function DeckBuilderPage() {
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Deck>(newDeck());
  const [allCards, setAllCards] = useState<Map<string, Card>>(new Map());
  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState(false);

  // load all cards once
  useEffect(() => {
    const cards = searchCards("");
    const map = new Map<string, Card>();
    cards.forEach(c => map.set(c.id, c));
    setAllCards(map);
    setResults(cards.slice(0, 24));
  }, []);

  const search = useCallback(() => {
    let res = searchCards(query);
    if (colorFilter) res = res.filter(c => c.color.toLowerCase().includes(colorFilter.toLowerCase()));
    if (typeFilter) res = res.filter(c => c.type.toLowerCase() === typeFilter.toLowerCase());
    setResults(res.slice(0, 48));
  }, [query, colorFilter, typeFilter]);

  useEffect(() => { search(); }, [search]);

  const totalCards = (deck.leaderId ? 1 : 0) + deck.cards.reduce((s, c) => s + c.quantity, 0);
  const isValid = deck.leaderId !== null && totalCards === 50;

  function addCard(card: Card) {
    if (card.type === "Leader") {
      setDeck(d => ({ ...d, leaderId: card.id, updatedAt: new Date().toISOString() }));
      return;
    }
    setDeck(d => {
      const existing = d.cards.find(c => c.cardId === card.id);
      if (existing) {
        if (existing.quantity >= 4) return d;
        return { ...d, cards: d.cards.map(c => c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c), updatedAt: new Date().toISOString() };
      }
      return { ...d, cards: [...d.cards, { cardId: card.id, quantity: 1 }], updatedAt: new Date().toISOString() };
    });
  }

  function removeOne(cardId: string) {
    setDeck(d => {
      const existing = d.cards.find(c => c.cardId === cardId);
      if (!existing) return d;
      if (existing.quantity <= 1) return { ...d, cards: d.cards.filter(c => c.cardId !== cardId), updatedAt: new Date().toISOString() };
      return { ...d, cards: d.cards.map(c => c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c), updatedAt: new Date().toISOString() };
    });
  }

  function removeCard(cardId: string) {
    setDeck(d => ({ ...d, cards: d.cards.filter(c => c.cardId !== cardId), updatedAt: new Date().toISOString() }));
  }

  function saveDeck() {
    const decks = loadDecks();
    const idx = decks.findIndex(d => d.id === deck.id);
    if (idx >= 0) decks[idx] = deck; else decks.push(deck);
    saveDecks(decks);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportDeck() {
    const leaderCard = deck.leaderId ? allCards.get(deck.leaderId) : null;
    const lines = leaderCard ? [`1x ${leaderCard.id} ${leaderCard.name} [Leader]`] : [];
    deck.cards.forEach(({ cardId, quantity }) => {
      const card = allCards.get(cardId);
      if (card) lines.push(`${quantity}x ${card.id} ${card.name}`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    });
  }

  // color breakdown
  const colorCounts: Record<string, number> = {};
  deck.cards.forEach(({ cardId, quantity }) => {
    const card = allCards.get(cardId);
    if (!card) return;
    card.color.split("/").forEach(col => {
      const c = col.trim();
      colorCounts[c] = (colorCounts[c] || 0) + quantity;
    });
  });

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white">Deck Builder</h1>
          <p className="text-white/40 text-sm mt-1">Build and save your One Piece TCG decks</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT: Card Search */}
          <div>
            {/* Search + Filters */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search cards..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={colorFilter}
                  onChange={e => setColorFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <option value="">All Colors</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <option value="">All Types</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {(colorFilter || typeFilter || query) && (
                  <button onClick={() => { setColorFilter(""); setTypeFilter(""); setQuery(""); }} className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white" style={{ background: "rgba(255,255,255,0.04)" }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
              {results.map(card => {
                const inDeck = card.type === "Leader"
                  ? deck.leaderId === card.id
                  : deck.cards.find(c => c.cardId === card.id);
                const qty = card.type === "Leader" ? (deck.leaderId === card.id ? 1 : 0) : (deck.cards.find(c => c.cardId === card.id)?.quantity ?? 0);
                return (
                  <motion.div
                    key={card.id}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addCard(card)}
                    className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ border: inDeck ? "2px solid #f0c040" : "2px solid rgba(255,255,255,0.06)", aspectRatio: "63/88" }}
                  >
                    <img
                      src={`/api/card-image?id=${card.id}`}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    {qty > 0 && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-black" style={{ background: "#f0c040" }}>
                        {qty}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 px-1 py-1 text-center" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                      <p className="text-[9px] text-white/80 leading-tight truncate">{card.name}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {results.length === 0 && (
              <div className="text-center py-12 text-white/30">No cards found</div>
            )}
          </div>

          {/* RIGHT: Deck Panel */}
          <div className="lg:sticky lg:top-4 self-start">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Deck Name */}
              <input
                value={deck.name}
                onChange={e => setDeck(d => ({ ...d, name: e.target.value }))}
                className="w-full text-lg font-bold text-white bg-transparent outline-none border-b mb-3 pb-1"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}
              />

              {/* Card Count */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${isValid ? "text-green-400" : totalCards > 50 ? "text-red-400" : "text-white/50"}`}>
                  {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {totalCards}/50 cards
                </div>
                {!deck.leaderId && <span className="text-xs text-amber-400">No leader set</span>}
              </div>

              {/* Color Bars */}
              {Object.keys(colorCounts).length > 0 && (
                <div className="mb-3 space-y-1">
                  {Object.entries(colorCounts).map(([color, count]) => (
                    <div key={color} className="flex items-center gap-2">
                      <span className="text-xs text-white/40 w-12">{color}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (count / 49) * 100)}%`, background: COLOR_HEX[color] || "#888" }} />
                      </div>
                      <span className="text-xs text-white/30 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Leader */}
              <div className="mb-3">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> Leader
                </div>
                {deck.leaderId ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "rgba(240,192,64,0.08)", border: "1px solid rgba(240,192,64,0.2)" }}>
                    <img src={`/api/card-image?id=${deck.leaderId}`} alt="Leader" className="w-10 h-14 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{allCards.get(deck.leaderId)?.name}</p>
                      <p className="text-xs text-white/30">{deck.leaderId}</p>
                    </div>
                    <button onClick={() => setDeck(d => ({ ...d, leaderId: null }))} className="text-white/30 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 text-center text-xs text-white/20" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                    Click a Leader card to set
                  </div>
                )}
              </div>

              {/* Deck Cards */}
              <div className="mb-3">
                <div className="text-xs text-white/30 uppercase tracking-wider mb-1.5">Cards ({deck.cards.reduce((s, c) => s + c.quantity, 0)})</div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  <AnimatePresence>
                    {deck.cards.map(({ cardId, quantity }) => {
                      const card = allCards.get(cardId);
                      if (!card) return null;
                      return (
                        <motion.div
                          key={cardId}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          <img src={`/api/card-image?id=${cardId}`} alt={card.name} className="w-7 h-10 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{card.name}</p>
                            <p className="text-[10px] text-white/30">{card.id}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => removeOne(cardId)} className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-white w-4 text-center font-bold">{quantity}</span>
                            <button onClick={() => addCard(card)} className="w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10" disabled={quantity >= 4}>
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeCard(cardId)} className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-red-400 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {deck.cards.length === 0 && (
                    <p className="text-center text-xs text-white/20 py-4">Click cards to add them</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={saveDeck}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: saved ? "#22c55e" : "linear-gradient(135deg, #f0c040, #dc8a00)", color: "#000" }}
                >
                  {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save"}
                </button>
                <button
                  onClick={exportDeck}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: exported ? "#22c55e" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Download className="w-4 h-4" />
                  {exported ? "Copied!" : "Export"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setDeck(newDeck())}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 transition-colors"
                  style={{ border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
                <Link href="/decks">
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-white/40 hover:text-white transition-colors" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                    <BookOpen className="w-3.5 h-3.5" /> My Decks
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

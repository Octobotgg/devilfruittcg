"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Crown, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import type { Card } from "@/lib/cards";

interface DeckCard { cardId: string; quantity: number; }
interface Deck {
  id: string; name: string; leaderId: string | null;
  cards: DeckCard[]; createdAt: string; updatedAt: string;
}

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e",
  Purple: "#a855f7", Black: "#6b7280", Yellow: "#eab308",
};

function loadDecks(): Deck[] {
  try { return JSON.parse(localStorage.getItem("devilfruit_decks") || "[]"); } catch { return []; }
}
function saveDecks(decks: Deck[]) {
  localStorage.setItem("devilfruit_decks", JSON.stringify(decks));
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCache, setCardCache] = useState<Map<string, Card>>(new Map());

  useEffect(() => {
    setDecks(loadDecks());
  }, []);

  // Fetch card info for all leader IDs
  useEffect(() => {
    const leaderIds = decks.map(d => d.leaderId).filter(Boolean) as string[];
    if (leaderIds.length === 0) return;
    const missing = leaderIds.filter(id => !cardCache.has(id));
    if (missing.length === 0) return;

    fetch(`/api/cards?q=${missing[0]}&pageSize=1`)
      .then(r => r.json())
      .then(data => {
        const newCache = new Map(cardCache);
        (data.results || []).forEach((c: Card) => newCache.set(c.id, c));
        setCardCache(newCache);
      }).catch(() => {});
  }, [decks]);

  function deleteDeck(id: string) {
    const updated = decks.filter(d => d.id !== id);
    setDecks(updated);
    saveDecks(updated);
  }

  function getColorBreakdown(deck: Deck): Record<string, number> {
    const counts: Record<string, number> = {};
    deck.cards.forEach(({ cardId, quantity }) => {
      const card = cardCache.get(cardId);
      if (!card) return;
      card.color.split("/").forEach(col => {
        const c = col.trim();
        counts[c] = (counts[c] || 0) + quantity;
      });
    });
    return counts;
  }

  function totalCards(deck: Deck) {
    return (deck.leaderId ? 1 : 0) + deck.cards.reduce((s, c) => s + c.quantity, 0);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-yellow-400" />
              My Decks
            </h1>
            <p className="text-white/40 text-sm mt-1">{decks.length} deck{decks.length !== 1 ? "s" : ""} saved</p>
          </div>
          <Link href="/deckbuilder">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black"
              style={{ background: "linear-gradient(135deg, #f0c040, #dc8a00)" }}
            >
              <Plus className="w-4 h-4" />
              New Deck
            </motion.button>
          </Link>
        </div>

        {/* Empty state */}
        {decks.length === 0 && (
          <div className="text-center py-24">
            <BookOpen className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-lg font-semibold">No decks yet</p>
            <p className="text-white/20 text-sm mt-1 mb-6">Build your first deck to get started</p>
            <Link href="/deckbuilder">
              <button className="px-6 py-3 rounded-xl font-bold text-black text-sm" style={{ background: "linear-gradient(135deg, #f0c040, #dc8a00)" }}>
                Build a Deck
              </button>
            </Link>
          </div>
        )}

        {/* Deck Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {decks.map(deck => {
              const leader = deck.leaderId ? cardCache.get(deck.leaderId) : null;
              const total = totalCards(deck);
              const isValid = deck.leaderId !== null && total === 50;
              const colors = getColorBreakdown(deck);

              return (
                <motion.div
                  key={deck.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl overflow-hidden relative group"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {/* Leader Art Background */}
                  {deck.leaderId && (
                    <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity">
                      <img
                        src={`/api/card-image?id=${deck.leaderId}`}
                        alt=""
                        className="w-full h-full object-cover object-top scale-110"
                      />
                    </div>
                  )}

                  <div className="relative p-4">
                    {/* Top row: leader thumb + name */}
                    <div className="flex items-start gap-3 mb-3">
                      {deck.leaderId ? (
                        <div className="relative shrink-0">
                          <img
                            src={`/api/card-image?id=${deck.leaderId}`}
                            alt="Leader"
                            className="w-14 h-20 object-cover rounded-xl shadow-lg"
                          />
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                            <Crown className="w-2.5 h-2.5 text-black" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
                          <Crown className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight mb-0.5 truncate">{deck.name}</h3>
                        {leader && <p className="text-white/40 text-xs truncate">{leader.name}</p>}
                        <div className={`mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${isValid ? "text-green-400 bg-green-400/10" : "text-white/30 bg-white/5"}`}>
                          {total}/50
                        </div>
                      </div>
                    </div>

                    {/* Color bars */}
                    {Object.keys(colors).length > 0 && (
                      <div className="flex gap-1 mb-3 h-1.5">
                        {Object.entries(colors).map(([color, count]) => (
                          <div
                            key={color}
                            className="h-full rounded-full"
                            style={{
                              background: COLOR_HEX[color] || "#888",
                              flex: count,
                              opacity: 0.8
                            }}
                            title={`${color}: ${count}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Date + actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-white/25">
                        <Calendar className="w-3 h-3" />
                        {new Date(deck.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/deckbuilder?id=${deck.id}`}>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </Link>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteDeck(deck.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

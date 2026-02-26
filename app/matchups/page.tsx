"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  META_DECKS, getDeckById, getBestMatchups, getWorstMatchups,
  TIER_COLORS, TREND_ICONS, TREND_COLORS, type MetaDeck,
} from "@/lib/meta-decks";
import CardModal, { type CardModalData } from "@/components/CardModal";

function getWinRateColor(rate: number) {
  if (rate >= 60) return "bg-green-500 text-white";
  if (rate >= 55) return "bg-green-400/80 text-black";
  if (rate >= 52) return "bg-green-300/60 text-black";
  if (rate >= 50) return "bg-white/15 text-white";
  if (rate >= 48) return "bg-orange-300/60 text-black";
  if (rate >= 45) return "bg-orange-400/80 text-black";
  return "bg-red-500 text-white";
}

function getWinRateLabel(rate: number) {
  if (rate >= 60) return "Very Favored";
  if (rate >= 55) return "Favored";
  if (rate >= 52) return "Slight Edge";
  if (rate >= 50) return "Even";
  if (rate >= 48) return "Slight Disadv.";
  if (rate >= 45) return "Unfavored";
  return "Very Unfavored";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "▲") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === "▼") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
}

export default function MatchupsPage() {
  const [selectedDeck, setSelectedDeck] = useState<MetaDeck | null>(null);
  const [view, setView] = useState<"matrix" | "tier" | "detail">("tier");
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setView(window.innerWidth < 768 ? "tier" : "matrix");
    }
  }, []);

  function openDeckModal(deck: MetaDeck) {
    setModalCard({ id: deck.cardId, name: deck.name, color: deck.color });
  }

  return (
    <div className="space-y-10 pb-24 md:pb-0">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-red-500/10 border border-red-500/20 rounded-full">
          <Swords className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 text-xs font-semibold tracking-wider uppercase">Win Rate Data</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Matchup <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-[#F0C040]">Matrix</span>
        </h1>
        <p className="text-white/40 text-lg">Current meta analysis · Click any deck for full breakdown</p>
      </motion.div>

      {/* View Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex gap-2">
        {([
          { id: "matrix", label: "Matrix" },
          { id: "tier",   label: "Tier List" },
          { id: "detail", label: "Analysis" },
        ] as const).map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === v.id
                ? "bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black shadow-lg"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/8"
            }`}>
            {v.label}
          </button>
        ))}
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: META_DECKS.length, label: "Meta Decks", color: "text-[#F0C040]" },
          { value: META_DECKS.filter(d => d.tier === "S").length, label: "S-Tier Decks", color: "text-yellow-400" },
          { value: META_DECKS.filter(d => d.tier === "A").length, label: "A-Tier Decks", color: "text-blue-400" },
          { value: META_DECKS.filter(d => d.tier === "B").length, label: "B-Tier Decks", color: "text-purple-400" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
            <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Matrix View */}
      <AnimatePresence mode="wait">
        {view === "matrix" && (
          <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Legend */}
            <p className="md:hidden text-white/40 text-xs mb-3">Tip: swipe horizontally to explore the full matchup table.</p>
            <div className="flex flex-wrap gap-3 mb-5 text-xs">
              {[
                { color: "bg-green-500", label: "60%+ Favored" },
                { color: "bg-green-400/80", label: "55-59%" },
                { color: "bg-white/15", label: "50% Even" },
                { color: "bg-orange-400/80", label: "45-49%" },
                { color: "bg-red-500", label: "<45% Unfavored" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span className="text-white/40">{l.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-white/30 text-xs sticky left-0 bg-[#0a0f1e] z-20 min-w-[120px]">
                        Deck ↓ vs →
                      </th>
                      {META_DECKS.map((deck) => (
                        <th key={deck.id} className="p-2 min-w-[64px]">
                          <button onClick={() => { setSelectedDeck(deck); setView("detail"); }}
                            className="flex flex-col items-center gap-1 group">
                            <img src={`/api/card-image?id=${deck.cardId}`} alt={deck.name}
                              onClick={e => { e.stopPropagation(); openDeckModal(deck); }}
                              className="w-10 h-14 object-cover rounded-lg border border-white/10 group-hover:border-[#F0C040]/50 transition-all group-hover:scale-105 cursor-zoom-in" />
                            <span className="text-[10px] text-white/30 truncate max-w-[50px]">{deck.name.split(" ")[0]}</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {META_DECKS.map((rowDeck, ri) => (
                      <tr key={rowDeck.id} className="border-t border-white/5">
                        <td className="p-2 sticky left-0 bg-[#0a0f1e] z-10">
                          <button onClick={() => { setSelectedDeck(rowDeck); setView("detail"); }}
                            className="flex items-center gap-2 group">
                            <img src={`/api/card-image?id=${rowDeck.cardId}`} alt={rowDeck.name}
                              className="w-8 h-11 object-cover rounded border border-white/10 group-hover:border-[#F0C040]/50 transition-all" />
                            <div className="text-left">
                              <div className="text-xs text-white font-semibold leading-tight">{rowDeck.name.split(" ").slice(0, 2).join(" ")}</div>
                              <span className={`text-[10px] px-1 rounded border font-bold ${TIER_COLORS[rowDeck.tier]}`}>{rowDeck.tier}</span>
                            </div>
                          </button>
                        </td>
                        {META_DECKS.map((colDeck) => {
                          const rate = rowDeck.matchups[colDeck.id] ?? 50;
                          const isSelf = rowDeck.id === colDeck.id;
                          return (
                            <td key={colDeck.id} className="p-1">
                              {isSelf
                                ? <div className="w-full h-9 flex items-center justify-center text-white/10">—</div>
                                : <button onClick={() => { setSelectedDeck(rowDeck); setView("detail"); }}
                                    title={`${rowDeck.name} vs ${colDeck.name}: ${rate}%`}
                                    className={`w-full h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:scale-110 hover:z-10 hover:shadow-lg ${getWinRateColor(rate)}`}>
                                    {rate}%
                                  </button>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tier List View */}
        {view === "tier" && (
          <motion.div key="tier" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {["S", "A", "B", "C"].map((tier) => {
              const tierDecks = META_DECKS.filter(d => d.tier === tier);
              if (!tierDecks.length) return null;
              const t = TIER_COLORS[tier] || "";
              return (
                <div key={tier} className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
                  <div className={`px-6 py-4 font-black text-xl border-b border-white/10 ${t}`}>
                    Tier {tier}
                  </div>
                  <div className="divide-y divide-white/5">
                    {tierDecks.sort((a, b) => b.metaShare - a.metaShare).map((deck, i) => (
                      <motion.button key={deck.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => { setSelectedDeck(deck); setView("detail"); }}
                        className="w-full p-5 flex items-center gap-5 hover:bg-white/5 transition-all text-left group">
                        <img src={`/api/card-image?id=${deck.cardId}`} alt={deck.name}
                          onClick={e => { e.stopPropagation(); openDeckModal(deck); }}
                          className="w-12 h-16 object-cover rounded-xl border border-white/10 group-hover:border-[#F0C040]/40 transition-all group-hover:scale-105 cursor-zoom-in" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-lg">{deck.name}</span>
                            <TrendIcon trend={deck.trend} />
                          </div>
                          <p className="text-white/40 text-sm truncate">{deck.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-white/40">{deck.color}</span>
                            <span className="text-[#F0C040] font-bold">{deck.metaShare}% meta</span>
                            <span className="text-green-400 font-bold">{deck.winRate}% WR</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-3xl font-black text-white/20">#{META_DECKS.indexOf(deck) + 1}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Detail View */}
        {view === "detail" && selectedDeck && (
          <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DeckDetail deck={selectedDeck} onBack={() => setView("matrix")} onImageClick={openDeckModal} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile one-thumb view switcher */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-[#0c1324]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "matrix", label: "Matrix" },
              { id: "tier", label: "Tier" },
              { id: "detail", label: "Detail" },
            ] as const).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  if (v.id === "detail" && !selectedDeck) return;
                  setView(v.id);
                }}
                className={`h-11 rounded-xl text-xs font-bold transition-all ${
                  view === v.id
                    ? "bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black"
                    : "bg-white/5 text-white/60 border border-white/10"
                } ${v.id === "detail" && !selectedDeck ? "opacity-50" : ""}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeckDetail({ deck, onBack, onImageClick }: { deck: MetaDeck; onBack: () => void; onImageClick: (d: MetaDeck) => void }) {
  const best = getBestMatchups(deck.id);
  const worst = getWorstMatchups(deck.id);

  return (
    <div className="space-y-6">
      <button onClick={onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Matrix
      </button>

      {/* Deck hero */}
      <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0C040]/5 to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-6 flex-wrap">
          <motion.div whileHover={{ scale: 1.05, rotate: 2 }} transition={{ type: "spring", stiffness: 200 }}
            className="cursor-zoom-in" onClick={() => onImageClick(deck)}>
            <img src={`/api/card-image?id=${deck.cardId}`} alt={deck.name}
              className="w-28 h-36 object-cover rounded-2xl border border-white/10 shadow-2xl" />
            <p className="text-center text-white/30 text-xs mt-1">Click to zoom</p>
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-3xl font-black text-white">{deck.name}</h2>
              <span className={`px-3 py-1 rounded-xl border font-black text-sm ${TIER_COLORS[deck.tier]}`}>Tier {deck.tier}</span>
            </div>
            <p className="text-white/40 mb-6 text-base">{deck.description}</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: `${deck.metaShare}%`, label: "Meta Share", color: "text-[#F0C040]" },
                { value: `${deck.winRate}%`,   label: "Win Rate",   color: "text-green-400"  },
                { value: TREND_ICONS[deck.trend], label: "Trend",   color: TREND_COLORS[deck.trend] },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-white/40 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-6">
          <h3 className="text-lg font-black text-green-400 mb-5">✅ Best Matchups</h3>
          <div className="space-y-4">
            {best.map(({ deck: opp, winRate }) => (
              <div key={opp.id} className="flex items-center gap-3">
                <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name}
                  onClick={() => onImageClick(opp)}
                  className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0 cursor-zoom-in hover:border-[#F0C040]/40 transition-all" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{opp.name}</div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                    <motion.div className="bg-green-400 h-1.5 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
                <span className="text-green-400 font-black text-sm">{winRate}%</span>
              </div>
            ))}
          </div>
        </div>
        {/* Worst */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6">
          <h3 className="text-lg font-black text-red-400 mb-5">❌ Worst Matchups</h3>
          <div className="space-y-4">
            {worst.map(({ deck: opp, winRate }) => (
              <div key={opp.id} className="flex items-center gap-3">
                <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name}
                  onClick={() => onImageClick(opp)}
                  className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0 cursor-zoom-in hover:border-[#F0C040]/40 transition-all" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{opp.name}</div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                    <motion.div className="bg-red-400 h-1.5 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 0.6 }} />
                  </div>
                </div>
                <span className="text-red-400 font-black text-sm">{winRate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="font-black text-white text-lg">All Matchups — {deck.name}</h3>
        </div>
        <div className="divide-y divide-white/5">
          {META_DECKS.filter(d => d.id !== deck.id)
            .sort((a, b) => (deck.matchups[b.id] ?? 50) - (deck.matchups[a.id] ?? 50))
            .map((opp, i) => {
              const rate = deck.matchups[opp.id] ?? 50;
              const favored = rate >= 50;
              return (
                <motion.div key={opp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                  <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name}
                    onClick={() => onImageClick(opp)}
                    className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0 cursor-zoom-in hover:border-[#F0C040]/40 transition-all" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{opp.name}</div>
                    <div className="text-xs text-white/40">{opp.color} · Tier {opp.tier}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black ${favored ? "text-green-400" : "text-red-400"}`}>{rate}%</div>
                    <div className="text-xs text-white/30">{getWinRateLabel(rate)}</div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

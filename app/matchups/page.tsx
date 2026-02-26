"use client";

import { useState } from "react";
import { 
  META_DECKS, 
  getDeckById, 
  getBestMatchups, 
  getWorstMatchups,
  TIER_COLORS,
  TREND_ICONS,
  TREND_COLORS,
  type MetaDeck 
} from "@/lib/meta-decks";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Win rate color coding
function getWinRateColor(rate: number): string {
  if (rate >= 60) return "bg-green-500 text-white";
  if (rate >= 55) return "bg-green-400/80 text-black";
  if (rate >= 52) return "bg-green-300/60 text-black";
  if (rate >= 50) return "bg-white/20 text-white";
  if (rate >= 48) return "bg-orange-300/60 text-black";
  if (rate >= 45) return "bg-orange-400/80 text-black";
  return "bg-red-500 text-white";
}

function getWinRateText(rate: number): string {
  if (rate >= 60) return "Very Favored";
  if (rate >= 55) return "Favored";
  if (rate >= 52) return "Slight Edge";
  if (rate >= 50) return "Even";
  if (rate >= 48) return "Slight Disadvantage";
  if (rate >= 45) return "Unfavored";
  return "Very Unfavored";
}

// Meta share data for pie chart
const META_SHARE_DATA = META_DECKS.map(d => ({
  name: d.name,
  value: d.metaShare,
  color: d.color.split("/")[0].toLowerCase() === "red" ? "#ef4444" :
         d.color.split("/")[0].toLowerCase() === "blue" ? "#3b82f6" :
         d.color.split("/")[0].toLowerCase() === "purple" ? "#a855f7" :
         d.color.split("/")[0].toLowerCase() === "black" ? "#6b7280" :
         d.color.split("/")[0].toLowerCase() === "yellow" ? "#eab308" :
         d.color.split("/")[0].toLowerCase() === "green" ? "#22c55e" : "#f59e0b"
}));

export default function MatchupsPage() {
  const [selectedDeck, setSelectedDeck] = useState<MetaDeck | null>(null);
  const [view, setView] = useState<"grid" | "detail" | "tier">("grid");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">⚔️ Matchup Matrix</h1>
        <p className="text-white/50">Current meta analysis for EB04 format · Click any deck for details</p>
      </div>

      {/* View Toggle */}
      <div className="flex justify-center gap-2">
        {(["grid", "tier", "detail"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === v
                ? "bg-[#f0c040] text-black"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            {v === "grid" && "📊 Matrix"}
            {v === "tier" && "🏆 Tier List"}
            {v === "detail" && "📈 Analysis"}
          </button>
        ))}
      </div>

      {/* Meta Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#f0c040]">{META_DECKS.length}</div>
          <div className="text-xs text-white/40">Meta Decks</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">S</div>
          <div className="text-xs text-white/40">Top Tier</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">A</div>
          <div className="text-xs text-white/40">High Tier</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">B</div>
          <div className="text-xs text-white/40">Mid Tier</div>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span><span className="text-white/50">60%+ (Favored)</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400/80"></span><span className="text-white/50">55-59%</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/20"></span><span className="text-white/50">50% (Even)</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400/80"></span><span className="text-white/50">45-49%</span></div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span><span className="text-white/50">&lt;45% (Unfavored)</span></div>
          </div>

          {/* Matchup Grid */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-white/40 text-xs font-medium sticky left-0 bg-[#0a0f1e] z-20 min-w-[100px]">
                      Deck ↓ vs →
                    </th>
                    {META_DECKS.map((deck) => (
                      <th key={deck.id} className="p-1 min-w-[60px]">
                        <button
                          onClick={() => { setSelectedDeck(deck); setView("detail"); }}
                          className="flex flex-col items-center gap-1 group"
                        >
                          <img
                            src={`/api/card-image?id=${deck.cardId}`}
                            alt={deck.name}
                            className="w-10 h-14 object-cover rounded border border-white/10 group-hover:border-[#f0c040]/50 transition-all"
                          />
                          <span className="text-[10px] text-white/40 truncate max-w-[50px]">{deck.name.split(" ")[0]}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {META_DECKS.map((rowDeck) => (
                    <tr key={rowDeck.id} className="border-t border-white/5">
                      <td className="p-2 sticky left-0 bg-[#0a0f1e] z-10">
                        <button
                          onClick={() => { setSelectedDeck(rowDeck); setView("detail"); }}
                          className="flex items-center gap-2 group"
                        >
                          <img
                            src={`/api/card-image?id=${rowDeck.cardId}`}
                            alt={rowDeck.name}
                            className="w-8 h-11 object-cover rounded border border-white/10 group-hover:border-[#f0c040]/50 transition-all"
                          />
                          <div className="text-left">
                            <div className="text-xs text-white font-medium">{rowDeck.name}</div>
                            <span className={`text-[10px] px-1 rounded border ${TIER_COLORS[rowDeck.tier]}`}>
                              {rowDeck.tier}
                            </span>
                          </div>
                        </button>
                      </td>
                      {META_DECKS.map((colDeck) => {
                        const rate = rowDeck.matchups[colDeck.id] ?? 50;
                        const isSelf = rowDeck.id === colDeck.id;
                        return (
                          <td key={colDeck.id} className="p-1">
                            {isSelf ? (
                              <div className="w-full h-8 flex items-center justify-center text-white/10 text-xs">—</div>
                            ) : (
                              <button
                                onClick={() => { setSelectedDeck(rowDeck); setView("detail"); }}
                                className={`w-full h-8 rounded flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${getWinRateColor(rate)}`}
                                title={`${rowDeck.name} vs ${colDeck.name}: ${rate}%`}
                              >
                                {rate}%
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tier List View */}
      {view === "tier" && (
        <div className="space-y-6">
          {/* Meta Share Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Meta Share Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={META_SHARE_DATA}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${value}%`}
                    labelLine={false}
                  >
                    {META_SHARE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier List */}
          {["S", "A", "B", "C"].map((tier) => {
            const tierDecks = META_DECKS.filter((d) => d.tier === tier);
            if (tierDecks.length === 0) return null;
            return (
              <div key={tier} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className={`p-3 font-bold text-lg ${TIER_COLORS[tier]} border-b border-white/10`}>
                  Tier {tier}
                </div>
                <div className="divide-y divide-white/5">
                  {tierDecks
                    .sort((a, b) => b.metaShare - a.metaShare)
                    .map((deck) => (
                      <button
                        key={deck.id}
                        onClick={() => { setSelectedDeck(deck); setView("detail"); }}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left"
                      >
                        <img
                          src={`/api/card-image?id=${deck.cardId}`}
                          alt={deck.name}
                          className="w-12 h-16 object-cover rounded border border-white/10"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{deck.name}</span>
                            <span className={`text-xs ${TREND_COLORS[deck.trend]}`}>
                              {TREND_ICONS[deck.trend]}
                            </span>
                          </div>
                          <div className="text-sm text-white/50">{deck.description}</div>
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="text-white/40">{deck.color}</span>
                            <span className="text-[#f0c040]">{deck.metaShare}% meta share</span>
                            <span className="text-green-400">{deck.winRate}% WR</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">#{META_DECKS.findIndex(d => d.id === deck.id) + 1}</div>
                          <div className="text-xs text-white/40">Rank</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail View */}
      {view === "detail" && selectedDeck && (
        <DeckDetailView deck={selectedDeck} onBack={() => setView("grid")} />
      )}
    </div>
  );
}

// Deck Detail Component
function DeckDetailView({ deck, onBack }: { deck: MetaDeck; onBack: () => void }) {
  const bestMatchups = getBestMatchups(deck.id);
  const worstMatchups = getWorstMatchups(deck.id);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-white/60 hover:text-white flex items-center gap-2 transition-colors"
      >
        ← Back to Matrix
      </button>

      {/* Deck Header */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-start gap-6">
          <img
            src={`/api/card-image?id=${deck.cardId}`}
            alt={deck.name}
            className="w-24 h-32 object-cover rounded-xl border border-white/10"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">{deck.name}</h2>
              <span className={`px-2 py-1 rounded-lg border font-bold ${TIER_COLORS[deck.tier]}`}>
                Tier {deck.tier}
              </span>
            </div>
            <p className="text-white/50 mb-4">{deck.description}</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#f0c040]">{deck.metaShare}%</div>
                <div className="text-xs text-white/40">Meta Share</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{deck.winRate}%</div>
                <div className="text-xs text-white/40">Win Rate</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${TREND_COLORS[deck.trend]}`}>
                  {TREND_ICONS[deck.trend]}
                </div>
                <div className="text-xs text-white/40">Trend</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Matchups */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-green-400 mb-4">✅ Best Matchups</h3>
          <div className="space-y-3">
            {bestMatchups.map(({ deck: opp, winRate }) => (
              <div key={opp.id} className="flex items-center gap-3">
                <img
                  src={`/api/card-image?id=${opp.cardId}`}
                  alt={opp.name}
                  className="w-10 h-14 object-cover rounded border border-white/10"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{opp.name}</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-400 h-2 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
                <div className="text-green-400 font-bold">{winRate}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Matchups */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-red-400 mb-4">❌ Worst Matchups</h3>
          <div className="space-y-3">
            {worstMatchups.map(({ deck: opp, winRate }) => (
              <div key={opp.id} className="flex items-center gap-3">
                <img
                  src={`/api/card-image?id=${opp.cardId}`}
                  alt={opp.name}
                  className="w-10 h-14 object-cover rounded border border-white/10"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{opp.name}</div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-1">
                    <div
                      className="bg-red-400 h-2 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
                <div className="text-red-400 font-bold">{winRate}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Matchup Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">All Matchups — {deck.name}</h3>
        </div>
        <div className="divide-y divide-white/5">
          {META_DECKS.filter((d) => d.id !== deck.id)
            .sort((a, b) => (deck.matchups[b.id] ?? 50) - (deck.matchups[a.id] ?? 50))
            .map((opp) => {
              const rate = deck.matchups[opp.id] ?? 50;
              return (
                <div key={opp.id} className="p-4 flex items-center gap-4">
                  <img
                    src={`/api/card-image?id=${opp.cardId}`}
                    alt={opp.name}
                    className="w-10 h-14 object-cover rounded border border-white/10"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{opp.name}</div>
                    <div className="text-sm text-white/40">{opp.color} · Tier {opp.tier}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${rate >= 50 ? "text-green-400" : "text-red-400"}`}>
                      {rate}%
                    </div>
                    <div className="text-xs text-white/40">{getWinRateText(rate)}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

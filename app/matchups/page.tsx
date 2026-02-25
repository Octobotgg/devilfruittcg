"use client";
import { useEffect, useState } from "react";
import { DECKS as SEEDED_DECKS, MATCHUPS as SEEDED_MATCHUPS, type DeckProfile } from "@/lib/matchups";
import { type MetaSnapshot } from "@/lib/data/meta";

const tierColors: Record<string, string> = {
  S: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  A: "bg-blue-400/20 text-blue-400 border-blue-400/30",
  B: "bg-purple-400/20 text-purple-400 border-purple-400/30",
  C: "bg-white/10 text-white/40 border-white/20",
};

function winRateColor(rate: number, isSelf: boolean) {
  if (isSelf) return "bg-white/5 text-white/20";
  if (rate >= 60) return "bg-green-500/20 text-green-400";
  if (rate >= 55) return "bg-green-500/10 text-green-500/80";
  if (rate >= 50) return "bg-blue-500/10 text-blue-400/80";
  if (rate >= 45) return "bg-orange-500/10 text-orange-400/80";
  if (rate >= 40) return "bg-red-500/10 text-red-400/80";
  return "bg-red-500/20 text-red-400";
}

function computeBest(deckId: string, decks: DeckProfile[], matrix: Record<string, Record<string, number>>) {
  return decks
    .filter((d) => d.id !== deckId)
    .sort((a, b) => (matrix[deckId]?.[b.id] ?? 50) - (matrix[deckId]?.[a.id] ?? 50))
    .slice(0, 3);
}

function computeWorst(deckId: string, decks: DeckProfile[], matrix: Record<string, Record<string, number>>) {
  return decks
    .filter((d) => d.id !== deckId)
    .sort((a, b) => (matrix[deckId]?.[a.id] ?? 50) - (matrix[deckId]?.[b.id] ?? 50))
    .slice(0, 3);
}

function trendIcon(t: DeckProfile["trend"]) {
  return t === "up" ? "▲" : t === "down" ? "▼" : "—";
}
function trendColor(t: DeckProfile["trend"]) {
  return t === "up" ? "text-green-400" : t === "down" ? "text-red-400" : "text-white/30";
}

export default function MatchupsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"matrix" | "detail">("matrix");
  const [decks, setDecks] = useState<DeckProfile[]>(SEEDED_DECKS);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>(SEEDED_MATCHUPS);
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "fallback">("idle");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("loading");
        const res = await fetch("/api/meta", { next: { revalidate: 300 } });
        if (!res.ok) throw new Error("meta fetch failed");
        const data = (await res.json()) as MetaSnapshot;
        if (data.decks?.length && data.matchups) {
          setDecks(data.decks);
          setMatrix(data.matchups);
          setStatus("live");
        } else {
          setStatus("fallback");
        }
      } catch (e) {
        setDecks(SEEDED_DECKS);
        setMatrix(SEEDED_MATCHUPS);
        setStatus("fallback");
      }
    };
    run();
  }, []);

  const selectedDeck = decks.find(d => d.id === selected);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">⚔️ Matchup Matrix</h1>
        <p className="text-white/50">Win rates from tournament results + community data. Click any deck to see detailed breakdown.</p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView("matrix")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${view === "matrix" ? "bg-[#f0c040] text-black" : "bg-white/5 border border-white/10 text-white/60 hover:text-white"}`}
        >
          Full Matrix
        </button>
        <button
          onClick={() => setView("detail")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${view === "detail" ? "bg-[#f0c040] text-black" : "bg-white/5 border border-white/10 text-white/60 hover:text-white"}`}
        >
          Deck Detail
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-white/30">
          <span className="w-3 h-3 rounded bg-green-500/20 inline-block" /> Favored
          <span className="w-3 h-3 rounded bg-blue-500/10 inline-block ml-2" /> Even
          <span className="w-3 h-3 rounded bg-red-500/20 inline-block ml-2" /> Unfavored
        </div>
      </div>

      {view === "matrix" && (
        <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left text-white/40 font-medium min-w-[160px] sticky left-0 bg-[#0a0f1e] z-10">
                    Deck ↓ vs →
                    <div className="text-[10px] text-white/40">{status === "live" ? "Live" : "Seeded"}</div>
                  </th>
                  {decks.map(d => (
                    <th key={d.id} className="p-3 text-center min-w-[80px]">
                      <button
                        onClick={() => { setSelected(d.id); setView("detail"); }}
                        className="flex flex-col items-center gap-1 mx-auto hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={`/api/card-image?id=${d.cardId}`}
                          alt={d.name}
                          className="w-8 h-11 object-cover rounded border border-white/10"
                        />
                        <span className="text-white/50 text-center leading-tight" style={{fontSize: '10px'}}>
                          {d.name.split(" ").slice(-1)[0]}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decks.map(rowDeck => (
                  <tr key={rowDeck.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="p-3 sticky left-0 bg-[#0a0f1e] z-10">
                      <button
                        onClick={() => { setSelected(rowDeck.id); setView("detail"); }}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                      >
                        <img
                          src={`/api/card-image?id=${rowDeck.cardId}`}
                          alt={rowDeck.name}
                          className="w-7 h-10 object-cover rounded border border-white/10 flex-shrink-0"
                        />
                        <div>
                          <p className="text-white/80 font-medium" style={{fontSize:'11px'}}>{rowDeck.name}</p>
                          <span className={`text-xs px-1 py-0.5 rounded border font-bold ${tierColors[rowDeck.tier]}`} style={{fontSize:'9px'}}>
                            {rowDeck.tier}
                          </span>
                        </div>
                      </button>
                    </td>
                    {decks.map(colDeck => {
                      const rate = matrix[rowDeck.id]?.[colDeck.id] ?? 50;
                      const isSelf = rowDeck.id === colDeck.id;
                      return (
                        <td key={colDeck.id} className="p-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg font-bold text-xs ${winRateColor(rate, isSelf)}`}>
                            {isSelf ? "—" : `${rate}%`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "detail" && (
        <div>
          {/* Deck Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {decks.map(deck => (
              <button
                key={deck.id}
                onClick={() => setSelected(deck.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  selected === deck.id
                    ? "border-[#f0c040]/50 bg-[#f0c040]/5"
                    : "border-white/10 bg-white/3 hover:border-white/20"
                }`}
              >
                <img
                  src={`/api/card-image?id=${deck.cardId}`}
                  alt={deck.name}
                  className="w-14 h-20 object-cover rounded-lg border border-white/10"
                />
                <div className="text-center">
                  <p className="text-white text-xs font-medium leading-tight">{deck.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-bold mt-1 inline-block ${tierColors[deck.tier]}`}>
                    {deck.tier}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Deck Detail */}
          {selectedDeck ? (
            <div className="space-y-6">
              {/* Deck Header */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-6">
                <img
                  src={`/api/card-image?id=${selectedDeck.cardId}`}
                  alt={selectedDeck.name}
                  className="w-24 h-32 object-cover rounded-xl border border-white/10 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{selectedDeck.name}</h2>
                    <span className={`px-2 py-1 rounded-lg border font-bold ${tierColors[selectedDeck.tier]}`}>
                      Tier {selectedDeck.tier}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mb-4">{selectedDeck.leader} · {selectedDeck.color} · {selectedDeck.style}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-[#f0c040]">{selectedDeck.winRate}%</div>
                      <div className="text-xs text-white/40">Win Rate</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-white">{selectedDeck.popularity}%</div>
                      <div className="text-xs text-white/40">Meta Share</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <div className={`text-2xl font-bold ${trendColor(selectedDeck.trend)}`}>
                        {trendIcon(selectedDeck.trend)}
                      </div>
                      <div className="text-xs text-white/40">7-Day Trend</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matchup Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Best Matchups */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
                  <h3 className="font-semibold text-green-400 mb-4">✅ Best Matchups</h3>
                  <div className="space-y-3">
                    {computeBest(selectedDeck.id, decks, matrix).map(opp => {
                      const rate = matrix[selectedDeck.id]?.[opp.id] ?? 50;
                      return (
                        <div key={opp.id} className="flex items-center gap-3">
                          <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name} className="w-8 h-11 object-cover rounded border border-white/10" />
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{opp.name}</p>
                            <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                              <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                          </div>
                          <span className="text-green-400 font-bold text-sm">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Worst Matchups */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                  <h3 className="font-semibold text-red-400 mb-4">❌ Worst Matchups</h3>
                  <div className="space-y-3">
                    {computeWorst(selectedDeck.id, decks, matrix).map(opp => {
                      const rate = matrix[selectedDeck.id]?.[opp.id] ?? 50;
                      return (
                        <div key={opp.id} className="flex items-center gap-3">
                          <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name} className="w-8 h-11 object-cover rounded border border-white/10" />
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{opp.name}</p>
                            <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                              <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                          </div>
                          <span className="text-red-400 font-bold text-sm">{rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Full Matchup Table for selected deck */}
              <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Full Matchup Breakdown — {selectedDeck.name}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="text-left p-4 font-medium">Opponent</th>
                      <th className="text-left p-4 font-medium hidden md:table-cell">Tier</th>
                      <th className="p-4 font-medium">Win Rate</th>
                      <th className="p-4 font-medium">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decks.filter(d => d.id !== selectedDeck.id)
                      .sort((a, b) => (matrix[selectedDeck.id]?.[b.id] ?? 50) - (matrix[selectedDeck.id]?.[a.id] ?? 50))
                      .map(opp => {
                        const rate = matrix[selectedDeck.id]?.[opp.id] ?? 50;
                        const verdict = rate >= 55 ? "Favored" : rate >= 50 ? "Slight edge" : rate >= 45 ? "Even" : rate >= 40 ? "Tough" : "Very tough";
                        const verdictColor = rate >= 55 ? "text-green-400" : rate >= 50 ? "text-blue-400" : rate >= 45 ? "text-white/50" : rate >= 40 ? "text-orange-400" : "text-red-400";
                        return (
                          <tr key={opp.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img src={`/api/card-image?id=${opp.cardId}`} alt={opp.name} className="w-8 h-11 object-cover rounded border border-white/10" />
                                <div>
                                  <p className="text-white font-medium">{opp.name}</p>
                                  <p className="text-white/40 text-xs">{opp.color}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                              <span className={`px-2 py-0.5 rounded border text-xs font-bold ${tierColors[opp.tier]}`}>{opp.tier}</span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 bg-white/10 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${rate >= 50 ? "bg-green-400" : "bg-red-400"}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className={`font-bold text-sm ${rate >= 50 ? "text-green-400" : "text-red-400"}`}>
                                  {rate}%
                                </span>
                              </div>
                            </td>
                            <td className={`p-4 text-center font-medium text-sm ${verdictColor}`}>{verdict}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-white/30">
              <p className="text-4xl mb-3">⚔️</p>
              <p>Select a deck above to see its full matchup breakdown</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

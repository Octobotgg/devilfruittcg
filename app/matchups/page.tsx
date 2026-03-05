"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  META_DECKS,
  TIER_COLORS, TREND_ICONS, TREND_COLORS, type MetaDeck,
} from "@/lib/meta-decks";
import CardModal, { type CardModalData } from "@/components/CardModal";

function getWinRateColor(rate: number) {
  if (rate >= 60) return "bg-green-500 text-white";
  if (rate >= 55) return "bg-green-300 text-black";
  if (rate >= 45) return "bg-white/20 text-white";
  if (rate >= 40) return "bg-orange-300 text-black";
  return "bg-red-500 text-white";
}

function getWinRateLabel(rate: number) {
  if (rate >= 60) return "Strong Favored";
  if (rate >= 55) return "Favored";
  if (rate >= 45) return "Even-ish";
  if (rate >= 40) return "Unfavored";
  return "Tough Matchup";
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "▲" || trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === "▼" || trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
}

function shortDeckName(name: string): string {
  const clean = name.replace(/\s*\([A-Z0-9-]+\)\s*$/i, "").trim();
  const parts = clean.split(/\s+/);
  return parts.slice(0, 2).join(" ");
}

export default function MatchupsPage() {
  const [decks, setDecks] = useState<MetaDeck[]>(META_DECKS);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [view, setView] = useState<"matrix" | "tier" | "detail">("tier");
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("Seeded dataset");
  const [sampleGames, setSampleGames] = useState<number>(0);
  const [matchupSet, setMatchupSet] = useState<string>("OP12");
  const [matchupTime, setMatchupTime] = useState<string>("3months");
  const [deckLimit, setDeckLimit] = useState<number>(18);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [allLeaders, setAllLeaders] = useState<Array<{ id: string; name: string; setCode: string; color: string }>>([]);
  const [lookupLeaderCardId, setLookupLeaderCardId] = useState<string>("");
  const [lookupOpponentCardId, setLookupOpponentCardId] = useState<string>("");
  const [leaderAQuery, setLeaderAQuery] = useState<string>("");
  const [leaderBQuery, setLeaderBQuery] = useState<string>("");

  const [lookupRate, setLookupRate] = useState<number | null>(null);
  const [reverseRate, setReverseRate] = useState<number | null>(null);
  const [lookupMatches, setLookupMatches] = useState<number | null>(null);
  const [reverseMatches, setReverseMatches] = useState<number | null>(null);
  const [activeIndexA, setActiveIndexA] = useState<number>(0);
  const [activeIndexB, setActiveIndexB] = useState<number>(0);
  const [matrixFilter, setMatrixFilter] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("matchups_matrix_filter");
      if (saved) setMatrixFilter(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("matchups_matrix_filter", matrixFilter);
    } catch {
      // ignore
    }
  }, [matrixFilter]);

  const selectedDeck = selectedDeckId ? decks.find((d) => d.id === selectedDeckId) ?? null : null;
  const hasLargeSample = sampleGames >= 1000;

  useEffect(() => {
    const loadLeaders = async () => {
      try {
        const res = await fetch('/api/leaders');
        if (!res.ok) return;
        const json = await res.json();
        const leaders = Array.isArray(json?.leaders) ? json.leaders : [];
        setAllLeaders(leaders);
        if (leaders.length) {
          if (!lookupLeaderCardId) setLookupLeaderCardId(leaders[0].id);
          if (!lookupOpponentCardId) setLookupOpponentCardId(leaders[1]?.id || leaders[0].id);
        }
      } catch {
        // silent
      }
    };
    loadLeaders();
  }, []);

  useEffect(() => {
    if (lookupLeaderCardId && !leaderAQuery) setLeaderAQuery(labelForLeader(lookupLeaderCardId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupLeaderCardId, allLeaders.length]);

  useEffect(() => {
    if (lookupOpponentCardId && !leaderBQuery) setLeaderBQuery(labelForLeader(lookupOpponentCardId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupOpponentCardId, allLeaders.length]);

  const labelForLeader = (id: string) => {
    const l = allLeaders.find((x) => x.id === id);
    return l ? `${l.name} (${l.id})` : id;
  };

  const selectLeader = (slot: "a" | "b", id: string) => {
    if (slot === "a") {
      setLookupLeaderCardId(id);
      setLeaderAQuery(labelForLeader(id));
    } else {
      setLookupOpponentCardId(id);
      setLeaderBQuery(labelForLeader(id));
    }
  };

  const fuzzyScore = (query: string, value: string) => {
    const q = query.trim().toLowerCase();
    const v = value.toLowerCase();
    if (!q) return 1;
    if (v === q) return 100;
    if (v.startsWith(q)) return 80;
    if (v.includes(q)) return 60;
    // lightweight subsequence match
    let qi = 0;
    for (let i = 0; i < v.length && qi < q.length; i++) if (v[i] === q[qi]) qi++;
    return qi === q.length ? 40 : 0;
  };

  const rankLeaders = (query: string, items: Array<{ id: string; name: string; setCode: string; color: string }>) =>
    items
      .map((d) => ({ d, s: Math.max(fuzzyScore(query, d.name), fuzzyScore(query, d.id)) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.d.id.localeCompare(b.d.id))
      .map((x) => x.d)
      .slice(0, 8);

  const filteredLeadersA = rankLeaders(leaderAQuery, allLeaders);

  const filteredLeadersB = rankLeaders(
    leaderBQuery,
    allLeaders.filter((d) => d.id !== lookupLeaderCardId)
  );

  const lookupLeaderMeta = decks.find((d) => d.cardId === lookupLeaderCardId) || null;
  const lookupOpponentMeta = decks.find((d) => d.cardId === lookupOpponentCardId) || null;
  const lookupLeaderDeck = lookupLeaderMeta ? decks.find((d) => d.id === lookupLeaderMeta.id) || null : null;
  const lookupOpponentDeck = lookupOpponentMeta ? decks.find((d) => d.id === lookupOpponentMeta.id) || null : null;

  useEffect(() => {
    const run = async () => {
      if (!lookupLeaderCardId || !lookupOpponentCardId || lookupLeaderCardId === lookupOpponentCardId) {
        setLookupRate(null);
        setReverseRate(null);
        setLookupMatches(null);
        setReverseMatches(null);
        return;
      }

      if (lookupLeaderDeck && lookupOpponentDeck) {
        setLookupRate(lookupLeaderDeck.matchups[lookupOpponentDeck.id] ?? 50);
        setReverseRate(lookupOpponentDeck.matchups[lookupLeaderDeck.id] ?? 50);
        setLookupMatches(null);
        setReverseMatches(null);
        return;
      }

      try {
        setLookupLoading(true);
        const p = new URLSearchParams({ leader: lookupLeaderCardId, opponent: lookupOpponentCardId, set: matchupSet, time: matchupTime });
        const res = await fetch(`/api/matchups/headtohead?${p.toString()}`);
        const json = await res.json();
        setLookupRate(typeof json?.winRate === 'number' ? json.winRate : null);
        setReverseRate(typeof json?.reverseWinRate === 'number' ? json.reverseWinRate : null);
        setLookupMatches(typeof json?.matches === 'number' ? json.matches : null);
        setReverseMatches(typeof json?.reverseMatches === 'number' ? json.reverseMatches : null);
      } catch {
        setLookupRate(null);
        setReverseRate(null);
        setLookupMatches(null);
        setReverseMatches(null);
      } finally {
        setLookupLoading(false);
      }
    };
    run();
  }, [lookupLeaderCardId, lookupOpponentCardId, matchupSet, matchupTime, lookupLeaderDeck, lookupOpponentDeck]);

  const matrixDecks = decks.filter((d) =>
    d.name.toLowerCase().includes(matrixFilter.toLowerCase()) ||
    d.cardId.toLowerCase().includes(matrixFilter.toLowerCase())
  );

  const topDeck = decks.reduce((best, deck) => (
    !best || deck.metaShare > best.metaShare ? deck : best
  ), null as MetaDeck | null);

  const strongestEdge = decks
    .flatMap((rowDeck) => decks
      .filter((colDeck) => colDeck.id !== rowDeck.id)
      .map((colDeck) => ({
        attacker: rowDeck,
        defender: colDeck,
        rate: rowDeck.matchups[colDeck.id] ?? 50,
      })))
    .sort((a, b) => b.rate - a.rate)[0];

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams({ set: matchupSet, time: matchupTime, limit: String(deckLimit) });
        const res = await fetch(`/api/matchups?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.decks) && json.decks.length) {
          setDecks(json.decks);
          if (json.source) {
            const raw = String(json.source).toLowerCase();
            setSourceLabel(raw.includes("seeded") ? "Seeded dataset" : "Tournament aggregate");
          }
          if (typeof json.sampleGames === "number") setSampleGames(json.sampleGames);
          setLastSuccessAt(new Date().toISOString());
        }
      } catch {
        // fallback silently
      }
    };
    run();
  }, [matchupSet, matchupTime, deckLimit]);

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
        <p className="text-white/40 text-lg">Matchup analysis · Click any deck for full breakdown</p>
        <p className="text-xs text-white/30 mt-2">Source: {sourceLabel}{sampleGames ? ` · ${sampleGames.toLocaleString()} logged games` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-white/40 mb-1">Matchup Format</label>
            <select
              value={matchupSet}
              onChange={(e) => setMatchupSet(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            >
              {['OP14','OP13','OP12','OP11','OP10','OP09','OP08'].map((s) => (
                <option key={s} value={s} className="bg-[#0f172a]">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Window</label>
            <select
              value={matchupTime}
              onChange={(e) => setMatchupTime(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="1month" className="bg-[#0f172a]">Past month</option>
              <option value="3months" className="bg-[#0f172a]">Past 3 months</option>
              <option value="6months" className="bg-[#0f172a]">Past 6 months</option>
              <option value="12months" className="bg-[#0f172a]">Past 12 months</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Deck depth</label>
            <select
              value={String(deckLimit)}
              onChange={(e) => setDeckLimit(Number(e.target.value))}
              className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            >
              {[12, 18, 24, 30].map((n) => (
                <option key={n} value={n} className="bg-[#0f172a]">Top {n}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-white/40 pb-1">
            Last successful fetch: {lastSuccessAt ? new Date(lastSuccessAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      </motion.div>

      {!hasLargeSample && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"
        >
          <p className="text-amber-200 text-sm font-semibold">
            Limited sample warning: matchup matrix is currently based on a low sample size.
            Use as directional guidance until large public-volume ingestion is active.
          </p>
        </motion.div>
      )}

      {/* Command Brief */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="relative overflow-hidden rounded-3xl border border-[#F0C040]/25 bg-gradient-to-br from-[#1a1325]/90 via-[#111a2e]/90 to-[#221212]/90 p-5 md:p-6"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(240,192,64,0.15),transparent_45%),radial-gradient(circle_at_90%_75%,rgba(220,38,38,0.18),transparent_48%)]" />
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-white/40">Flagship deck</p>
            <p className="mt-2 text-lg font-black text-white">{topDeck?.name ?? "—"}</p>
            <p className="text-sm text-[#F0C040]">{topDeck?.metaShare ?? 0}% meta share</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-white/40">Hardest punish</p>
            <p className="mt-2 text-lg font-black text-white truncate">
              {strongestEdge ? `${shortDeckName(strongestEdge.attacker.name)} → ${shortDeckName(strongestEdge.defender.name)}` : "—"}
            </p>
            <p className="text-sm text-green-300">{strongestEdge ? `${strongestEdge.rate}% projected win` : "No edge data"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] tracking-[0.18em] uppercase text-white/40">Data confidence</p>
            <p className="mt-2 text-lg font-black text-white">{sampleGames ? sampleGames.toLocaleString() : "Seeded"}</p>
            <p className="text-sm text-white/50">{sampleGames ? "Logged cross-match games" : "Awaiting live game logs"}</p>
          </div>
        </div>
      </motion.div>

      {/* Leader lookup */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4">
        <h3 className="text-white font-black">Leader Matchup Finder</h3>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <input
              value={leaderAQuery}
              onChange={(e) => { setLeaderAQuery(e.target.value); setActiveIndexA(0); }}
              onKeyDown={(e) => {
                if (!filteredLeadersA.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndexA((i) => (i + 1) % filteredLeadersA.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndexA((i) => (i - 1 + filteredLeadersA.length) % filteredLeadersA.length); }
                if (e.key === "Enter") { e.preventDefault(); selectLeader("a", filteredLeadersA[activeIndexA]?.id || filteredLeadersA[0].id); }
              }}
              placeholder="Leader A (type name or ID)"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            />
            {leaderAQuery.trim().length >= 2 && filteredLeadersA.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/15 bg-[#0f172a] max-h-64 overflow-y-auto">
                {filteredLeadersA.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => selectLeader("a", d.id)}
                    className={`w-full text-left px-3 py-2 text-sm text-white ${i === activeIndexA ? "bg-white/15" : "hover:bg-white/10"}`}
                  >
                    {d.name} <span className="text-white/40">({d.id})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <input
              value={leaderBQuery}
              onChange={(e) => { setLeaderBQuery(e.target.value); setActiveIndexB(0); }}
              onKeyDown={(e) => {
                if (!filteredLeadersB.length) return;
                if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndexB((i) => (i + 1) % filteredLeadersB.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndexB((i) => (i - 1 + filteredLeadersB.length) % filteredLeadersB.length); }
                if (e.key === "Enter") { e.preventDefault(); selectLeader("b", filteredLeadersB[activeIndexB]?.id || filteredLeadersB[0].id); }
              }}
              placeholder="Leader B / opponent"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            />
            {leaderBQuery.trim().length >= 2 && filteredLeadersB.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/15 bg-[#0f172a] max-h-64 overflow-y-auto">
                {filteredLeadersB.map((d, i) => (
                  <button
                    key={d.id}
                    onClick={() => selectLeader("b", d.id)}
                    className={`w-full text-left px-3 py-2 text-sm text-white ${i === activeIndexB ? "bg-white/15" : "hover:bg-white/10"}`}
                  >
                    {d.name} <span className="text-white/40">({d.id})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>


        {lookupLeaderCardId && lookupOpponentCardId && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white/70">{labelForLeader(lookupLeaderCardId)} vs {labelForLeader(lookupOpponentCardId)}</span>
            <span className={`px-2 py-1 rounded font-black ${getWinRateColor(lookupRate ?? 50)}`}>
              {lookupRate != null ? `${lookupRate}%` : (lookupLoading ? "Loading…" : "No data")}
            </span>
            <span className="text-white/40">reverse:</span>
            <span className={`px-2 py-1 rounded font-black ${getWinRateColor(reverseRate ?? 50)}`}>
              {reverseRate != null ? `${reverseRate}%` : (lookupLoading ? "Loading…" : "No data")}
            </span>
            <span className="px-2 py-1 rounded-md text-xs border border-white/20 text-white/70">
              Confidence: {(() => {
                const m = Math.min(lookupMatches ?? 0, reverseMatches ?? lookupMatches ?? 0);
                if (!m) return "Unknown";
                if (m >= 100) return "High";
                if (m >= 30) return "Medium";
                return "Low";
              })()}
            </span>
            {lookupMatches != null ? <span className="text-xs text-white/40">matches: {lookupMatches}</span> : null}
            {lookupLeaderMeta ? (
              <button
                onClick={() => { setSelectedDeckId(lookupLeaderMeta.id); setView("detail"); }}
                className="ml-auto px-3 py-1.5 rounded-lg bg-[#F0C040] text-black font-bold"
              >
                Open Full Leader Matrix
              </button>
            ) : null}
            <span className="text-xs text-white/40 w-full">Interpretation: 55% means Leader A wins about 55 out of 100 games against Leader B.</span>
          </div>
        )}
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
          { value: decks.length, label: "Meta Decks", color: "text-[#F0C040]" },
          { value: decks.filter(d => d.tier === "S").length, label: "S-Tier Decks", color: "text-yellow-400" },
          { value: decks.filter(d => d.tier === "A").length, label: "A-Tier Decks", color: "text-blue-400" },
          { value: decks.filter(d => d.tier === "B").length, label: "B-Tier Decks", color: "text-purple-400" },
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
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <input
                value={matrixFilter}
                onChange={(e) => setMatrixFilter(e.target.value)}
                placeholder="Filter matrix leaders (name or card ID)"
                className="w-full md:w-96 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => setMatrixFilter("")}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                Clear filter
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mb-5 text-xs">
              {[
                { color: "bg-green-500", label: "60%+ Strong Favored" },
                { color: "bg-green-300", label: "55-59% Favored" },
                { color: "bg-white/20", label: "45-54% Even-ish" },
                { color: "bg-orange-300", label: "40-44% Unfavored" },
                { color: "bg-red-500", label: "<40% Tough Matchup" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span className="text-white/40">{l.label}</span>
                </div>
              ))}
            </div>

            <div className="md:hidden space-y-2 mb-4">
              {matrixDecks.slice(0, 20).map((rowDeck) => (
                <motion.div layout key={`mobile-${rowDeck.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={`/api/card-image?id=${rowDeck.cardId}`} alt={rowDeck.name} className="w-8 h-11 rounded border border-white/10" />
                    <div className="text-sm font-semibold text-white truncate">{rowDeck.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {matrixDecks.filter((d) => d.id !== rowDeck.id).slice(0, 6).map((opp) => {
                      const rate = rowDeck.matchups[opp.id] ?? 50;
                      return (
                        <button
                          key={`${rowDeck.id}-${opp.id}`}
                          onClick={() => { setSelectedDeckId(rowDeck.id); setView("detail"); }}
                          className={`rounded-md px-2 py-1 text-xs font-bold ${getWinRateColor(rate)}`}
                          title={`${rowDeck.name} vs ${opp.name}: ${rate}%`}
                        >
                          {shortDeckName(opp.name)} {rate}%
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-3 text-left text-white/30 text-xs sticky top-0 left-0 bg-[#0a0f1e] z-30 min-w-[120px]">
                        Deck ↓ vs →
                      </th>
                      {matrixDecks.map((deck) => (
                        <th key={deck.id} className="p-2 min-w-[64px] sticky top-0 bg-[#0a0f1e] z-20">
                          <button onClick={() => { setSelectedDeckId(deck.id); setView("detail"); }}
                            className="flex flex-col items-center gap-1 group">
                            <img src={`/api/card-image?id=${deck.cardId}`} alt={deck.name}
                              onClick={e => { e.stopPropagation(); openDeckModal(deck); }}
                              className="w-10 h-14 object-cover rounded-lg border border-white/10 group-hover:border-[#F0C040]/50 transition-all group-hover:scale-105 cursor-zoom-in" />
                            <span className="text-[10px] text-white/30 truncate max-w-[70px]">{shortDeckName(deck.name)}</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixDecks.map((rowDeck, ri) => (
                      <motion.tr layout key={rowDeck.id} className="border-t border-white/5">
                        <td className="p-2 sticky left-0 bg-[#0a0f1e] z-10">
                          <button onClick={() => { setSelectedDeckId(rowDeck.id); setView("detail"); }}
                            className="flex items-center gap-2 group">
                            <img src={`/api/card-image?id=${rowDeck.cardId}`} alt={rowDeck.name}
                              className="w-8 h-11 object-cover rounded border border-white/10 group-hover:border-[#F0C040]/50 transition-all" />
                            <div className="text-left">
                              <div className="text-xs text-white font-semibold leading-tight">{shortDeckName(rowDeck.name)}</div>
                              <span className={`text-[10px] px-1 rounded border font-bold ${TIER_COLORS[rowDeck.tier]}`}>{rowDeck.tier}</span>
                            </div>
                          </button>
                        </td>
                        {matrixDecks.map((colDeck) => {
                          const rate = rowDeck.matchups[colDeck.id] ?? 50;
                          const isSelf = rowDeck.id === colDeck.id;
                          return (
                            <td key={colDeck.id} className="p-1">
                              {isSelf
                                ? <div className="w-full h-9 flex items-center justify-center text-white/10">—</div>
                                : <button onClick={() => { setSelectedDeckId(rowDeck.id); setView("detail"); }}
                                    title={`${rowDeck.name} vs ${colDeck.name}: ${rate}%`}
                                    className={`w-full h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:scale-110 hover:z-10 hover:shadow-lg ${getWinRateColor(rate)}`}>
                                    {rate}%
                                  </button>
                              }
                            </td>
                          );
                        })}
                      </motion.tr>
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
              const tierDecks = decks.filter(d => d.tier === tier);
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
                        onClick={() => { setSelectedDeckId(deck.id); setView("detail"); }}
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
                          <div className="text-3xl font-black text-white/20">#{decks.indexOf(deck) + 1}</div>
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
            <DeckDetail deck={selectedDeck} decks={decks} onBack={() => setView("matrix")} onImageClick={openDeckModal} />
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

function DeckDetail({ deck, decks, onBack, onImageClick }: { deck: MetaDeck; decks: MetaDeck[]; onBack: () => void; onImageClick: (d: MetaDeck) => void }) {
  const best = decks
    .filter((d) => d.id !== deck.id)
    .map((d) => ({ deck: d, winRate: deck.matchups[d.id] ?? 50 }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 3);

  const worst = decks
    .filter((d) => d.id !== deck.id)
    .map((d) => ({ deck: d, winRate: deck.matchups[d.id] ?? 50 }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);

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
          {decks.filter(d => d.id !== deck.id)
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

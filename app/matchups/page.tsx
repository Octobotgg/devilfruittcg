"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import DonButton from "@/components/ui/DonButton";
import LeaderColorTag from "@/components/ui/LeaderColorTag";
import LiveStatusStrip from "@/components/ui/LiveStatusStrip";
import {
  META_DECKS,
  TIER_COLORS, TREND_ICONS, TREND_COLORS, type MetaDeck,
} from "@/lib/meta-decks";
import CardModal, { type CardModalData } from "@/components/CardModal";

function getWinRateLabel(rate: number) {
  if (rate >= 60) return "Strong Favored";
  if (rate >= 55) return "Favored";
  if (rate >= 45) return "Even-ish";
  if (rate >= 40) return "Unfavored";
  return "Tough Matchup";
}

function getHeatCellClass(rate: number) {
  if (rate >= 60) return "bg-[#14532d] text-green-100 border border-green-400/35 shadow-[0_0_16px_rgba(34,197,94,0.35)]";
  if (rate >= 55) return "bg-[#166534] text-green-100 border border-green-300/30";
  if (rate >= 45) return "bg-[#1f2937] text-slate-100 border border-white/10";
  if (rate >= 40) return "bg-[#7c2d12] text-orange-100 border border-orange-300/30";
  return "bg-[#7f1d1d] text-red-100 border border-red-300/35 shadow-[0_0_16px_rgba(239,68,68,0.32)]";
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

function cleanDeckDescription(text?: string) {
  const t = (text || "")
    .replace(/Live aggregate from Limitless\s*\([^)]+\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return t || "Tournament matchup profile";
}

export default function MatchupsPage() {
  const [decks, setDecks] = useState<MetaDeck[]>(META_DECKS);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [view, setView] = useState<"matrix" | "tier" | "detail">("matrix");
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("Seeded dataset");
  const [sampleGames, setSampleGames] = useState<number>(0);
  const [matchupSet, setMatchupSet] = useState<string>("OP14");
  const [matchupTime, setMatchupTime] = useState<string>("1month");
  const [matchupPeriod, setMatchupPeriod] = useState<string>("west_p");
  const [deckLimit, setDeckLimit] = useState<number>(12);
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
  const [lookupFirstRate, setLookupFirstRate] = useState<number | null>(null);
  const [lookupSecondRate, setLookupSecondRate] = useState<number | null>(null);
  const [lookupFirstGames, setLookupFirstGames] = useState<number | null>(null);
  const [lookupSecondGames, setLookupSecondGames] = useState<number | null>(null);
  const [reverseFirstRate, setReverseFirstRate] = useState<number | null>(null);
  const [reverseSecondRate, setReverseSecondRate] = useState<number | null>(null);
  const [reverseFirstGames, setReverseFirstGames] = useState<number | null>(null);
  const [reverseSecondGames, setReverseSecondGames] = useState<number | null>(null);
  const [activeIndexA, setActiveIndexA] = useState<number>(0);
  const [activeIndexB, setActiveIndexB] = useState<number>(0);
  const [matrixFilter, setMatrixFilter] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);
  const [hoverColId, setHoverColId] = useState<string | null>(null);

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
      } catch {
        // silent
      }
    };
    loadLeaders();
  }, []);


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

  const leaderSideEdge =
    lookupFirstRate != null && lookupSecondRate != null
      ? Number((lookupFirstRate - lookupSecondRate).toFixed(2))
      : null;
  const opponentSideEdge =
    reverseFirstRate != null && reverseSecondRate != null
      ? Number((reverseFirstRate - reverseSecondRate).toFixed(2))
      : null;

  useEffect(() => {
    let cancelled = false;

    const applyLocalFallback = () => {
      if (lookupLeaderDeck && lookupOpponentDeck) {
        setLookupRate(lookupLeaderDeck.matchups[lookupOpponentDeck.id] ?? 50);
        setReverseRate(lookupOpponentDeck.matchups[lookupLeaderDeck.id] ?? 50);
      } else {
        setLookupRate(null);
        setReverseRate(null);
      }

      setLookupMatches(null);
      setReverseMatches(null);
      setLookupFirstRate(null);
      setLookupSecondRate(null);
      setLookupFirstGames(null);
      setLookupSecondGames(null);
      setReverseFirstRate(null);
      setReverseSecondRate(null);
      setReverseFirstGames(null);
      setReverseSecondGames(null);
    };

    const run = async () => {
      if (!lookupLeaderCardId || !lookupOpponentCardId || lookupLeaderCardId === lookupOpponentCardId) {
        setLookupRate(null);
        setReverseRate(null);
        setLookupMatches(null);
        setReverseMatches(null);
        setLookupFirstRate(null);
        setLookupSecondRate(null);
        setLookupFirstGames(null);
        setLookupSecondGames(null);
        setReverseFirstRate(null);
        setReverseSecondRate(null);
        setReverseFirstGames(null);
        setReverseSecondGames(null);
        return;
      }

      try {
        setLookupLoading(true);
        const p = new URLSearchParams({
          leader: lookupLeaderCardId,
          opponent: lookupOpponentCardId,
          set: matchupSet,
          time: matchupTime,
          period: matchupPeriod,
        });
        const res = await fetch(`/api/matchups/headtohead?${p.toString()}`);
        const json = await res.json();

        if (cancelled) return;

        const hasDirectionalData = typeof json?.winRate === "number" || typeof json?.reverseWinRate === "number";
        if (hasDirectionalData) {
          setLookupRate(typeof json?.winRate === "number" ? json.winRate : null);
          setReverseRate(typeof json?.reverseWinRate === "number" ? json.reverseWinRate : null);
          setLookupMatches(typeof json?.matches === "number" ? json.matches : null);
          setReverseMatches(typeof json?.reverseMatches === "number" ? json.reverseMatches : null);

          setLookupFirstRate(typeof json?.firstWinRate === "number" ? json.firstWinRate : null);
          setLookupSecondRate(typeof json?.secondWinRate === "number" ? json.secondWinRate : null);
          setLookupFirstGames(typeof json?.firstGames === "number" ? json.firstGames : null);
          setLookupSecondGames(typeof json?.secondGames === "number" ? json.secondGames : null);

          setReverseFirstRate(typeof json?.reverseFirstWinRate === "number" ? json.reverseFirstWinRate : null);
          setReverseSecondRate(typeof json?.reverseSecondWinRate === "number" ? json.reverseSecondWinRate : null);
          setReverseFirstGames(typeof json?.reverseFirstGames === "number" ? json.reverseFirstGames : null);
          setReverseSecondGames(typeof json?.reverseSecondGames === "number" ? json.reverseSecondGames : null);
        } else {
          applyLocalFallback();
        }
      } catch {
        if (!cancelled) applyLocalFallback();
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lookupLeaderCardId, lookupOpponentCardId, matchupSet, matchupTime, matchupPeriod, lookupLeaderDeck, lookupOpponentDeck]);

  const matrixDecks = decks.filter((d) =>
    d.name.toLowerCase().includes(matrixFilter.toLowerCase()) ||
    d.cardId.toLowerCase().includes(matrixFilter.toLowerCase())
  );

  const topDeck = decks.reduce((best, deck) => (
    !best || deck.metaShare > best.metaShare ? deck : best
  ), null as MetaDeck | null);

  useEffect(() => {
    const [c] = parseLeaderColors(topDeck?.color);
    setThemeByLeaderColor(c);
  }, [topDeck]);

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
        const params = new URLSearchParams({
          set: matchupSet,
          time: matchupTime,
          period: matchupPeriod,
          limit: String(deckLimit),
        });
        const res = await fetch(`/api/matchups?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.decks) && json.decks.length) {
          setDecks(json.decks);
          if (json.source) {
            const raw = String(json.source).toLowerCase();
            if (raw.includes("bridge")) setSourceLabel("External snapshot bridge");
            else if (raw.includes("match-intel-v2")) setSourceLabel("Match Intel V2");
            else if (raw.includes("seeded")) setSourceLabel("Seeded dataset");
            else setSourceLabel("Tournament aggregate");
          }
          if (typeof json.sampleGames === "number") setSampleGames(json.sampleGames);
          setLastSuccessAt(new Date().toISOString());
        }
      } catch {
        // fallback silently
      }
    };
    run();
  }, [matchupSet, matchupTime, matchupPeriod, deckLimit]);

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
            <label className="block text-xs text-white/40 mb-1">Data Period</label>
            <select
              value={matchupPeriod}
              onChange={(e) => setMatchupPeriod(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="west_p" className="bg-[#0f172a]">West (Private)</option>
              <option value="east_p" className="bg-[#0f172a]">East (Private)</option>
              <option value="west" className="bg-[#0f172a]">West (All)</option>
              <option value="east" className="bg-[#0f172a]">East (All)</option>
              <option value="lw_p" className="bg-[#0f172a]">Last Week (Private)</option>
              <option value="lw" className="bg-[#0f172a]">Last Week (All)</option>
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

      <LiveStatusStrip
        updatedAt={lastSuccessAt || new Date().toISOString()}
        sourceLabel={sourceLabel}
        sampleGames={sampleGames}
        formatLabel={`${matchupSet} · ${matchupPeriod.toUpperCase()}`}
      />

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
        <p className="text-xs text-white/55">
          Pick any two leaders to run your own head-to-head test. Powered by {sourceLabel} ({matchupPeriod.toUpperCase()}).
        </p>

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
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 pr-14 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => { setLeaderAQuery(""); setLookupLeaderCardId(""); setActiveIndexA(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/70 hover:text-white"
            >
              Clear
            </button>
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
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 pr-14 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => { setLeaderBQuery(""); setLookupOpponentCardId(""); setActiveIndexB(0); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/70 hover:text-white"
            >
              Clear
            </button>
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
          <div className="relative overflow-hidden rounded-2xl border border-[var(--theme-ring)] bg-black/30 p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.12),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(239,68,68,0.12),transparent_45%)]" />
            <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex items-center gap-3">
                <img src={`/api/card-image?id=${lookupLeaderCardId}`} alt={labelForLeader(lookupLeaderCardId)} className="h-20 w-14 rounded-lg border border-white/15" />
                <div>
                  <p className="text-sm font-bold text-white">{labelForLeader(lookupLeaderCardId)}</p>
                  <p className="text-xs text-white/50">Leader A</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--theme-accent-2)]">Clash</p>
                <p className="text-3xl font-black text-[var(--theme-accent-2)] drop-shadow-[0_0_16px_rgba(250,204,21,0.55)]">⚡</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <motion.span
                    key={`a-${lookupRate}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-md px-2 py-1 text-xs font-black ${getHeatCellClass(lookupRate ?? 50)}`}
                  >
                    {lookupRate != null ? `${lookupRate}%` : (lookupLoading ? "Loading…" : "No data")}
                  </motion.span>
                  <span className="text-white/35">vs</span>
                  <motion.span
                    key={`b-${reverseRate}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-md px-2 py-1 text-xs font-black ${getHeatCellClass(reverseRate ?? 50)}`}
                  >
                    {reverseRate != null ? `${reverseRate}%` : (lookupLoading ? "Loading…" : "No data")}
                  </motion.span>
                </div>
                <div className="mx-auto mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-green-400 to-red-400" style={{ width: `${Math.max(0, Math.min(100, lookupRate ?? 50))}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-start gap-3 md:justify-end">
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{labelForLeader(lookupOpponentCardId)}</p>
                  <p className="text-xs text-white/50">Leader B</p>
                </div>
                <img src={`/api/card-image?id=${lookupOpponentCardId}`} alt={labelForLeader(lookupOpponentCardId)} className="h-20 w-14 rounded-lg border border-white/15" />
              </div>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/20 px-2 py-1 text-white/75">
                  Confidence: {(() => {
                    const m = Math.min(lookupMatches ?? 0, reverseMatches ?? lookupMatches ?? 0);
                    if (!m) return "Unknown";
                    if (m >= 100) return "High";
                    if (m >= 30) return "Medium";
                    return "Low";
                  })()}
                </span>
                {lookupMatches != null ? <span className="text-white/45">matches: {lookupMatches}</span> : null}
                {lookupFirstGames != null || lookupSecondGames != null ? (
                  <span className="text-white/45">
                    side sample: {(lookupFirstGames ?? 0).toLocaleString()} first · {(lookupSecondGames ?? 0).toLocaleString()} second
                  </span>
                ) : null}
                {lookupLeaderMeta ? (
                  <div className="ml-auto">
                    <DonButton onClick={() => { setSelectedDeckId(lookupLeaderMeta.id); setView("detail"); }}>
                      Open Full Leader Matrix
                    </DonButton>
                  </div>
                ) : null}
              </div>

              {(lookupFirstRate != null || lookupSecondRate != null || reverseFirstRate != null || reverseSecondRate != null) && (
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{labelForLeader(lookupLeaderCardId)} side split</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Going First</p>
                        <p className={`mt-0.5 text-sm font-black ${getHeatCellClass(lookupFirstRate ?? 50)} inline-block px-1.5 py-0.5 rounded`}>
                          {lookupFirstRate != null ? `${lookupFirstRate.toFixed(2)}%` : "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-white/45">{lookupFirstGames != null ? `${lookupFirstGames.toLocaleString()} games` : "—"}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Going Second</p>
                        <p className={`mt-0.5 text-sm font-black ${getHeatCellClass(lookupSecondRate ?? 50)} inline-block px-1.5 py-0.5 rounded`}>
                          {lookupSecondRate != null ? `${lookupSecondRate.toFixed(2)}%` : "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-white/45">{lookupSecondGames != null ? `${lookupSecondGames.toLocaleString()} games` : "—"}</p>
                      </div>
                    </div>
                    {leaderSideEdge != null ? (
                      <p className="mt-2 text-[11px] text-white/65">
                        Side edge: <span className={leaderSideEdge >= 0 ? "text-emerald-300" : "text-orange-300"}>{leaderSideEdge >= 0 ? `+${leaderSideEdge}` : leaderSideEdge}pp</span> {leaderSideEdge >= 0 ? "when going first" : "when going second"}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">{labelForLeader(lookupOpponentCardId)} side split</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Going First</p>
                        <p className={`mt-0.5 text-sm font-black ${getHeatCellClass(reverseFirstRate ?? 50)} inline-block px-1.5 py-0.5 rounded`}>
                          {reverseFirstRate != null ? `${reverseFirstRate.toFixed(2)}%` : "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-white/45">{reverseFirstGames != null ? `${reverseFirstGames.toLocaleString()} games` : "—"}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
                        <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Going Second</p>
                        <p className={`mt-0.5 text-sm font-black ${getHeatCellClass(reverseSecondRate ?? 50)} inline-block px-1.5 py-0.5 rounded`}>
                          {reverseSecondRate != null ? `${reverseSecondRate.toFixed(2)}%` : "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-white/45">{reverseSecondGames != null ? `${reverseSecondGames.toLocaleString()} games` : "—"}</p>
                      </div>
                    </div>
                    {opponentSideEdge != null ? (
                      <p className="mt-2 text-[11px] text-white/65">
                        Side edge: <span className={opponentSideEdge >= 0 ? "text-emerald-300" : "text-orange-300"}>{opponentSideEdge >= 0 ? `+${opponentSideEdge}` : opponentSideEdge}pp</span> {opponentSideEdge >= 0 ? "when going first" : "when going second"}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
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
                { color: "bg-[#14532d]", label: "60%+ Strong Favored" },
                { color: "bg-[#166534]", label: "55-59% Favored" },
                { color: "bg-[#1f2937]", label: "45-54% Even-ish" },
                { color: "bg-[#7c2d12]", label: "40-44% Unfavored" },
                { color: "bg-[#7f1d1d]", label: "<40% Tough Matchup" },
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
                          className={`rounded-md px-2 py-1 text-xs font-bold ${getHeatCellClass(rate)}`}
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
                        <th key={deck.id} className={`p-2 min-w-[64px] sticky top-0 z-20 ${hoverColId === deck.id ? "bg-[#121b2f]" : "bg-[#0a0f1e]"}`}>
                          <button onClick={() => { setSelectedDeckId(deck.id); setView("detail"); }}
                            onMouseEnter={() => { setHoverColId(deck.id); setHoverRowId(null); }}
                            onMouseLeave={() => { setHoverColId(null); setHoverRowId(null); }}
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
                        <td className={`p-2 sticky left-0 z-10 ${hoverRowId === rowDeck.id ? "bg-[#121b2f]" : "bg-[#0a0f1e]"}`}>
                          <button onClick={() => { setSelectedDeckId(rowDeck.id); setView("detail"); }}
                            onMouseEnter={() => { setHoverRowId(rowDeck.id); setHoverColId(null); }}
                            onMouseLeave={() => { setHoverRowId(null); setHoverColId(null); }}
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
                                    className={`w-full h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:scale-110 hover:z-10 ${getHeatCellClass(rate)} ${(hoverRowId === rowDeck.id || hoverColId === colDeck.id) ? "ring-1 ring-[var(--theme-accent-2)]" : ""}`}
                                    onMouseEnter={() => { setHoverRowId(rowDeck.id); setHoverColId(colDeck.id); }}
                                    onMouseLeave={() => { setHoverRowId(null); setHoverColId(null); }}>
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
                          <p className="text-white/40 text-sm truncate">{cleanDeckDescription(deck.description)}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <LeaderColorTag colorLabel={deck.color} />
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
            <p className="text-white/40 mb-6 text-base">{cleanDeckDescription(deck.description)}</p>
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

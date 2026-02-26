"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, TrendingUp, TrendingDown, Minus, Activity, Globe, Database } from "lucide-react";
import { getSeededMeta, type MetaSnapshot } from "@/lib/data/meta";

const tierConfig: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  S: { bg: "bg-[#F0C040]/10", text: "text-[#F0C040]", border: "border-[#F0C040]/30", glow: "shadow-[#F0C040]/20" },
  A: { bg: "bg-blue-500/10",  text: "text-blue-400",  border: "border-blue-500/30",  glow: "shadow-blue-500/20"  },
  B: { bg: "bg-purple-500/10",text: "text-purple-400",border: "border-purple-500/30",glow: "shadow-purple-500/20"},
  C: { bg: "bg-white/5",      text: "text-white/50",  border: "border-white/15",     glow: ""                   },
};

function barColor(win: number) {
  if (win >= 56) return "bg-green-400";
  if (win >= 52) return "bg-blue-400";
  if (win >= 48) return "bg-orange-400";
  return "bg-red-400";
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "▲") return <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><TrendingUp className="w-3 h-3" />Rising</span>;
  if (trend === "▼") return <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown className="w-3 h-3" />Falling</span>;
  return <span className="flex items-center gap-1 text-white/30 text-xs font-bold"><Minus className="w-3 h-3" />Steady</span>;
}

export default function MetaPage() {
  const [meta, setMeta] = useState<MetaSnapshot>(getSeededMeta());
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "fallback">("idle");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("loading");
        const res = await fetch("/api/meta");
        if (!res.ok) throw new Error();
        setMeta(await res.json());
        setStatus("live");
      } catch {
        setStatus("fallback");
        setMeta(getSeededMeta());
      }
    };
    run();
  }, []);

  const decks = meta.metaDecks;
  const isSeeded = String(meta.source).toLowerCase().includes("seeded");

  return (
    <div className="space-y-10 pb-24 md:pb-0">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <Crown className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold tracking-wider uppercase">Tournament Meta</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            status === "live"    ? "border-green-400/40 text-green-400 bg-green-400/10" :
            status === "loading" ? "border-white/20 text-white/50 bg-white/5 animate-pulse" :
                                   "border-orange-400/40 text-orange-400 bg-orange-400/10"
          }`}>
            {status === "live" ? (isSeeded ? "● Seeded" : "● Live Aggregate") : status === "loading" ? "Loading..." : "● Seeded"}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
          Meta <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#F0C040]">Snapshot</span>
        </h1>
        <p className="text-white/40 text-lg">{isSeeded ? "Seeded meta snapshot" : "Top decks from public aggregate tournaments"} · Updated {new Date(meta.updatedAt).toLocaleDateString()}</p>
      </motion.div>

      {/* Top 3 spotlight */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Top Deck",     deck: decks[0], icon: "👑" },
          { label: "Rising Threat",deck: decks[1], icon: "📈" },
          { label: "Watch Out",    deck: decks[3], icon: "⚠️" },
        ].map((item, i) => (
          <div key={i} className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 overflow-hidden group hover:border-white/20 transition-all">
            <div className="absolute top-0 right-0 text-6xl opacity-10 p-4">{item.icon}</div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{item.label}</p>
            <p className="text-white text-xl font-black mb-1">{item.deck?.name ?? "—"}</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[#F0C040] font-bold">{item.deck?.winRate ?? "—"}% WR</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40">{item.deck?.popularity ?? "—"}% field</span>
            </div>
            {item.deck && <div className="mt-3"><TrendBadge trend={item.deck.trend} /></div>}
          </div>
        ))}
      </motion.div>

      {/* Tier Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-black text-white">Current Tier List</h2>
          <span className="text-xs text-white/30 font-mono">{isSeeded ? "Seeded dataset" : "Public aggregate"} · {new Date(meta.updatedAt).toLocaleString()}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-wider">
                <th className="text-left p-4 font-medium">Rank</th>
                <th className="text-left p-4 font-medium">Deck</th>
                <th className="text-left p-4 font-medium">Tier</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Color</th>
                <th className="text-right p-4 font-medium hidden md:table-cell">Win Rate</th>
                <th className="text-right p-4 font-medium">Field %</th>
                <th className="text-right p-4 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck, i) => {
                const t = tierConfig[deck.tier] ?? tierConfig.C;
                return (
                  <motion.tr key={deck.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/30 font-mono text-sm">#{deck.rank}</td>
                    <td className="p-4 text-white font-bold">{deck.name}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border shadow-lg ${t.bg} ${t.text} ${t.border} ${t.glow}`}>
                        {deck.tier}
                      </span>
                    </td>
                    <td className="p-4 text-white/40 hidden md:table-cell">{deck.color}</td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                          <motion.div className={`h-2 rounded-full ${barColor(deck.winRate)}`}
                            initial={{ width: 0 }} animate={{ width: `${deck.winRate}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }} />
                        </div>
                        <span className="text-white font-bold text-sm w-12 text-right">{deck.winRate}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-white/60">{deck.popularity}%</td>
                    <td className="p-4 text-right"><TrendBadge trend={deck.trend} /></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Bottom row */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region split */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#F0C040]" />
            <h3 className="text-white font-bold">Region Split</h3>
          </div>
          <div className="space-y-3">
            {meta.regions.map((r, i) => (
              <div key={r.region}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{r.region}</span>
                  <span className="text-white/40">{r.events} events · {r.players} players</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <motion.div className="bg-[#F0C040] h-1.5 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.players / 900) * 100)}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data plan */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-bold">Data Sources</h3>
          </div>
          <ul className="space-y-2 text-sm text-white/50">
            {(isSeeded
              ? [
                  "Seeded fallback dataset (internal)",
                  "Public aggregate source unavailable at fetch time",
                  "Auto-refresh retries every cache cycle",
                ]
              : [
                  "Public aggregate leaderboard",
                  "Public matchup + deck sample ingestion",
                  "Scheduled refresh with cache revalidation",
                ]
            ).map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#F0C040] mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Status */}
        <div className="bg-[#F0C040]/5 border border-[#F0C040]/20 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#F0C040]" />
            <h3 className="text-[#F0C040] font-bold">Live Feed Status</h3>
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            {isSeeded ? (
              <>
                Running on seeded fallback right now. Live aggregate source will auto-resume when fetch succeeds via <code className="text-[#F0C040] text-xs bg-[#F0C040]/10 px-1 py-0.5 rounded">/api/meta</code>.
              </>
            ) : (
              <>
                Live public aggregate is active via <code className="text-[#F0C040] text-xs bg-[#F0C040]/10 px-1 py-0.5 rounded">/api/meta</code>. Snapshot reflects current upstream sample.
              </>
            )}
          </p>
        </div>
      </motion.div>

      {/* Mobile one-thumb utility bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-[#0c1324]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="h-11 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold"
            >
              Back to Top
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-11 rounded-xl bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black text-sm font-bold"
            >
              Refresh Meta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

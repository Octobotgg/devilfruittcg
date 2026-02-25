"use client";

import { useEffect, useState } from "react";
import { getSeededMeta, type MetaSnapshot } from "@/lib/data/meta";

const tierColors: Record<string, string> = {
  S: "bg-[#f0c040]/20 text-[#f0c040] border-[#f0c040]/30",
  A: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  B: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  C: "bg-white/10 text-white/50 border-white/20",
};

const trendColor = (t: string) => (t === "▲" ? "text-green-400" : t === "▼" ? "text-red-400" : "text-white/30");

function barColor(win: number) {
  if (win >= 56) return "bg-green-400";
  if (win >= 52) return "bg-blue-400";
  if (win >= 48) return "bg-orange-400";
  return "bg-red-400";
}

export default function MetaPage() {
  const [meta, setMeta] = useState<MetaSnapshot>(getSeededMeta());
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "fallback">("idle");

  useEffect(() => {
    const run = async () => {
      try {
        setStatus("loading");
        const res = await fetch("/api/meta", { next: { revalidate: 300 } });
        if (!res.ok) throw new Error("meta fetch failed");
        const data = await res.json();
        setMeta(data);
        setStatus("live");
      } catch (e) {
        setStatus("fallback");
        setMeta(getSeededMeta());
      }
    };
    run();
  }, []);

  const META_DECKS = meta.metaDecks;
  const REGION_SPLIT = meta.regions;

  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">📊 Meta Snapshot</h1>
          <p className="text-white/50 text-sm">Tournament + OPTCG Sim snapshot. Live feed ready when sources connect.</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs border ${status === "live" ? "border-green-400/40 text-green-400 bg-green-400/10" : status === "loading" ? "border-white/20 text-white/60 bg-white/5" : "border-orange-400/40 text-orange-400 bg-orange-400/10"}`}>
          {status === "live" ? "Live data" : status === "loading" ? "Loading" : "Seeded"}
        </span>
        <span className="text-white/30 text-xs">Updated: {new Date(meta.updatedAt).toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Top deck</p>
          <p className="text-white text-lg font-semibold mt-1">{META_DECKS[0]?.name ?? "—"}</p>
          <p className="text-white/40 text-sm">{META_DECKS[0]?.winRate ?? "-"}% win · {META_DECKS[0]?.popularity ?? "-"}% field · {META_DECKS[0]?.trend === "▲" ? "trending up" : META_DECKS[0]?.trend === "▼" ? "trending down" : "steady"}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Rising deck</p>
          <p className="text-white text-lg font-semibold mt-1">{META_DECKS[1]?.name ?? "—"}</p>
          <p className="text-white/40 text-sm">Control the pace · trend {META_DECKS[1]?.trend ?? "—"}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs uppercase">Falling deck</p>
          <p className="text-white text-lg font-semibold mt-1">{META_DECKS[3]?.name ?? "—"}</p>
          <p className="text-white/40 text-sm">Losing share · trend {META_DECKS[3]?.trend ?? "—"}</p>
        </div>
      </div>

      <div className="bg-[#f0c040]/5 border border-[#f0c040]/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-white/60 text-sm">
          Live data pipeline is ready: plug OPTCG Sim logs + tournament results into /api/meta. Currently showing seeded snapshot until sources are connected.
        </p>
      </div>

      {/* Meta Tier Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white">Current Meta Tier List</h3>
          <span className="text-xs text-white/30">As of {new Date(meta.updatedAt).toLocaleDateString()} ({meta.source})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40">
              <th className="text-left p-4 font-medium">Rank</th>
              <th className="text-left p-4 font-medium">Deck</th>
              <th className="text-left p-4 font-medium">Tier</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Color</th>
              <th className="text-right p-4 font-medium hidden md:table-cell">Win Rate</th>
              <th className="text-right p-4 font-medium">Popularity</th>
              <th className="text-right p-4 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {META_DECKS.map((deck) => (
              <tr key={deck.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-white/40 font-mono">#{deck.rank}</td>
                <td className="p-4 text-white font-medium">{deck.name}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${tierColors[deck.tier]}`}>
                    {deck.tier}
                  </span>
                </td>
                <td className="p-4 text-white/50 hidden md:table-cell">{deck.color}</td>
                <td className="p-4 text-right text-white/70 hidden md:table-cell">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-20 bg-white/10 h-2 rounded-full">
                      <div className={`h-2 rounded-full ${barColor(deck.winRate)}`} style={{ width: `${deck.winRate}%` }} />
                    </div>
                    <span className="font-bold text-sm text-white/80">{deck.winRate}%</span>
                  </div>
                </td>
                <td className="p-4 text-right text-white/70">{deck.popularity}%</td>
                <td className={`p-4 text-right font-bold ${trendColor(deck.trend)}`}>
                  {deck.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Region split & methodology */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Region split</h4>
          <div className="space-y-2 text-sm text-white/70">
            {REGION_SPLIT.map((r) => (
              <div key={r.region} className="flex items-center justify-between gap-3">
                <span className="text-white/80">{r.region}</span>
                <div className="flex-1 mx-2 bg-white/10 h-2 rounded-full">
                  <div className="bg-[#f0c040] h-2 rounded-full" style={{ width: `${Math.min(100, (r.players / 900) * 100)}%` }} />
                </div>
                <span className="text-white/50 text-xs">{r.events} events · {r.players} players</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Data source plan</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
            <li>OPTCG Sim logs → matchup win rates</li>
            <li>Tournament results (Limitless / community)</li>
            <li>Nightly aggregation + outlier trim</li>
          </ul>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-2">Next steps</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
            <li>Wire live data feed + cron refresh</li>
            <li>Expose API: /api/meta for frontends</li>
            <li>Per-region filters + weekly deltas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

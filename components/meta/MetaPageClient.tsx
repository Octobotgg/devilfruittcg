"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, TrendingUp, TrendingDown, Minus, Activity, Globe, Database } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import DonButton from "@/components/ui/DonButton";
import LeaderColorTag from "@/components/ui/LeaderColorTag";
import LiveStatusStrip from "@/components/ui/LiveStatusStrip";
import {
  META_DEFAULT_FORMAT,
  META_DEFAULT_REGION,
  META_PAGE_RANGE,
} from "@/lib/constants/page-defaults";
import { insightTimeRangeLabel } from "@/lib/competitive-time-range";

type MetaPageClientProps = {
  initialMeta: MetaSnapshot;
  initialIsLive: boolean;
};

const tierConfig: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  S: { bg: "bg-[#F0C040]/10", text: "text-[#F0C040]", border: "border-[#F0C040]/30", glow: "shadow-[#F0C040]/20" },
  A: { bg: "bg-blue-500/10",  text: "text-blue-400",  border: "border-blue-500/30",  glow: "shadow-blue-500/20"  },
  B: { bg: "bg-purple-500/10",text: "text-purple-400",border: "border-purple-500/30",glow: "shadow-purple-500/20"},
  C: { bg: "bg-[var(--color-parchment-dark)]/30", text: "text-[var(--color-text-mid)]", border: "border-[var(--color-parchment-dark)]", glow: "" },
};

function barColor(win: number | null) {
  if (win == null) return "bg-[var(--color-parchment-dark)]";
  if (win >= 56) return "bg-green-400";
  if (win >= 52) return "bg-blue-400";
  if (win >= 48) return "bg-orange-400";
  return "bg-red-400";
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "▲") return <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><TrendingUp className="w-3 h-3" />Rising</span>;
  if (trend === "▼") return <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><TrendingDown className="w-3 h-3" />Falling</span>;
  return <span className="flex items-center gap-1 text-[var(--color-text-light)] text-xs font-bold"><Minus className="w-3 h-3" />Steady</span>;
}

export default function MetaPageClient({ initialMeta, initialIsLive }: MetaPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDeckParam = (searchParams.get("deck") || "").trim();

  const [meta, setMeta] = useState<MetaSnapshot>(initialMeta);
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "fallback">(initialIsLive ? "live" : "fallback");
  const [format, setFormat] = useState(META_DEFAULT_FORMAT);
  const [region, setRegion] = useState(META_DEFAULT_REGION);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(initialIsLive ? initialMeta.updatedAt : null);
  const [activeDeck, setActiveDeck] = useState<{ name: string; deckId: string } | null>(null);
  const [deckCards, setDeckCards] = useState<Array<{ id: string; name: string; count: number; imageUrl: string }>>([]);
  const [deckLists, setDeckLists] = useState<Array<{ listId: string; place: string; player: string; tournament: string; format: string }>>([]);
  const [deckUsage, setDeckUsage] = useState<Array<{ id: string; name: string; imageUrl: string; usagePct: number; avgQty: number }>>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const skippedInitialFetchRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        setStatus("loading");
        const params = new URLSearchParams({ format, region, range: META_PAGE_RANGE });
        const res = await fetch(`/api/meta?${params.toString()}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const seeded = String(json?.source || "").toLowerCase().includes("seeded");
        setMeta(json);
        setStatus(seeded ? "fallback" : "live");
        setLastSuccessAt(seeded ? null : typeof json?.updatedAt === "string" ? json.updatedAt : null);
      } catch {
        setStatus("fallback");
      }
    };

    const usingDefaultFilters = format === META_DEFAULT_FORMAT && region === META_DEFAULT_REGION;
    if (initialIsLive && usingDefaultFilters && !skippedInitialFetchRef.current) {
      skippedInitialFetchRef.current = true;
    } else {
      run();
    }
    timer = setInterval(run, 5 * 60 * 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [format, initialIsLive, region]);

  const decks = meta.metaDecks;
  const isSeeded = String(meta.source).toLowerCase().includes("seeded");
  const lowSample = meta.comparableSample !== false && (meta.sampleGames || 0) > 0 && (meta.sampleGames || 0) < 100;

  useEffect(() => {
    const [c] = parseLeaderColors(decks[0]?.color);
    setThemeByLeaderColor(c);
  }, [decks]);

  const loadDecklist = useCallback(async (deckName: string, deckId?: string) => {
    if (!deckId) return;
    setActiveDeck({ name: deckName, deckId });
    setDeckLoading(true);
    setDeckCards([]);
    setDeckLists([]);
    setDeckUsage([]);
    try {
      const params = new URLSearchParams({ deckId, format, region, lists: "8" });
      const res = await fetch(`/api/meta/deck?${params.toString()}`);
      const json = await res.json();
      setDeckCards(Array.isArray(json?.cards) ? json.cards : []);
      setDeckLists(Array.isArray(json?.lists) ? json.lists : []);
      setDeckUsage(Array.isArray(json?.usage) ? json.usage : []);
    } catch {
      setDeckCards([]);
      setDeckLists([]);
      setDeckUsage([]);
    } finally {
      setDeckLoading(false);
    }
  }, [format, region]);

  const getDeckLookupId = useCallback((deck?: { deckId?: string; cardId?: string }) => {
    const deckId = String(deck?.deckId || "").trim();
    if (deckId) return deckId;
    const cardId = String(deck?.cardId || "").trim();
    if (cardId) return cardId;
    return undefined;
  }, []);

  const openDecklistByDeck = useCallback((deckName: string, deckId?: string) => {
    if (!deckId) return;

    if (selectedDeckParam === deckId) {
      void loadDecklist(deckName, deckId);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("deck", deckId);
    const qs = params.toString();
    router.replace(qs ? `/meta?${qs}` : "/meta", { scroll: false });
  }, [loadDecklist, router, searchParams, selectedDeckParam]);

  const closeDecklist = useCallback(() => {
    setActiveDeck(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("deck");
    const qs = params.toString();
    router.replace(qs ? `/meta?${qs}` : "/meta", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (!selectedDeckParam) return;
    if (activeDeck?.deckId === selectedDeckParam) return;

    const matched = decks.find((d) => d.deckId === selectedDeckParam || d.cardId === selectedDeckParam);
    const deckName = matched?.name || "Leader";
    void loadDecklist(deckName, selectedDeckParam);
  }, [activeDeck?.deckId, decks, loadDecklist, selectedDeckParam]);

  return (
    <div className="space-y-10 pb-24 md:pb-0">
      {isSeeded ? (
        <div className="rounded-2xl border border-[var(--color-gold)] bg-[rgba(212,160,84,0.1)] p-4">
          <p className="text-[var(--color-text-dark)] text-sm font-semibold">
            Live meta data is unavailable right now. This page is showing a fallback snapshot until the live feed recovers.
          </p>
        </div>
      ) : null}
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-ocean)]/10 border border-[var(--color-ocean)]/25 rounded-full">
            <Crown className="w-3.5 h-3.5 text-[var(--color-ocean)]" />
            <span className="text-[var(--color-ocean)] text-xs font-semibold tracking-wider uppercase">Tournament Meta</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            status === "live"    ? "border-emerald-600/40 text-emerald-700 bg-emerald-500/10" :
            status === "loading" ? "border-[var(--color-parchment-dark)] text-[var(--color-text-light)] bg-[var(--color-cream)] animate-pulse" :
                                   "border-orange-500/40 text-orange-700 bg-orange-400/10"
          }`}>
            {status === "live" ? "● Live Aggregate" : status === "loading" ? "Loading..." : "● Live data unavailable"}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[var(--color-navy)] mb-3">
          Meta <span className="text-[var(--color-ocean)]">Snapshot</span>
        </h1>
        <p className="text-[var(--color-text-light)] text-lg">
          {isSeeded ? "Fallback snapshot while live data is unavailable" : "Top decks from live aggregate data"} · Updated {lastSuccessAt ? new Date(lastSuccessAt).toLocaleDateString() : "—"}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-[var(--color-text-light)] mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="bg-[var(--color-cream)] border border-[var(--color-parchment-dark)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-dark)]"
            >
              {["OP15", "OP14", "OP13", "OP12", "OP11", "OP10", "OP09", "OP08"].map((f) => (
                <option key={f} value={f} className="bg-[var(--color-cream)]">{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-light)] mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="bg-[var(--color-cream)] border border-[var(--color-parchment-dark)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-dark)]"
            >
              <option value="global" className="bg-[var(--color-cream)]">Global</option>
              <option value="na" className="bg-[var(--color-cream)]">North America</option>
              <option value="eu" className="bg-[var(--color-cream)]">Europe</option>
              <option value="la" className="bg-[var(--color-cream)]">Latin America</option>
              <option value="oc" className="bg-[var(--color-cream)]">Oceania</option>
              <option value="asia" className="bg-[var(--color-cream)]">Asia</option>
            </select>
          </div>

          <div className="text-xs text-[var(--color-text-light)] pb-1">
            Last successful fetch: {lastSuccessAt ? new Date(lastSuccessAt).toLocaleTimeString() : "—"}
          </div>
          <div className="ml-auto"><DonButton href="/matchups">Open Matchup Matrix</DonButton></div>
        </div>
      </motion.div>

      <LiveStatusStrip
        updatedAt={lastSuccessAt || undefined}
        sourceLabel={isSeeded ? "Live data unavailable" : "Live aggregate"}
        sampleGames={isSeeded ? 0 : meta.sampleGames}
        sampleText={isSeeded ? "Live data unavailable" : meta.sampleLabel}
        sampleCaption={isSeeded ? "Showing fallback meta snapshot" : meta.sampleDescription}
        formatLabel={`${insightTimeRangeLabel(META_PAGE_RANGE)} · ${format}`}
      />

      {lowSample && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4"
        >
          <p className="text-amber-200 text-sm font-semibold">
            Limited data: this week&apos;s sample has fewer than 100 logged games, so treat meta shifts as directional.
          </p>
        </motion.div>
      )}

      {/* Command Brief */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--color-parchment-dark)] bg-[linear-gradient(135deg,rgba(245,239,227,0.96),rgba(250,247,242,0.98))] p-5 md:p-6 shadow-[0_20px_48px_rgba(42,33,24,0.1)]"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_18%,rgba(240,192,64,0.14),transparent_44%),radial-gradient(circle_at_86%_78%,rgba(209,91,58,0.1),transparent_48%)]" />
        <div className="relative grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[rgba(250,247,242,0.82)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-light)]">Deck to beat</p>
            <p className="mt-2 text-lg font-black text-[var(--color-navy)]">{decks[0]?.name ?? "—"}</p>
            <p className="text-sm text-[#F0C040]">{decks[0]?.winRate != null ? `${decks[0].winRate}% win rate` : "Win rate not provided by source"}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[rgba(250,247,242,0.82)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-light)]">Meta pressure</p>
            <p className="mt-2 text-lg font-black text-[var(--color-navy)]">{decks[0]?.popularity ?? "—"}% field share</p>
            <p className="text-sm text-[var(--color-text-mid)]">Top archetype representation</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[rgba(250,247,242,0.82)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[var(--color-text-light)]">Source mode</p>
            <p className="mt-2 text-lg font-black text-[var(--color-navy)]">{isSeeded ? "Fallback" : "Live"}</p>
            <p className="text-sm text-[var(--color-text-mid)]">Updated {lastSuccessAt ? new Date(lastSuccessAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </motion.div>

      {/* Top 3 spotlight */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Top Deck",     deck: decks[0], icon: "👑" },
          { label: "Rising Threat",deck: decks[1], icon: "📈" },
          { label: "Watch Out",    deck: decks[3], icon: "⚠️" },
        ].map((item, i) => {
          const deckLookupId = getDeckLookupId(item.deck);
          const canOpenDeck = Boolean(deckLookupId);
          return (
            <button
              key={i}
              type="button"
              onClick={() => openDecklistByDeck(item.deck?.name || "Leader", deckLookupId)}
              disabled={!canOpenDeck}
              className={`relative w-full text-left bg-[var(--color-parchment)] border border-[var(--color-parchment-dark)] rounded-3xl p-6 overflow-hidden group transition-all ${
                canOpenDeck ? "hover:border-[var(--color-gold)]/35 cursor-pointer" : "opacity-75 cursor-not-allowed"
              }`}
              title={canOpenDeck ? "Click leader to open decklist" : "Decklist unavailable"}
            >
              <div className="absolute top-0 right-0 text-6xl opacity-10 p-4">{item.icon}</div>
              <p className="text-[var(--color-text-light)] text-xs uppercase tracking-wider mb-2">{item.label}</p>
              <div className="flex gap-3 items-start">
                {item.deck?.cardId ? (
                  <img
                    src={`/api/card-image?id=${item.deck.cardId}&variant=p1`}
                    alt={`${item.deck.name} alt art`}
                    className="w-14 h-20 rounded-lg border border-[var(--color-parchment-dark)] object-cover"
                  />
                ) : null}
                <div>
                  <p className="text-[var(--color-navy)] text-xl font-black mb-1">{item.deck?.name ?? "—"}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--color-gold)] font-bold">{item.deck?.winRate != null ? `${item.deck.winRate}% WR` : "— WR"}</span>
                    <span className="text-[var(--color-text-light)]">·</span>
                    <span className="text-[var(--color-text-mid)]">{item.deck?.popularity ?? "—"}% field</span>
                  </div>
                  {item.deck && <div className="mt-3"><TrendBadge trend={item.deck.trend} /></div>}
                  {canOpenDeck ? <p className="mt-2 text-[11px] text-[var(--color-gold)]">Click leader to view decklist</p> : null}
                </div>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* Tier Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-[var(--color-parchment)] border border-[var(--color-parchment-dark)] rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-[var(--color-parchment-dark)] flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-black text-[var(--color-navy)]">Current Tier List</h2>
          <span className="text-xs text-[var(--color-text-light)] font-mono">
            {isSeeded ? "Fallback snapshot" : "Public aggregate"} · {lastSuccessAt ? new Date(lastSuccessAt).toLocaleString() : "Awaiting live sync"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-parchment-dark)] text-[var(--color-text-light)] text-xs uppercase tracking-wider">
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
                const deckLookupId = getDeckLookupId(deck);
                return (
                  <motion.tr key={deck.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="border-b border-[var(--color-parchment-dark)]/50 hover:bg-[var(--color-cream)] transition-colors">
                    <td className="p-4 text-[var(--color-text-light)] font-mono text-sm">#{deck.rank}</td>
                    <td className="p-4 text-[var(--color-navy)] font-bold">
                      <button
                        type="button"
                        onClick={() => openDecklistByDeck(deck.name, deckLookupId)}
                        disabled={!deckLookupId}
                        className={`flex items-center gap-3 text-left transition-colors ${
                          deckLookupId ? "hover:text-[var(--color-gold)]" : "cursor-not-allowed opacity-70"
                        }`}
                        title={deckLookupId ? "View decklist" : "Decklist unavailable"}
                      >
                        {deck.cardId ? (
                          <img
                            src={`/api/card-image?id=${deck.cardId}&variant=p1`}
                            alt={`${deck.name} alt art`}
                            className="w-8 h-11 rounded border border-[var(--color-parchment-dark)] object-cover"
                          />
                        ) : null}
                        <span>{deck.name}</span>
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border shadow-lg ${t.bg} ${t.text} ${t.border} ${t.glow}`}>
                        {deck.tier}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--color-text-mid)] hidden md:table-cell"><LeaderColorTag colorLabel={deck.color} /></td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 bg-[var(--color-parchment-dark)]/50 h-2 rounded-full overflow-hidden">
                          <motion.div className={`h-2 rounded-full ${barColor(deck.winRate)}`}
                            initial={{ width: 0 }} animate={{ width: `${deck.winRate ?? 50}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }} />
                        </div>
                        <span className="text-[var(--color-navy)] font-bold text-sm w-12 text-right">{deck.winRate != null ? `${deck.winRate}%` : "—"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-[var(--color-text-mid)]">{deck.popularity}%</td>
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
        <div className="bg-[var(--color-parchment)] border border-[var(--color-parchment-dark)] rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[var(--color-gold)]" />
            <h3 className="text-[var(--color-navy)] font-bold">Region Split</h3>
          </div>
          <div className="space-y-3">
            {meta.regions.map((r, i) => (
              <div key={r.region}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-dark)]">{r.region}</span>
                  <span className="text-[var(--color-text-light)]">{r.events} events · {r.players} players</span>
                </div>
                <div className="w-full bg-[var(--color-parchment-dark)]/50 h-1.5 rounded-full overflow-hidden">
                  <motion.div className="bg-[#F0C040] h-1.5 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.players / 900) * 100)}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data plan */}
        <div className="bg-[var(--color-parchment)] border border-[var(--color-parchment-dark)] rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-[var(--color-ocean)]" />
            <h3 className="text-[var(--color-navy)] font-bold">Data Sources</h3>
          </div>
          <ul className="space-y-2 text-sm text-[var(--color-text-mid)]">
            {(isSeeded
              ? [
                  "Fallback dataset (internal)",
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
          <p className="text-[var(--color-text-mid)] text-sm leading-relaxed">
            {isSeeded ? (
              <>
                Running on fallback data right now. Live aggregate source will auto-resume when fetch succeeds via <code className="text-[#F0C040] text-xs bg-[#F0C040]/10 px-1 py-0.5 rounded">/api/meta</code>.
              </>
            ) : (
              <>
                Live public aggregate is active via <code className="text-[#F0C040] text-xs bg-[#F0C040]/10 px-1 py-0.5 rounded">/api/meta</code>. Snapshot reflects current upstream sample.
              </>
            )}
          </p>
        </div>
      </motion.div>

      {activeDeck && (
        <div className="fixed inset-0 z-50 bg-[rgba(42,33,24,0.38)] backdrop-blur-sm flex items-end md:items-center justify-center p-3" onClick={closeDecklist}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4 md:p-6 shadow-[0_28px_80px_rgba(42,33,24,0.28)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--color-navy)] text-lg md:text-xl font-black">{activeDeck.name} · Decklist</h3>
              <button onClick={closeDecklist} className="text-[var(--color-text-light)] hover:text-[var(--color-text-dark)]">Close</button>
            </div>

            {deckLoading ? (
              <p className="text-[var(--color-text-mid)]">Loading real tournament list…</p>
            ) : deckCards.length === 0 ? (
              <p className="text-[var(--color-sunset)]">No decklist found for this filter. Try Global region or another format.</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <h4 className="text-[var(--color-navy)] font-bold mb-2">Recent Tournament Placings ({deckLists.length})</h4>
                  <div className="space-y-2">
                    {deckLists.slice(0, 8).map((l) => (
                      <div key={l.listId} className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-2 text-sm">
                        <div className="text-[var(--color-text-dark)] font-semibold">{l.place} · {l.player}</div>
                        <div className="text-[var(--color-text-mid)] text-xs">{l.tournament || "Tournament"} · {l.format} · list #{l.listId}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[var(--color-navy)] font-bold mb-2">Core Card Usage (across fetched lists)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {deckUsage.slice(0, 20).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-2">
                        <img src={u.imageUrl} alt={u.name} className="w-10 h-14 rounded border border-[var(--color-parchment-dark)] object-cover" />
                        <div className="min-w-0">
                          <div className="text-[var(--color-text-dark)] font-semibold text-sm truncate">{u.name}</div>
                          <div className="text-[var(--color-text-mid)] text-xs">{u.id} · {u.usagePct}% lists · avg {u.avgQty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[var(--color-navy)] font-bold mb-2">Representative List</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deckCards.map((c, i) => (
                      <div key={`${c.id}-${i}`} className="flex items-center gap-3 rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-2">
                        <img src={c.imageUrl} alt={c.name} className="w-10 h-14 rounded border border-[var(--color-parchment-dark)] object-cover" />
                        <div className="min-w-0">
                          <div className="text-[var(--color-text-dark)] font-semibold text-sm truncate">{c.name}</div>
                          <div className="text-[var(--color-text-mid)] text-xs">{c.id} · x{c.count}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile one-thumb utility bar */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="bg-[var(--color-cream)]/95 backdrop-blur-xl border border-[var(--color-parchment-dark)] rounded-2xl p-2 shadow-[0_18px_38px_rgba(42,33,24,0.18)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="h-11 rounded-xl bg-[var(--color-parchment)] border border-[var(--color-parchment-dark)] text-[var(--color-text-mid)] text-sm font-bold"
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

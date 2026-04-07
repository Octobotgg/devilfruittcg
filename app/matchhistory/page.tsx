"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, ShieldCheck, Swords } from "lucide-react";

type SearchResult = {
  deviceId: string;
  playerName: string | null;
  playerLeader: string | null;
  oppLeader: string | null;
  date: string | null;
};

type MatchRow = {
  id: string;
  date: string;
  result: "Won" | "Lost" | "Draw" | "Unknown";
  playerLeader: string;
  oppLeader: string;
  playerName: string | null;
  oppPlayerName: string | null;
  turnNumber: number | null;
  gameMode: number | null;
  isPrivate: boolean;
};

type MatchSummary = {
  totalMatchLogs: number;
  indexedPlayers: number;
  bridgedSampleGames: number;
  updatedAt: string | null;
  latestMatchEventAt: string | null;
  latestSnapshotDate: string | null;
  syncConfigured: boolean;
  error?: string;
};

type PlayerStats = {
  deviceId: string;
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
  averageTurns: number | null;
  leaders: Array<{
    leaderId: string;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }>;
};

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const mins = Math.max(1, Math.floor((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function MatchHistoryPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesHasMore, setMatchesHasMore] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMoreMatches, setLoadingMoreMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await fetch("/api/matchhistory/summary", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setSummary((json || null) as MatchSummary | null);
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedResult = useMemo(
    () => results.find((r) => r.deviceId === selectedDeviceId) || null,
    [results, selectedDeviceId]
  );

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;

    setSearching(true);
    setSearchError(null);
    setSelectedDeviceId(null);
    setMatches([]);
    setStats(null);

    try {
      const res = await fetch("/api/matchhistory/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm: q, limit: 20 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Search failed");

      setResults((json?.results || []) as SearchResult[]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function openHistory(deviceId: string) {
    setSelectedDeviceId(deviceId);
    setMatches([]);
    setMatchesPage(1);
    setMatchesHasMore(false);
    setStats(null);
    setMatchesError(null);

    setLoadingMatches(true);
    setLoadingStats(true);

    try {
      const [matchRes, statRes] = await Promise.all([
        fetch(`/api/matchhistory/matches?deviceId=${encodeURIComponent(deviceId)}&page=1&pageSize=80`),
        fetch(`/api/matchhistory/player-stats?deviceId=${encodeURIComponent(deviceId)}`),
      ]);

      const [matchJson, statJson] = await Promise.all([matchRes.json(), statRes.json()]);

      if (!matchRes.ok) throw new Error(matchJson?.error || "Failed to load matches");
      if (!statRes.ok) throw new Error(statJson?.error || "Failed to load stats");

      setMatches((matchJson?.matches || []) as MatchRow[]);
      setMatchesPage(1);
      setMatchesHasMore(Boolean(matchJson?.hasMore));
      setStats((statJson?.stats || null) as PlayerStats | null);
    } catch (err) {
      setMatchesError(err instanceof Error ? err.message : "Failed to load match history");
      setMatches([]);
      setStats(null);
    } finally {
      setLoadingMatches(false);
      setLoadingStats(false);
    }
  }

  async function loadMoreMatches() {
    if (!selectedDeviceId || !matchesHasMore || loadingMoreMatches) return;

    const nextPage = matchesPage + 1;
    setLoadingMoreMatches(true);
    try {
      const res = await fetch(
        `/api/matchhistory/matches?deviceId=${encodeURIComponent(selectedDeviceId)}&page=${nextPage}&pageSize=80`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load more matches");

      const nextMatches = (json?.matches || []) as MatchRow[];
      setMatches((current) => [...current, ...nextMatches]);
      setMatchesPage(nextPage);
      setMatchesHasMore(Boolean(json?.hasMore));
    } catch (err) {
      setMatchesError(err instanceof Error ? err.message : "Failed to load more matches");
    } finally {
      setLoadingMoreMatches(false);
    }
  }

  return (
    <div className="space-y-5 pb-16">
      <section className="relative overflow-hidden rounded-3xl border border-[#f0c040]/25 bg-gradient-to-br from-[#151a2b]/90 via-[#111726]/88 to-[#181218]/90 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(240,192,64,0.16),transparent_38%),radial-gradient(circle_at_82%_85%,rgba(239,68,68,0.1),transparent_42%)]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f8d479]/35 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8d479]">
            <ShieldCheck className="h-3.5 w-3.5" /> Player Match Log
          </div>

          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Match History</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/65">
            Search by player name or device hash, inspect recent matches, and get instant performance summaries.
          </p>

          <form onSubmit={runSearch} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter display name or device hash..."
                className="w-full rounded-xl border border-white/15 bg-black/35 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
              />
            </div>
            <button
              disabled={searching || query.trim().length < 2}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#f8d479]/45 bg-[#f8d479]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#f8d479] disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError ? <p className="mt-2 text-xs text-red-300">{searchError}</p> : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Raw Match Logs</p>
          <p className="mt-1 text-2xl font-black text-white">
            {summaryLoading ? "…" : (summary?.totalMatchLogs || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {summary?.latestMatchEventAt ? `Latest logged match ${fmtAgo(summary.latestMatchEventAt)}` : "Awaiting ingest"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Indexed Players</p>
          <p className="mt-1 text-2xl font-black text-white">
            {summaryLoading ? "…" : (summary?.indexedPlayers || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-white/45">Searchable device/player index</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Bridge Sample Games</p>
          <p className="mt-1 text-2xl font-black text-white">
            {summaryLoading ? "…" : (summary?.bridgedSampleGames || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {summary?.latestSnapshotDate ? `Latest snapshot ${summary.latestSnapshotDate}` : "No snapshot imported"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Last Sync</p>
          <p className="mt-1 text-sm font-black text-white">
            {summaryLoading ? "…" : summary?.updatedAt ? fmtDate(summary.updatedAt) : "Not synced"}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {summary?.syncConfigured ? "Auto-sync configured once envs are set" : "Sync envs missing"}
          </p>
        </div>
      </section>

      {summary?.bridgedSampleGames && !summary?.totalMatchLogs ? (
        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Aggregate snapshot data is available, but searchable raw player match logs are not populated yet. This page will fill in once upstream match-event ingest is configured.
        </section>
      ) : null}

      {results.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-white/80">Search results</h2>
            <p className="text-xs text-white/45">{results.length} found</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => (
              <motion.button
                key={r.deviceId}
                whileHover={{ y: -1 }}
                onClick={() => openHistory(r.deviceId)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selectedDeviceId === r.deviceId
                    ? "border-[#f8d479]/40 bg-[#f8d479]/8"
                    : "border-white/10 bg-black/20 hover:border-white/20"
                }`}
              >
                <p className="truncate text-sm font-black text-white">{r.playerName || "Unknown player"}</p>
                <p className="mt-0.5 truncate text-[11px] text-white/55">{r.deviceId}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                  <span>{r.playerLeader || "—"}</span>
                  <span>{fmtAgo(r.date)}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedDeviceId ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-black text-white">{selectedResult?.playerName || "Selected Player"}</h3>
              <p className="text-xs text-white/45">Device: {selectedDeviceId}</p>
            </div>
            <Link
              href={`/api/matchhistory/matches?deviceId=${encodeURIComponent(selectedDeviceId)}`}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--theme-accent-2)] hover:text-white"
            >
              Raw API <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Wins</p>
              <p className="mt-1 text-xl font-black text-emerald-300">{loadingStats ? "…" : stats?.wins ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Losses</p>
              <p className="mt-1 text-xl font-black text-red-300">{loadingStats ? "…" : stats?.losses ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Win Rate</p>
              <p className="mt-1 text-xl font-black text-white">{loadingStats ? "…" : `${stats?.winRate ?? 0}%`}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Avg Turns</p>
              <p className="mt-1 text-xl font-black text-white">{loadingStats ? "…" : stats?.averageTurns ?? "—"}</p>
            </div>
          </div>

          {matchesError ? <p className="text-sm text-red-300">{matchesError}</p> : null}

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="min-w-full text-sm">
              <thead className="bg-black/30 text-xs uppercase tracking-[0.08em] text-white/50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Result</th>
                  <th className="px-3 py-2 text-left">Leaders</th>
                  <th className="px-3 py-2 text-left">Turns</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                </tr>
              </thead>
              <tbody>
                {loadingMatches ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/55">
                      Loading matches...
                    </td>
                  </tr>
                ) : matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/55">
                      No matches found.
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="border-t border-white/10 text-white/80">
                      <td className="px-3 py-2 text-xs text-white/55">{fmtDate(m.date)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                            m.result === "Won"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : m.result === "Lost"
                                ? "bg-red-500/15 text-red-300"
                                : "bg-white/10 text-white/70"
                          }`}
                        >
                          {m.result}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 text-white/75">
                          <span>{m.playerLeader}</span>
                          <Swords className="h-3.5 w-3.5 text-white/35" />
                          <span>{m.oppLeader}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-white/65">{m.turnNumber ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-white/65">
                        {m.isPrivate ? "Private" : "Public"}
                        {m.gameMode != null ? ` · ${m.gameMode}` : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {matchesHasMore ? (
            <div className="mt-3 flex justify-center">
              <button
                onClick={loadMoreMatches}
                disabled={loadingMoreMatches}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white/80 disabled:opacity-50"
              >
                {loadingMoreMatches ? "Loading more..." : "Load more matches"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

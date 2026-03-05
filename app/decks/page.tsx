"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  Crown,
  Filter,
  FlaskConical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Card } from "@/lib/cards";
import DonButton from "@/components/ui/DonButton";

type DeckCard = { cardId: string; quantity: number };

type Deck = {
  id: string;
  name: string;
  leaderId: string | null;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "all" | "ready" | "draft";
type SortMode = "updated" | "created" | "name";

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Purple: "#a855f7",
  Black: "#6b7280",
  Yellow: "#eab308",
};

function loadDecks(): Deck[] {
  try {
    return JSON.parse(localStorage.getItem("devilfruit_decks") || "[]");
  } catch {
    return [];
  }
}

function saveDecks(decks: Deck[]) {
  localStorage.setItem("devilfruit_decks", JSON.stringify(decks));
}

function totalCards(deck: Deck) {
  return (deck.leaderId ? 1 : 0) + deck.cards.reduce((sum, c) => sum + c.quantity, 0);
}

function uniqueCards(deck: Deck) {
  return deck.cards.length + (deck.leaderId ? 1 : 0);
}

function isBattleReady(deck: Deck) {
  return Boolean(deck.leaderId) && totalCards(deck) === 50;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function recency(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCache, setCardCache] = useState<Map<string, Card>>(new Map());
  const hydratedIdsRef = useRef<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");

  useEffect(() => {
    setDecks(loadDecks());
  }, []);

  const allCardIds = useMemo(() => {
    const ids = new Set<string>();
    decks.forEach((deck) => {
      if (deck.leaderId) ids.add(deck.leaderId);
      deck.cards.forEach((c) => ids.add(c.cardId));
    });
    return Array.from(ids);
  }, [decks]);

  useEffect(() => {
    const missing = allCardIds.filter((id) => !hydratedIdsRef.current.has(id));
    if (!missing.length) return;

    let cancelled = false;

    (async () => {
      const fetched = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/cards?q=${encodeURIComponent(id)}&pageSize=1`);
            if (!res.ok) return null;
            const json = await res.json();
            return (json.results?.[0] as Card | undefined) || null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      setCardCache((prev) => {
        const next = new Map(prev);
        fetched.forEach((card, i) => {
          hydratedIdsRef.current.add(missing[i]);
          if (card) next.set(card.id, card);
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [allCardIds]);

  function persist(next: Deck[]) {
    setDecks(next);
    saveDecks(next);
  }

  function deleteDeck(id: string) {
    const deck = decks.find((d) => d.id === id);
    const ok = window.confirm(`Delete deck \"${deck?.name || "Untitled"}\"?`);
    if (!ok) return;
    persist(decks.filter((d) => d.id !== id));
  }

  function duplicateDeck(id: string) {
    const base = decks.find((d) => d.id === id);
    if (!base) return;
    const now = new Date().toISOString();
    const copy: Deck = {
      ...base,
      id: `copy-${Date.now()}`,
      name: `${base.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    persist([copy, ...decks]);
  }

  function colorBreakdown(deck: Deck) {
    const tally: Record<string, number> = {};

    if (deck.leaderId) {
      const leader = cardCache.get(deck.leaderId);
      if (leader?.color) {
        leader.color.split("/").forEach((part) => {
          const c = part.trim();
          tally[c] = (tally[c] || 0) + 1;
        });
      }
    }

    deck.cards.forEach(({ cardId, quantity }) => {
      const card = cardCache.get(cardId);
      if (!card?.color) return;
      card.color.split("/").forEach((part) => {
        const c = part.trim();
        tally[c] = (tally[c] || 0) + quantity;
      });
    });

    return Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }

  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = decks.filter((deck) => {
      const leader = deck.leaderId ? cardCache.get(deck.leaderId) : null;
      const matchQuery =
        !q ||
        deck.name.toLowerCase().includes(q) ||
        leader?.name?.toLowerCase().includes(q) ||
        deck.leaderId?.toLowerCase().includes(q);

      const ready = isBattleReady(deck);
      const matchStatus = statusFilter === "all" || (statusFilter === "ready" ? ready : !ready);

      return matchQuery && matchStatus;
    });

    filtered.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return filtered;
  }, [decks, query, statusFilter, sortMode, cardCache]);

  const totalDecks = decks.length;
  const readyDecks = decks.filter(isBattleReady).length;
  const avgCompletion = totalDecks
    ? Math.round((decks.reduce((sum, d) => sum + Math.min(50, totalCards(d)), 0) / (totalDecks * 50)) * 100)
    : 0;
  const recentlyUpdated = decks.filter((d) => Date.now() - new Date(d.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 7).length;

  return (
    <div className="space-y-6 pb-20">
      <section className="relative overflow-hidden rounded-3xl border border-[#F0C040]/25 bg-gradient-to-br from-[#1a1325]/90 via-[#111a2e]/90 to-[#221212]/90 p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(240,192,64,0.18),transparent_40%),radial-gradient(circle_at_88%_82%,rgba(220,38,38,0.12),transparent_42%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f8d479]/35 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8d479]">
              <FlaskConical className="h-3.5 w-3.5" /> Deck Lab Archive
            </div>
            <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Your Crew Hangar</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              Manage every saved list, track build readiness, and jump back into Deck Lab with one click.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/deckbuilder">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white/85"
              >
                <BookOpen className="h-3.5 w-3.5" /> Open Lab
              </motion.button>
            </Link>
            <DonButton href="/deckbuilder" className="px-4 py-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New Deck</span>
            </DonButton>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Vault</p>
            <p className="mt-1 text-2xl font-black text-white">{totalDecks}</p>
            <p className="text-xs text-white/50">Saved lists</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Battle Ready</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{readyDecks}</p>
            <p className="text-xs text-white/50">50 cards + leader</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Avg Completion</p>
            <p className="mt-1 text-2xl font-black text-[var(--theme-accent-2)]">{avgCompletion}%</p>
            <p className="text-xs text-white/50">Across all decks</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Updated (7d)</p>
            <p className="mt-1 text-2xl font-black text-white">{recentlyUpdated}</p>
            <p className="text-xs text-white/50">Recently tuned</p>
          </div>
        </div>
      </section>

      {totalDecks === 0 ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-14 text-center">
          <BookOpen className="mx-auto h-14 w-14 text-white/15" />
          <h2 className="mt-4 text-xl font-black text-white">No crews in your hangar yet</h2>
          <p className="mt-2 text-sm text-white/55">Build your first deck and it will appear here instantly.</p>
          <div className="mt-6">
            <DonButton href="/deckbuilder" className="px-6 py-3 text-[11px]">Start in Deck Lab</DonButton>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by deck name, leader, or card ID..."
                  className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-white/45" />
                  {(["all", "ready", "draft"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                        statusFilter === f
                          ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent-2)]"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80"
                >
                  <option value="updated">Sort: Updated</option>
                  <option value="created">Sort: Created</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>
          </section>

          {filteredDecks.length === 0 ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
              <p className="text-sm text-white/60">No decks match your current search/filter.</p>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {filteredDecks.map((deck, index) => {
                  const leader = deck.leaderId ? cardCache.get(deck.leaderId) : null;
                  const total = totalCards(deck);
                  const unique = uniqueCards(deck);
                  const ready = isBattleReady(deck);
                  const colors = colorBreakdown(deck);

                  return (
                    <motion.article
                      key={deck.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: index * 0.03 }}
                      className="group relative overflow-hidden rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(10,14,24,0.86),rgba(7,10,18,0.9))]"
                    >
                      {deck.leaderId ? (
                        <div className="pointer-events-none absolute inset-0 opacity-[0.12] transition-opacity duration-200 group-hover:opacity-[0.18]">
                          <img src={`/api/card-image?id=${deck.leaderId}&variant=p1`} alt="" className="h-full w-full object-cover object-top" />
                        </div>
                      ) : null}

                      <div className="relative space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          {deck.leaderId ? (
                            <div className="relative shrink-0">
                              <img
                                src={`/api/card-image?id=${deck.leaderId}`}
                                alt={leader?.name || "Leader"}
                                className="h-20 w-14 rounded-xl border border-white/20 object-cover"
                              />
                              <div className="absolute -right-1 -top-1 rounded-full bg-[var(--theme-accent)] p-1">
                                <Crown className="h-2.5 w-2.5 text-black" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/30">
                              <Crown className="h-4 w-4 text-white/30" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">{deck.name}</p>
                            <p className="truncate text-[11px] text-white/45">{leader?.name || "No leader selected"}</p>

                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]">
                              {ready ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> Battle Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">
                                  <AlertTriangle className="h-3 w-3" /> Needs Tuning
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {colors.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {colors.map(([color, count]) => (
                              <span
                                key={`${deck.id}-${color}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80"
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_HEX[color] || "#999" }} />
                                {color} · {count}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Cards</p>
                            <p className="text-sm font-black text-white">{total}/50</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Unique</p>
                            <p className="text-sm font-black text-white">{unique}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-white/45">Updated</p>
                            <p className="text-sm font-black text-white">{recency(deck.updatedAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-white/45">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatShortDate(deck.createdAt)}</span>
                          <span>#{deck.id.slice(-4)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/deckbuilder?id=${deck.id}`} className="flex-1">
                            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/80 hover:text-white">
                              Open in Lab <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </Link>

                          <button
                            onClick={() => duplicateDeck(deck.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-white/65 hover:text-white"
                            title="Duplicate deck"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => deleteDeck(deck.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/20 bg-red-500/10 text-red-200/75 hover:text-red-200"
                            title="Delete deck"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </section>
          )}
        </>
      )}
    </div>
  );
}

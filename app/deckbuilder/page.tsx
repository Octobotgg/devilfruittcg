"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Trash2, Download, Save, Crown, X, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { searchCards, type Card } from "@/lib/cards";
import DonButton from "@/components/ui/DonButton";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";

interface DeckCard { cardId: string; quantity: number; }
interface Deck {
  id: string;
  name: string;
  leaderId: string | null;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
}

const COLORS = ["Red", "Blue", "Green", "Purple", "Black", "Yellow"];
const TYPES = ["Leader", "Character", "Event", "Stage"];

function newDeck(): Deck {
  return {
    id: Date.now().toString(),
    name: "Holy Grail Deck",
    leaderId: null,
    cards: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function saveDecks(decks: Deck[]) {
  localStorage.setItem("devilfruit_decks", JSON.stringify(decks));
}
function loadDecks(): Deck[] {
  try {
    return JSON.parse(localStorage.getItem("devilfruit_decks") || "[]");
  } catch {
    return [];
  }
}

export default function DeckBuilderPage() {
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deck, setDeck] = useState<Deck>(newDeck());
  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [maxRarityView, setMaxRarityView] = useState(false);
  const [techSlots, setTechSlots] = useState<string[]>([]);

  const allCards = useMemo(() => {
    const map = new Map<string, Card>();
    searchCards("").forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  const results = useMemo(() => {
    let res = searchCards(query);
    if (colorFilter) res = res.filter((c) => c.color.toLowerCase().includes(colorFilter.toLowerCase()));
    if (typeFilter) res = res.filter((c) => c.type.toLowerCase() === typeFilter.toLowerCase());
    return res.slice(0, 72);
  }, [query, colorFilter, typeFilter]);

  const totalCards = (deck.leaderId ? 1 : 0) + deck.cards.reduce((s, c) => s + c.quantity, 0);
  const isValid = deck.leaderId !== null && totalCards === 50;

  const leaderCard = deck.leaderId ? allCards.get(deck.leaderId) : null;

  useEffect(() => {
    if (!leaderCard?.color) return;
    const [color] = parseLeaderColors(leaderCard.color);
    setThemeByLeaderColor(color);
  }, [leaderCard?.color]);

  const curveBuckets = useMemo(() => {
    const b = Array.from({ length: 11 }, (_, i) => ({ cost: i === 10 ? "10+" : String(i), count: 0 }));
    deck.cards.forEach(({ cardId, quantity }) => {
      const card = allCards.get(cardId);
      if (!card || card.type === "Leader") return;
      const raw = typeof card.cost === "number" ? card.cost : Number(card.cost ?? 0);
      const idx = Number.isFinite(raw) ? Math.max(0, Math.min(10, raw >= 10 ? 10 : Math.floor(raw))) : 0;
      b[idx].count += quantity;
    });
    return b;
  }, [deck.cards, allCards]);

  const maxCurveCount = Math.max(1, ...curveBuckets.map((x) => x.count));

  const imageFor = (id: string) => `/api/card-image?id=${id}${maxRarityView ? "&variant=p1" : ""}`;

  useEffect(() => {
    setTechSlots((prev) => prev.filter((id) => deck.cards.some((c) => c.cardId === id)).slice(0, 8));
  }, [deck.cards]);

  function toggleTechSlot(cardId: string) {
    setTechSlots((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 8) return prev;
      return [...prev, cardId];
    });
  }

  function reorderTechSlots(from: number, to: number) {
    setTechSlots((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function addCard(card: Card) {
    if (card.type === "Leader") {
      setDeck((d) => ({ ...d, leaderId: card.id, updatedAt: new Date().toISOString() }));
      return;
    }

    setDeck((d) => {
      const existing = d.cards.find((c) => c.cardId === card.id);
      if (existing) {
        if (existing.quantity >= 4) return d;
        return {
          ...d,
          cards: d.cards.map((c) => (c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c)),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...d,
        cards: [...d.cards, { cardId: card.id, quantity: 1 }],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function removeOne(cardId: string) {
    setDeck((d) => {
      const existing = d.cards.find((c) => c.cardId === cardId);
      if (!existing) return d;
      if (existing.quantity <= 1) {
        return { ...d, cards: d.cards.filter((c) => c.cardId !== cardId), updatedAt: new Date().toISOString() };
      }
      return {
        ...d,
        cards: d.cards.map((c) => (c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c)),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function removeCard(cardId: string) {
    setDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.cardId !== cardId), updatedAt: new Date().toISOString() }));
  }

  function saveDeck() {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    if (idx >= 0) decks[idx] = deck;
    else decks.push(deck);
    saveDecks(decks);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function exportDeck() {
    const leader = deck.leaderId ? allCards.get(deck.leaderId) : null;
    const lines = leader ? [`1x ${leader.id} ${leader.name} [Leader]`] : [];
    deck.cards.forEach(({ cardId, quantity }) => {
      const c = allCards.get(cardId);
      if (c) lines.push(`${quantity}x ${c.id} ${c.name}`);
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setExported(true);
      setTimeout(() => setExported(false), 1600);
    });
  }

  function handleDropCard(cardId?: string) {
    if (!cardId) return;
    const card = allCards.get(cardId);
    if (card) addCard(card);
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 md:p-6">
        <h1 className="text-3xl font-black text-white md:text-4xl">Deck Lab</h1>
        <p className="mt-2 text-sm text-white/60">Drag cards into your deck zone, tune your DON curve, and export tournament-ready lists.</p>
        <div className="mt-3">
          <button
            onClick={() => setMaxRarityView((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] ${maxRarityView ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/20 text-[var(--theme-accent-2)]" : "border-white/20 bg-white/5 text-white/70"}`}
          >
            {maxRarityView ? "Holo View: ON" : "Holo View: OFF"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Deck Size</p>
            <p className="mt-1 text-2xl font-black text-white">{totalCards}/50</p>
            <p className="text-xs text-white/50">{isValid ? "Tournament legal" : "Target exactly 50 with leader"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Leader</p>
            <p className="mt-1 text-2xl font-black text-[var(--theme-accent-2)]">{leaderCard ? leaderCard.name : "Not set"}</p>
            <p className="text-xs text-white/50">{leaderCard ? leaderCard.color : "Drop/select a Leader card first"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Status</p>
            <div className={`mt-1 inline-flex items-center gap-2 text-sm font-bold ${isValid ? "text-green-400" : "text-amber-400"}`}>
              {isValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {isValid ? "Battle Ready" : "Needs tuning"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Set sail to a card..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
                <option value="">All Colors</option>
                {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
                <option value="">All Types</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {(query || colorFilter || typeFilter) ? (
                <button onClick={() => { setQuery(""); setColorFilter(""); setTypeFilter(""); }} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white">
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {results.map((card) => {
              const qty = card.type === "Leader"
                ? (deck.leaderId === card.id ? 1 : 0)
                : (deck.cards.find((c) => c.cardId === card.id)?.quantity ?? 0);

              return (
                <motion.div
                  key={card.id}
                  draggable
                  onDragStart={(e: any) => e.dataTransfer?.setData("text/plain", card.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addCard(card)}
                  className={`relative cursor-grab overflow-hidden rounded-xl border ${qty > 0 ? "border-[var(--theme-accent)]" : "border-white/10"}`}
                >
                  <img src={imageFor(card.id)} alt={card.name} className={`aspect-[63/88] w-full object-cover ${maxRarityView ? "holo-card" : ""}`} />
                  {qty > 0 ? <span className="absolute right-1 top-1 rounded-full bg-[var(--theme-accent)] px-1.5 text-[10px] font-black text-black">{qty}</span> : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-1">
                    <p className="truncate text-[9px] text-white/85">{card.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <input
              value={deck.name}
              onChange={(e) => setDeck((d) => ({ ...d, name: e.target.value }))}
              className="w-full border-b border-white/10 bg-transparent pb-1 text-lg font-bold text-white outline-none"
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDropActive(false);
                handleDropCard(e.dataTransfer.getData("text/plain"));
              }}
              className={`mt-3 rounded-xl border border-dashed p-3 text-xs transition-all ${isDropActive ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/10 text-white" : "border-white/20 bg-black/20 text-white/55"}`}
            >
              Drag card here to add to deck
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-white/10 bg-black/20 p-2"><p className="text-[10px] text-white/45">Leader</p><p className="mt-1 text-xs font-bold text-white">{deck.leaderId ? "SET" : "NONE"}</p></div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2"><p className="text-[10px] text-white/45">Main</p><p className="mt-1 text-xs font-bold text-white">{deck.cards.reduce((s, c) => s + c.quantity, 0)}</p></div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2"><p className="text-[10px] text-white/45">Total</p><p className="mt-1 text-xs font-bold text-white">{totalCards}/50</p></div>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-white/45"><Crown className="h-3 w-3" />Leader</p>
              {leaderCard ? (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--theme-ring)] bg-black/20 p-2">
                  <img src={imageFor(leaderCard.id)} alt={leaderCard.name} className={`h-14 w-10 rounded object-cover ${maxRarityView ? "holo-card" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{leaderCard.name}</p>
                    <p className="text-[10px] text-white/45">{leaderCard.id} · {leaderCard.color}</p>
                  </div>
                  <button onClick={() => setDeck((d) => ({ ...d, leaderId: null }))} className="text-white/45 hover:text-red-400"><X className="h-4 w-4" /></button>
                </div>
              ) : <p className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/35">Pick or drop a Leader card</p>}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">Captain's Tech Board (drag to reorder)</p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                {techSlots.length === 0 ? (
                  <p className="text-xs text-white/35">Mark cards with the T button to pin up to 8 key tech slots.</p>
                ) : (
                  <div className="flex flex-wrap items-end gap-1">
                    {techSlots.map((cardId, idx) => {
                      const card = allCards.get(cardId);
                      if (!card) return null;
                      return (
                        <div
                          key={cardId}
                          draggable
                          onDragStart={(e: any) => e.dataTransfer?.setData("text/tech-index", String(idx))}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e: any) => {
                            const from = Number(e.dataTransfer?.getData("text/tech-index"));
                            reorderTechSlots(from, idx);
                          }}
                          className="cursor-grab"
                          style={{ transform: `rotate(${(idx - (techSlots.length - 1) / 2) * 4}deg)` }}
                          title={`${idx + 1}. ${card.name}`}
                        >
                          <img src={imageFor(cardId)} alt={card.name} className={`h-16 w-11 rounded border border-white/20 object-cover shadow-lg ${maxRarityView ? "holo-card" : ""}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">Visual Stack</p>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                <AnimatePresence>
                  {deck.cards.map(({ cardId, quantity }) => {
                    const card = allCards.get(cardId);
                    if (!card) return null;
                    return (
                      <motion.div key={cardId} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5">
                        <img src={imageFor(cardId)} alt={card.name} className={`h-10 w-7 rounded object-cover ${maxRarityView ? "holo-card" : ""}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-white">{card.name}</p>
                          <p className="text-[10px] text-white/40">{card.id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => removeOne(cardId)} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"><Minus className="h-3 w-3" /></button>
                          <span className="w-4 text-center text-xs font-bold text-white">{quantity}</span>
                          <button onClick={() => addCard(card)} disabled={quantity >= 4} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                          <button
                            onClick={() => toggleTechSlot(cardId)}
                            className={`rounded px-1.5 py-1 text-[10px] font-bold ${techSlots.includes(cardId) ? "bg-[var(--theme-accent)] text-black" : "bg-white/10 text-white/65 hover:text-white"}`}
                            title="Toggle tech slot"
                          >
                            T
                          </button>
                          <button onClick={() => removeCard(cardId)} className="rounded p-1 text-white/40 hover:text-red-400"><X className="h-3 w-3" /></button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">DON Curve</p>
              <div className="flex items-end gap-1 rounded-xl border border-white/10 bg-black/25 p-2">
                {curveBuckets.map((b) => {
                  const h = Math.max(8, Math.round((b.count / maxCurveCount) * 58));
                  return (
                    <div key={b.cost} className="flex-1 text-center">
                      <div className="mx-auto flex w-full max-w-[26px] items-end justify-center rounded-sm border border-white/20 bg-[#0f1117] text-[9px] font-black text-white" style={{ height: `${h}px` }}>
                        {b.count > 0 ? b.count : ""}
                      </div>
                      <p className="mt-1 text-[9px] text-white/45">{b.cost}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <DonButton onClick={saveDeck}>{saved ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Saved</span> : <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" />Save</span>}</DonButton>
              <DonButton onClick={exportDeck}>{exported ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Copied</span> : <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" />Export</span>}</DonButton>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setDeck(newDeck())} className="flex items-center justify-center gap-1 rounded-xl border border-red-500/30 py-2 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
              <Link href="/decks" className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2 text-xs text-white/60 hover:text-white">
                <BookOpen className="h-3.5 w-3.5" /> My Decks
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

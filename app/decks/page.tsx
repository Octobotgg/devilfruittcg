"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronUp,
  CheckCircle2,
  Copy,
  Crown,
  Eye,
  Filter,
  FlaskConical,
  Globe2,
  Lock,
  Loader2,
  Minus,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import type { Card } from "@/lib/cards";
import CardModal, { type CardModalData } from "@/components/CardModal";
import DonButton from "@/components/ui/DonButton";
import { getBaseCardId } from "@/lib/card-variants";
import type { Deck } from "@/lib/cloud/types";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { fetchWithClientAuth } from "@/lib/client-auth";
import { buildDeckSummaryPatch } from "@/lib/profile-summary";
import { logProfileActivity, syncProfileSummaryPatch } from "@/lib/profile-sync-client";

type StatusFilter = "all" | "ready" | "draft";
type SortMode = "updated" | "created" | "name";
type DeckPreviewGroup = {
  key: "leader" | "character" | "event" | "stage";
  label: string;
  total: number;
  entries: Array<{ card: Card; quantity: number; imageCardId: string }>;
};

type FeaturedNotice = {
  tone: "error" | "success";
  message: string;
};

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Purple: "#a855f7",
  Black: "#6b7280",
  Yellow: "#eab308",
};

function mainDeckCardCount(deck: Deck) {
  return deck.cards.reduce((sum, c) => sum + c.quantity, 0);
}

function uniqueCards(deck: Deck) {
  return deck.cards.length + (deck.leaderId ? 1 : 0);
}

function isBattleReady(deck: Deck) {
  return Boolean(deck.leaderId) && mainDeckCardCount(deck) === 50;
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

function makeDeckCopy(base: Deck): Deck {
  const now = new Date().toISOString();
  return {
    ...base,
    id: `copy-${globalThis.crypto?.randomUUID?.() || now}`,
    name: `${base.name} (Copy)`,
    visibility: "private",
    createdAt: now,
    updatedAt: now,
  };
}

function countRecentlyUpdated(decks: Deck[]) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  return decks.filter((deck) => new Date(deck.updatedAt).getTime() >= cutoff).length;
}

function buildCardModalData(card: Card): CardModalData {
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setCode: card.setCode,
    number: card.number,
    type: card.type,
    color: card.color,
    rarity: card.rarity,
    cost: card.cost,
    power: card.power,
    attribute: card.attribute,
    imageUrl: card.imageUrl,
    variantType: card.variantType,
    variantLabel: card.variantLabel,
    canonicalVariantId: card.canonicalVariantId,
    variantOrder: card.variantOrder,
  };
}

function normalizeDeckVariantId(cardId: string, variantId?: string | null) {
  const baseId = getBaseCardId(cardId.toUpperCase());
  const nextVariantId = String(variantId || "").trim().toUpperCase();
  if (!nextVariantId || nextVariantId === baseId) return undefined;
  return nextVariantId;
}

function resolveDeckImageId(cardId: string, variantId?: string | null) {
  return normalizeDeckVariantId(cardId, variantId) || getBaseCardId(cardId.toUpperCase());
}

function compareDeckCardsByCost(a: Card, b: Card) {
  const costA = typeof a.cost === "number" ? a.cost : Number(a.cost ?? 0);
  const costB = typeof b.cost === "number" ? b.cost : Number(b.cost ?? 0);
  if (costA !== costB) return costA - costB;
  return a.name.localeCompare(b.name);
}

function buildDeckPreviewGroups(deck: Deck, cardCache: Map<string, Card>): DeckPreviewGroup[] {
  const groups: DeckPreviewGroup[] = [];

  if (deck.leaderId) {
    const leaderCard = cardCache.get(deck.leaderId);
    if (leaderCard) {
      groups.push({
        key: "leader",
        label: "Leader",
        total: 1,
        entries: [{ card: leaderCard, quantity: 1, imageCardId: resolveDeckImageId(deck.leaderId, deck.leaderVariantId) }],
      });
    }
  }

  const typeBuckets = new Map<DeckPreviewGroup["key"], Array<{ card: Card; quantity: number; imageCardId: string }>>([
    ["character", []],
    ["event", []],
    ["stage", []],
  ]);

  deck.cards.forEach((entry) => {
    const card = cardCache.get(entry.cardId);
    if (!card) return;
    const imageCardId = resolveDeckImageId(entry.cardId, entry.variantId);

    if (card.type === "Character") typeBuckets.get("character")?.push({ card, quantity: entry.quantity, imageCardId });
    if (card.type === "Event") typeBuckets.get("event")?.push({ card, quantity: entry.quantity, imageCardId });
    if (card.type === "Stage") typeBuckets.get("stage")?.push({ card, quantity: entry.quantity, imageCardId });
  });

  ([
    ["character", "Characters"],
    ["event", "Events"],
    ["stage", "Stages"],
  ] as const).forEach(([key, label]) => {
    const entries = [...(typeBuckets.get(key) || [])].sort((a, b) => compareDeckCardsByCost(a.card, b.card));
    if (!entries.length) return;
    groups.push({
      key,
      label,
      total: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      entries,
    });
  });

  return groups;
}

function normalizeFeaturedDeckIds(ids: string[]) {
  return Array.from(new Set(ids.map((deckId) => String(deckId || "").trim()).filter(Boolean))).slice(0, 3);
}

function deckVisibility(deck: Deck) {
  return deck.visibility === "public" ? "public" : "private";
}

export default function DecksPage() {
  const { loadDecks: loadDecksFromStore, saveDecks: saveDecksToStore, ready: cloudReady, user, hasCloud } = useCloudSync();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCache, setCardCache] = useState<Map<string, Card>>(new Map());
  const hydratedIdsRef = useRef<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewResults, setPreviewResults] = useState<Card[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);
  const [featuredDeckIds, setFeaturedDeckIds] = useState<string[]>([]);
  const [featuredDeckSavingId, setFeaturedDeckSavingId] = useState<string | null>(null);
  const [featuredNotice, setFeaturedNotice] = useState<FeaturedNotice | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");

  async function persist(
    next: Deck[],
    activity?: {
      kind: "deck_created" | "deck_updated";
      title: string;
      detail: string;
      deckId: string;
    },
  ) {
    setDecks(next);
    await saveDecksToStore(next);

    if (!user) return;

    const tasks: Promise<unknown>[] = [
      syncProfileSummaryPatch(
        buildDeckSummaryPatch({
          decks: next,
          cards: Array.from(cardCache.values()),
        }),
      ),
    ];

    if (activity) {
      tasks.push(
        logProfileActivity({
          kind: activity.kind,
          title: activity.title,
          detail: activity.detail,
          deckId: activity.deckId,
          publicVisible: true,
        }),
      );
    }

    await Promise.allSettled(tasks);
  }

  useEffect(() => {
    if (!cloudReady) return;

    let cancelled = false;

    void loadDecksFromStore()
      .then((next) => {
        if (cancelled) return;
        setDecks(next);
        setStorageReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setDecks([]);
        setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudReady, loadDecksFromStore]);

  useEffect(() => {
    if (!cloudReady) return;
    if (!user) {
      setFeaturedDeckIds([]);
      return;
    }

    let cancelled = false;

    void fetchWithClientAuth("/api/me/profile", { cache: "no-store" })
      .then(async (res) => (res.ok ? await res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const nextIds = Array.isArray(json?.profile?.featuredDeckIds)
          ? normalizeFeaturedDeckIds(json.profile.featuredDeckIds as string[])
          : [];
        setFeaturedDeckIds(nextIds);
      })
      .catch(() => {
        if (!cancelled) setFeaturedDeckIds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudReady, user]);

  useEffect(() => {
    setPreviewSearch("");
    setPreviewResults([]);
    setPreviewLoading(false);
  }, [expandedDeckId]);

  useEffect(() => {
    if (!featuredNotice) return;
    const timeout = window.setTimeout(() => setFeaturedNotice(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [featuredNotice]);

  const allCardIds = useMemo(() => {
    const ids = new Set<string>();
    decks.forEach((deck) => {
      if (deck.leaderId) ids.add(deck.leaderId);
      if (deck.leaderId && deck.leaderVariantId) ids.add(resolveDeckImageId(deck.leaderId, deck.leaderVariantId));
      deck.cards.forEach((c) => ids.add(c.cardId));
      deck.cards.forEach((c) => {
        if (c.variantId) ids.add(resolveDeckImageId(c.cardId, c.variantId));
      });
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

  const expandedDeck = useMemo(
    () => (expandedDeckId ? decks.find((deck) => deck.id === expandedDeckId) || null : null),
    [decks, expandedDeckId],
  );

  useEffect(() => {
    if (expandedDeckId && !expandedDeck) {
      setExpandedDeckId(null);
    }
  }, [expandedDeck, expandedDeckId]);

  useEffect(() => {
    if (!expandedDeck) return;

    const ids = new Set<string>();
    if (expandedDeck.leaderId) ids.add(expandedDeck.leaderId);
    if (expandedDeck.leaderId && expandedDeck.leaderVariantId) ids.add(resolveDeckImageId(expandedDeck.leaderId, expandedDeck.leaderVariantId));
    expandedDeck.cards.forEach((entry) => ids.add(entry.cardId));
    expandedDeck.cards.forEach((entry) => {
      if (entry.variantId) ids.add(resolveDeckImageId(entry.cardId, entry.variantId));
    });

    const missing = Array.from(ids).filter((id) => !cardCache.has(id));
    if (!missing.length) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/cards?ids=${encodeURIComponent(missing.join(","))}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to hydrate deck preview");
        const json = await res.json();
        const results = Array.isArray(json.results) ? (json.results as Card[]) : [];

        if (cancelled) return;

        setCardCache((prev) => {
          const next = new Map(prev);
          results.forEach((card) => {
            hydratedIdsRef.current.add(card.id);
            next.set(card.id, card);
          });
          return next;
        });
      } catch {
        // keep current cache
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardCache, expandedDeck]);

  useEffect(() => {
    const trimmed = previewSearch.trim();
    if (!expandedDeckId || trimmed.length < 2) {
      setPreviewResults([]);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/cards?q=${encodeURIComponent(trimmed)}&pageSize=8`, { cache: "no-store" });
          if (!res.ok) throw new Error("Unable to search cards");
          const json = await res.json();
          const results = Array.isArray(json.results) ? (json.results as Card[]) : [];

          if (cancelled) return;

          setPreviewResults(results);
          setCardCache((prev) => {
            const next = new Map(prev);
            results.forEach((card) => next.set(card.id, card));
            return next;
          });
        } catch {
          if (!cancelled) setPreviewResults([]);
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      })();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [expandedDeckId, previewSearch]);

  function updateDeck(deckId: string, updater: (deck: Deck) => Deck) {
    let updatedDeck: Deck | undefined;
    const next = decks.map((deck) => {
      if (deck.id !== deckId) return deck;
      updatedDeck = updater(deck);
      return updatedDeck;
    });
    if (!updatedDeck) {
      void persist(next);
      return;
    }

    const changedDeck: Deck = updatedDeck;
    const activity = {
      kind: "deck_updated" as const,
      title: `Updated ${changedDeck.name}`,
      detail: `Updated deck: ${changedDeck.name}.`,
      deckId: changedDeck.id,
    };

    void persist(next, activity);
  }

  function deleteDeck(id: string) {
    const deck = decks.find((d) => d.id === id);
    const ok = window.confirm(`Delete deck \"${deck?.name || "Untitled"}\"?`);
    if (!ok) return;
    if (featuredDeckIds.includes(id)) {
      const nextFeatured = featuredDeckIds.filter((deckId) => deckId !== id);
      setFeaturedDeckIds(nextFeatured);
      void saveFeaturedDeckIds(nextFeatured);
    }
    void persist(decks.filter((d) => d.id !== id));
  }

  function duplicateDeck(id: string) {
    const base = decks.find((d) => d.id === id);
    if (!base) return;
    const copy = makeDeckCopy(base);
    void persist([copy, ...decks], {
      kind: "deck_created",
      title: `Built ${copy.name}`,
      detail: `Built a new deck: ${copy.name}.`,
      deckId: copy.id,
    });
  }

  function toggleDeckPreview(deckId: string) {
    setExpandedDeckId((current) => (current === deckId ? null : deckId));
  }

  async function saveFeaturedDeckIds(nextIds: string[]) {
    if (!user) return false;
    const normalized = normalizeFeaturedDeckIds(nextIds);

    try {
      const res = await fetchWithClientAuth("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredDeckIds: normalized }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(String(json?.error || "Could not update featured decks."));
      }

      const syncedIds = Array.isArray(json?.profile?.featuredDeckIds)
        ? normalizeFeaturedDeckIds(json.profile.featuredDeckIds as string[])
        : normalized;
      setFeaturedDeckIds(syncedIds);
      return true;
    } catch (error) {
      setFeaturedNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update featured decks.",
      });
      return false;
    }
  }

  async function toggleFeaturedDeck(deckId: string) {
    if (!user) {
      setFeaturedNotice({ tone: "error", message: "Sign in to feature decks on your profile." });
      return;
    }

    const deck = decks.find((row) => row.id === deckId);
    if (!deck) return;

    const isFeatured = featuredDeckIds.includes(deckId);
    if (!isFeatured && deckVisibility(deck) !== "public") {
      setFeaturedNotice({ tone: "error", message: "Make a deck public before featuring it on your profile." });
      return;
    }

    if (!isFeatured && featuredDeckIds.length >= 3) {
      setFeaturedNotice({ tone: "error", message: "You can feature up to 3 decks. Unpin one first." });
      return;
    }

    const nextIds = isFeatured
      ? featuredDeckIds.filter((id) => id !== deckId)
      : [...featuredDeckIds, deckId];

    setFeaturedDeckSavingId(deckId);
    setFeaturedDeckIds(nextIds);

    const ok = await saveFeaturedDeckIds(nextIds);
    if (ok) {
      setFeaturedNotice({
        tone: "success",
        message: isFeatured ? "Deck removed from your profile." : "Deck featured on your profile.",
      });
    } else {
      setFeaturedDeckIds(featuredDeckIds);
    }

    setFeaturedDeckSavingId(null);
  }

  async function setDeckVisibility(deckId: string, nextVisibility: "public" | "private") {
    const deck = decks.find((row) => row.id === deckId);
    if (!deck || deckVisibility(deck) === nextVisibility) return;

    const nextDecks = decks.map((row) =>
      row.id === deckId
        ? { ...row, visibility: nextVisibility, updatedAt: new Date().toISOString() }
        : row,
    );

    const nextFeaturedIds =
      nextVisibility === "private"
        ? featuredDeckIds.filter((rowId) => rowId !== deckId)
        : featuredDeckIds;

    const removedFromProfile = nextFeaturedIds.length !== featuredDeckIds.length;

    setDecks(nextDecks);
    if (removedFromProfile) {
      setFeaturedDeckIds(nextFeaturedIds);
    }

    await persist(nextDecks, {
      kind: "deck_updated",
      title: `Updated ${deck.name}`,
      detail:
        nextVisibility === "public"
          ? `Made ${deck.name} public on the profile.`
          : `Made ${deck.name} private in Crew Hangar.`,
      deckId,
    });

    if (removedFromProfile) {
      const ok = await saveFeaturedDeckIds(nextFeaturedIds);
      if (!ok) {
        setFeaturedDeckIds(featuredDeckIds);
      }
    }

    setFeaturedNotice({
      tone: "success",
      message:
        nextVisibility === "public"
          ? `${deck.name} is now public on your profile.`
          : removedFromProfile
            ? `${deck.name} is now private and was removed from your featured decks.`
            : `${deck.name} is now private.`,
    });
  }

  function removeCardFromDeck(deckId: string, card: Card) {
    updateDeck(deckId, (deck) => {
      const nextDeck: Deck = { ...deck, cards: [...deck.cards], updatedAt: new Date().toISOString() };

      if (card.type === "Leader") {
        nextDeck.leaderId = null;
        nextDeck.leaderVariantId = null;
        return nextDeck;
      }

      nextDeck.cards = nextDeck.cards
        .map((entry) =>
          entry.cardId === card.id
            ? { ...entry, quantity: Math.max(0, entry.quantity - 1) }
            : entry,
        )
        .filter((entry) => entry.quantity > 0);

      return nextDeck;
    });
  }

  function addCardToDeck(deckId: string, card: Card) {
    updateDeck(deckId, (deck) => {
      const nextDeck: Deck = { ...deck, cards: [...deck.cards], updatedAt: new Date().toISOString() };
      const baseId = getBaseCardId(card.id.toUpperCase());
      const variantId = normalizeDeckVariantId(baseId, card.id);

      if (card.type === "Leader") {
        nextDeck.leaderId = baseId;
        nextDeck.leaderVariantId = variantId ?? null;
        return nextDeck;
      }

      const existingIndex = nextDeck.cards.findIndex((entry) => entry.cardId === baseId);
      if (existingIndex >= 0) {
        nextDeck.cards[existingIndex] = {
          ...nextDeck.cards[existingIndex],
          quantity: Math.min(4, nextDeck.cards[existingIndex].quantity + 1),
          ...(variantId ? { variantId } : {}),
        };
      } else {
        nextDeck.cards.push({ cardId: baseId, quantity: 1, ...(variantId ? { variantId } : {}) });
      }

      return nextDeck;
    });
    setPreviewSearch("");
    setPreviewResults([]);
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
    ? Math.round((decks.reduce((sum, d) => sum + Math.min(50, mainDeckCardCount(d)), 0) / (totalDecks * 50)) * 100)
    : 0;
  const recentlyUpdated = countRecentlyUpdated(decks);
  const storageLabel = user ? "Account sync active" : hasCloud ? "Sign in required to save decks" : "Saved locally";

  return (
    <div className="space-y-6 pb-20">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
              <FlaskConical className="h-3.5 w-3.5" /> Deck Lab Archive
            </div>
            <h1 className="mt-3 text-3xl font-black text-[var(--color-navy)] md:text-4xl">Your Crew Hangar</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-mid)]">
              Manage every saved list, track build readiness, and jump back into Deck Lab with one click.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-light)]">
              {user ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Loader2 className={`h-3.5 w-3.5 ${storageReady ? "text-[var(--color-text-light)]" : "animate-spin text-[var(--color-text-light)]"}`} />}
              {storageReady ? storageLabel : "Checking saved decks"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/deckbuilder">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)]"
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
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Vault</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{totalDecks}</p>
            <p className="text-xs text-[var(--color-text-light)]">Saved lists</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Battle Ready</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{readyDecks}</p>
            <p className="text-xs text-[var(--color-text-light)]">50 cards + leader</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Avg Completion</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-gold-dark)]">{avgCompletion}%</p>
            <p className="text-xs text-[var(--color-text-light)]">Across all decks</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Updated (7d)</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{recentlyUpdated}</p>
            <p className="text-xs text-[var(--color-text-light)]">Recently tuned</p>
          </div>
        </div>
      </section>

      {!storageReady ? (
        <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-5 py-14 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--color-text-light)]" />
          <p className="mt-4 text-sm text-[var(--color-text-light)]">Loading your saved decks...</p>
        </section>
      ) : totalDecks === 0 ? (
        <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-5 py-14 text-center">
          <BookOpen className="mx-auto h-14 w-14 text-[var(--color-text-light)]" />
          <h2 className="mt-4 text-xl font-black text-[var(--color-navy)]">No crews in your hangar yet</h2>
          <p className="mt-2 text-sm text-[var(--color-text-light)]">Build your first deck and it will appear here instantly.</p>
          <div className="mt-6">
            <DonButton href="/deckbuilder" className="px-6 py-3 text-[11px]">Start in Deck Lab</DonButton>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 shadow-[0_18px_40px_rgba(42,33,24,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-light)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by deck name, leader, or card ID..."
                  className="w-full rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-[var(--color-text-light)]" />
                  {(["all", "ready", "draft"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                        statusFilter === f
                          ? "bg-[rgba(212,160,84,0.16)] text-[var(--color-gold-dark)]"
                          : "text-[var(--color-text-light)] hover:text-[var(--color-text-dark)]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-text-mid)]"
                >
                  <option value="updated">Sort: Updated</option>
                  <option value="created">Sort: Created</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>
          </section>

          {featuredNotice ? (
            <section
              className={`rounded-2xl border px-4 py-3 text-sm ${
                featuredNotice.tone === "error"
                  ? "border-red-300/35 bg-red-50 text-red-700"
                  : "border-emerald-300/35 bg-emerald-50 text-emerald-700"
              }`}
            >
              {featuredNotice.message}
            </section>
          ) : null}

          {filteredDecks.length === 0 ? (
            <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-text-light)]">No decks match your current search/filter.</p>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {filteredDecks.map((deck, index) => {
                  const leader = deck.leaderId ? cardCache.get(deck.leaderId) : null;
                  const leaderImageId = deck.leaderId ? resolveDeckImageId(deck.leaderId, deck.leaderVariantId) : null;
                  const total = mainDeckCardCount(deck);
                  const unique = uniqueCards(deck);
                  const ready = isBattleReady(deck);
                  const colors = colorBreakdown(deck);
                  const isFeaturedDeck = featuredDeckIds.includes(deck.id);
                  const previewOpen = expandedDeckId === deck.id;
                  const previewGroups = previewOpen ? buildDeckPreviewGroups(deck, cardCache) : [];
                  const previewHasLeader = Boolean(deck.leaderId);

                  return (
                    <motion.article
                      key={deck.id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: index * 0.03 }}
                      className="group relative overflow-hidden rounded-2xl border border-[var(--color-parchment-dark)] bg-[linear-gradient(180deg,rgba(245,239,227,0.98),rgba(250,247,242,0.98))] shadow-[0_22px_48px_rgba(42,33,24,0.1)]"
                    >
                      {deck.leaderId ? (
                        <div className="pointer-events-none absolute inset-0 opacity-[0.14] transition-opacity duration-200 group-hover:opacity-[0.2]">
                          <img
                            src={`/api/card-image?id=${encodeURIComponent(leaderImageId || deck.leaderId)}`}
                            alt=""
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(250,247,242,0.32),rgba(250,247,242,0.92)_44%,rgba(245,239,227,0.98))]" />

                      <div className="relative space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          {deck.leaderId ? (
                            <div className="relative shrink-0">
                              <img
                                src={`/api/card-image?id=${encodeURIComponent(leaderImageId || deck.leaderId)}`}
                                alt={leader?.name || "Leader"}
                                className="h-20 w-14 rounded-xl border border-[var(--color-parchment-dark)] object-cover shadow-[0_10px_24px_rgba(42,33,24,0.16)]"
                              />
                              <div className="absolute -right-1 -top-1 rounded-full bg-[var(--theme-accent)] p-1">
                                <Crown className="h-2.5 w-2.5 text-black" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--color-parchment-dark)] bg-[var(--color-parchment)]">
                              <Crown className="h-4 w-4 text-[var(--color-text-light)]" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[var(--color-navy)]">{deck.name}</p>
                            <p className="truncate text-[11px] text-[var(--color-text-light)]">{leader?.name || "No leader selected"}</p>

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

                            <div className="mt-2">
                              {deckVisibility(deck) === "public" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-700">
                                  <Globe2 className="h-3 w-3" /> Public
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)]">
                                  <Lock className="h-3 w-3" /> Private
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
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)]"
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_HEX[color] || "#999" }} />
                                {color} · {count}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-light)]">Cards</p>
                            <p className="text-sm font-black text-[var(--color-text-dark)]">{total}/50</p>
                          </div>
                          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-light)]">Unique</p>
                            <p className="text-sm font-black text-[var(--color-text-dark)]">{unique}</p>
                          </div>
                          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-2">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-light)]">Updated</p>
                            <p className="text-sm font-black text-[var(--color-text-dark)]">{recency(deck.updatedAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--color-parchment-dark)] pt-2 text-[11px] text-[var(--color-text-light)]">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatShortDate(deck.createdAt)}</span>
                          <span>#{deck.id.slice(-4)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/deckbuilder?id=${deck.id}`} className="flex-1">
                            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-dark)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)]">
                              Open in Lab <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </Link>

                          <button
                            onClick={() => toggleDeckPreview(deck.id)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                              previewOpen
                                ? "border-[#F0C040]/35 bg-[#F0C040]/12 text-[#F0C040]"
                                : "border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[var(--color-text-dark)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)]"
                            }`}
                            title={previewOpen ? "Hide deck preview" : "View deck"}
                          >
                            {previewOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{previewOpen ? "Hide Deck" : "View Deck"}</span>
                          </button>

                          <button
                            onClick={() => {
                              void setDeckVisibility(deck.id, deckVisibility(deck) === "public" ? "private" : "public");
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                              deckVisibility(deck) === "public"
                                ? "border-sky-300/35 bg-sky-50 text-sky-700"
                                : "border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[var(--color-text-dark)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)]"
                            }`}
                            title={deckVisibility(deck) === "public" ? "Make deck private" : "Make deck public"}
                          >
                            {deckVisibility(deck) === "public" ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{deckVisibility(deck) === "public" ? "Public" : "Private"}</span>
                          </button>

                          <button
                            onClick={() => {
                              void toggleFeaturedDeck(deck.id);
                            }}
                            disabled={featuredDeckSavingId === deck.id}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                              isFeaturedDeck
                                ? "border-[#F0C040]/35 bg-[#F0C040]/12 text-[#F0C040]"
                                : "border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[var(--color-text-mid)] hover:text-[var(--color-text-dark)]"
                            } disabled:opacity-60`}
                            title={isFeaturedDeck ? "Remove from profile" : "Feature on profile"}
                            aria-label={isFeaturedDeck ? `Remove ${deck.name} from profile` : `Feature ${deck.name} on profile`}
                          >
                            {featuredDeckSavingId === deck.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className={`h-3.5 w-3.5 ${isFeaturedDeck ? "fill-current" : ""}`} />}
                          </button>

                          <button
                            onClick={() => duplicateDeck(deck.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[var(--color-text-mid)] hover:text-[var(--color-text-dark)]"
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

                        <AnimatePresence initial={false}>
                          {previewOpen ? (
                            <motion.div
                              key={`${deck.id}-preview`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                                <div className="flex items-start justify-between gap-3 border-b border-[var(--color-parchment-dark)] pb-3">
                                  <div>
                                    <p className="text-lg font-black text-[var(--color-navy)]">{deck.name}</p>
                                    <p className="text-sm text-[var(--color-text-mid)]">{leader?.name || "No leader set."}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-light)]">Main Deck</p>
                                      <p className="text-sm font-black text-[#F0C040]">{total}/50</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedDeckId(null)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)] hover:text-[var(--color-text-dark)]"
                                      aria-label={`Collapse ${deck.name}`}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {!previewHasLeader ? (
                                  <p className="mt-3 text-sm text-[var(--color-text-light)]">No leader set.</p>
                                ) : null}

                                <div className="mt-4 space-y-4">
                                  {previewGroups.map((group) => (
                                    <section key={`${deck.id}-${group.key}`} className="space-y-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                                          {group.key === "leader" ? group.label : `${group.label} (${group.total})`}
                                        </p>
                                      </div>

                                      <div className="flex flex-wrap gap-3">
                                        {group.entries.map(({ card, quantity, imageCardId }) => (
                                          <div
                                            key={`${deck.id}-${group.key}-${card.id}-${imageCardId}`}
                                            className={`group/card relative ${
                                              group.key === "leader" ? "w-[96px] sm:w-[112px]" : "w-[68px] sm:w-[88px]"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => setModalCard(buildCardModalData(cardCache.get(imageCardId) || card))}
                                              className="block w-full"
                                              aria-label={`Open ${card.name}`}
                                            >
                                              <img
                                                src={`/api/card-image?id=${encodeURIComponent(imageCardId)}`}
                                                alt={card.name}
                                                className={`w-full rounded-xl border border-[var(--color-parchment-dark)] object-cover shadow-[0_12px_28px_rgba(42,33,24,0.18)] ${
                                                  group.key === "leader" ? "h-[134px] sm:h-[156px]" : "h-[96px] sm:h-[124px]"
                                                }`}
                                              />
                                            </button>

                                            <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-[rgba(42,33,24,0.9)] to-transparent px-2 pb-2 pt-6">
                                              <p className="line-clamp-2 text-[10px] font-bold text-[var(--color-cream)]">{card.name}</p>
                                            </div>

                                            {group.key !== "leader" ? (
                                              <span className="absolute left-2 top-2 rounded-full bg-[#F0C040] px-2 py-0.5 text-[10px] font-black text-black">
                                                ×{quantity}
                                              </span>
                                            ) : null}

                                            <button
                                              type="button"
                                              onClick={() => removeCardFromDeck(deck.id, card)}
                                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-300/35 bg-red-500/90 text-white opacity-100 shadow-lg transition-opacity md:opacity-0 md:group-hover/card:opacity-100"
                                              aria-label={group.key === "leader" ? `Remove leader ${card.name}` : `Remove one copy of ${card.name}`}
                                            >
                                              <Minus className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </section>
                                  ))}
                                </div>

                                <div className="mt-5 border-t border-[var(--color-parchment-dark)] pt-4">
                                  <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                                    Quick Add a Card
                                  </label>
                                  <div className="relative mt-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-light)]" />
                                    <input
                                      value={previewSearch}
                                      onChange={(event) => setPreviewSearch(event.target.value)}
                                      placeholder="Quick add a card..."
                                      className="w-full rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] py-3 pl-9 pr-3 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)]"
                                    />
                                  </div>

                                  {previewSearch.trim().length >= 2 ? (
                                    <div className="mt-3 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)]">
                                      {previewLoading ? (
                                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--color-text-mid)]">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Searching cards...
                                        </div>
                                      ) : previewResults.length ? (
                                        <div className="divide-y divide-[var(--color-parchment-dark)]">
                                          {previewResults.map((card) => (
                                            <button
                                              key={`${deck.id}-search-${card.id}`}
                                              type="button"
                                              onClick={() => addCardToDeck(deck.id, card)}
                                              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-parchment)]"
                                            >
                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-[var(--color-text-dark)]">{card.name}</p>
                                                <p className="text-[11px] text-[var(--color-text-light)]">
                                                  {card.id} · {card.type} · {card.setCode}
                                                </p>
                                              </div>
                                              <span className="rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-text-mid)]">
                                                Add
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-3 text-sm text-[var(--color-text-mid)]">No cards match that search.</div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-xs text-[var(--color-text-light)]">
                                      Type at least 2 characters to search the card database and add a card without leaving Crew Hangar.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
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

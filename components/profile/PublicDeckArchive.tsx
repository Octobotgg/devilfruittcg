"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Eye, Globe2 } from "lucide-react";
import CardModal, { type CardModalData } from "@/components/CardModal";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import type { ProfilePublicDeck, ProfilePublicDeckCard } from "@/lib/profile-types";

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Purple: "#a855f7",
  Black: "#6b7280",
  Yellow: "#eab308",
};

type PublicDeckArchiveProps = {
  decks: ProfilePublicDeck[];
  targetUserId: string;
};

type PreviewGroup = {
  key: "leader" | "character" | "event" | "stage";
  label: string;
  total: number;
  entries: ProfilePublicDeckCard[];
};

function buildCardModalData(card: ProfilePublicDeckCard): CardModalData {
  return {
    id: card.cardId,
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
    imageUrl: `/api/card-image?id=${encodeURIComponent(card.imageCardId)}`,
  };
}

function compareCards(a: ProfilePublicDeckCard, b: ProfilePublicDeckCard) {
  const costA = typeof a.cost === "number" ? a.cost : Number.MAX_SAFE_INTEGER;
  const costB = typeof b.cost === "number" ? b.cost : Number.MAX_SAFE_INTEGER;
  if (costA !== costB) return costA - costB;
  return a.name.localeCompare(b.name);
}

function buildDeckGroups(deck: ProfilePublicDeck): PreviewGroup[] {
  const groups: PreviewGroup[] = [];

  if (deck.leaderCard) {
    groups.push({
      key: "leader",
      label: "Leader",
      total: 1,
      entries: [deck.leaderCard],
    });
  }

  const characters = deck.cards.filter((card) => card.type === "Character").sort(compareCards);
  const events = deck.cards.filter((card) => card.type === "Event").sort(compareCards);
  const stages = deck.cards.filter((card) => card.type === "Stage").sort(compareCards);

  if (characters.length) {
    groups.push({
      key: "character",
      label: "Characters",
      total: characters.reduce((sum, card) => sum + card.quantity, 0),
      entries: characters,
    });
  }

  if (events.length) {
    groups.push({
      key: "event",
      label: "Events",
      total: events.reduce((sum, card) => sum + card.quantity, 0),
      entries: events,
    });
  }

  if (stages.length) {
    groups.push({
      key: "stage",
      label: "Stages",
      total: stages.reduce((sum, card) => sum + card.quantity, 0),
      entries: stages,
    });
  }

  return groups;
}

export default function PublicDeckArchive({ decks, targetUserId }: PublicDeckArchiveProps) {
  const { user } = useCloudSync();
  const isOwner = Boolean(user && user.id === targetUserId);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const match = window.location.hash.match(/^#deck-(.+)$/);
      if (!match) return;
      const nextDeckId = decodeURIComponent(match[1]);
      if (decks.some((deck) => deck.deckId === nextDeckId)) {
        setExpandedDeckId(nextDeckId);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [decks]);

  const groupedDecks = useMemo(
    () => new Map(decks.map((deck) => [deck.deckId, buildDeckGroups(deck)])),
    [decks],
  );

  if (!decks.length) {
    return (
      <section className="profile-ledger-surface rounded-[2rem] p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Public Decks</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Open Deck Ledger</h2>
          </div>
          <Globe2 className="h-5 w-5 text-[var(--theme-accent-2)]" />
        </div>
        <p className="mt-5 text-sm text-[var(--color-text-mid)]">
          {isOwner
            ? "No public decks yet. Head to Crew Hangar and flip a deck public to show it here."
            : "No public decks available yet."}
        </p>
      </section>
    );
  }

  return (
    <section className="profile-ledger-surface rounded-[2rem] p-6">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Public Decks</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Open Deck Ledger</h2>
        </div>
        <Globe2 className="h-5 w-5 text-[var(--theme-accent-2)]" />
      </div>

      <p className="mt-3 text-sm text-[var(--color-text-mid)]">
        Public decks stay view-only here. Open a card to inspect the full art, or head to Crew Hangar to manage visibility.
      </p>

      <div className="mt-5 space-y-4">
        {decks.map((deck) => {
          const expanded = expandedDeckId === deck.deckId;
          const groups = groupedDecks.get(deck.deckId) || [];

          return (
            <article
              key={deck.deckId}
              id={`deck-${deck.deckId}`}
              className="profile-paper-card overflow-hidden rounded-[1.75rem]"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative shrink-0">
                    {deck.leaderImageId ? (
                      <img
                        src={`/api/card-image?id=${encodeURIComponent(deck.leaderImageId)}`}
                        alt={deck.leaderName || deck.name}
                        className="h-20 w-14 rounded-xl border border-[rgba(212,160,84,0.22)] object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded-xl border border-dashed border-[rgba(212,160,84,0.24)] bg-[rgba(255,249,235,0.62)]">
                        <Crown className="h-4 w-4 text-[var(--color-text-light)]" />
                      </div>
                    )}
                    {deck.isFeatured ? (
                      <div className="absolute -right-1 -top-1 rounded-full bg-[var(--theme-accent)] p-1">
                        <Crown className="h-2.5 w-2.5 text-black" />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-black text-[var(--color-navy)]">{deck.name}</p>
                      {deck.isFeatured ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-accent)]/25 bg-[var(--theme-accent)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--theme-accent-2)]">
                          Flagship
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--color-text-mid)]">{deck.leaderName || "No leader set"}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {deck.leaderColors.length ? deck.leaderColors.map((color) => (
                        <span
                          key={`${deck.deckId}-${color}`}
                          className="inline-flex items-center gap-1 rounded-full border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[color] || "#999" }} />
                          {color}
                        </span>
                      )) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-light)]">
                          Unknown color
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-text-light)]">
                      <span>{deck.mainDeckCount} cards</span>
                      <span>Updated {new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedDeckId((current) => current === deck.deckId ? null : deck.deckId)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${
                    expanded
                      ? "border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/12 text-[var(--theme-accent-2)]"
                      : "border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"
                  }`}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {expanded ? "Hide Decklist" : "View Decklist"}
                </button>
              </div>

              {expanded ? (
                <div className="border-t border-[rgba(212,160,84,0.18)] bg-[rgba(255,249,235,0.42)] p-4">
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.18)] bg-[rgba(250,247,242,0.78)] px-3 py-2 text-xs text-[var(--color-text-mid)]">
                    <Eye className="h-4 w-4 text-[var(--theme-accent-2)]" />
                    Read-only preview. Open any card image to inspect it.
                  </div>

                  <div className="space-y-5">
                    {groups.map((group) => (
                      <div key={`${deck.deckId}-${group.key}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                            {group.label} ({group.total})
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.entries.map((card) => (
                            <button
                              key={`${deck.deckId}-${group.key}-${card.cardId}-${card.variantId || "base"}`}
                              type="button"
                              onClick={() => setModalCard(buildCardModalData(card))}
                              className="group relative w-[5.6rem] text-left sm:w-[6rem]"
                            >
                              <div className="overflow-hidden rounded-2xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.78)] transition-colors group-hover:border-[rgba(212,160,84,0.42)]">
                                <img
                                  src={`/api/card-image?id=${encodeURIComponent(card.imageCardId)}`}
                                  alt={card.name}
                                  className={`w-full object-cover object-top ${group.key === "leader" ? "h-32 sm:h-36" : "h-28 sm:h-32"}`}
                                />
                              </div>
                              <span className="absolute right-1 top-1 rounded-full bg-[var(--color-navy)] px-2 py-0.5 text-[10px] font-black text-[var(--color-cream)]">
                                x{card.quantity}
                              </span>
                              <p className="mt-2 line-clamp-2 text-xs font-bold text-[var(--color-navy)]">{card.name}</p>
                              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-light)]">
                                {card.type}{card.cost != null ? ` · Cost ${card.cost}` : ""}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

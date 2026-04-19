"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import type { ProfileFeaturedDeck } from "@/lib/profile-types";

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Purple: "#a855f7",
  Black: "#6b7280",
  Yellow: "#eab308",
};

type FeaturedDecksProps = {
  decks: ProfileFeaturedDeck[];
  targetUserId: string;
};

function DeckCard({ deck }: { deck: ProfileFeaturedDeck }) {
  const content = (
    <div className="profile-paper-card overflow-hidden rounded-[1.5rem]">
      <div className="relative h-44 overflow-hidden bg-[rgba(27,40,56,0.18)] sm:h-48">
        {deck.leaderImageId ? (
          <img
            src={`/api/card-image?id=${encodeURIComponent(deck.leaderImageId)}`}
            alt={deck.leaderName || deck.name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-[var(--color-text-light)]">No leader art</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(27,40,56,0.92)] via-[rgba(27,40,56,0.55)] to-transparent px-4 pb-4 pt-10">
          <p className="truncate text-lg font-black text-[var(--color-cream)]">{deck.name}</p>
          <p className="text-sm text-[rgba(250,247,242,0.76)]">{deck.leaderName || "No leader set"}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
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

        <div className="flex items-center justify-between text-sm text-[var(--color-text-mid)]">
          <span>{deck.mainDeckCount} cards</span>
          <span>Updated {new Date(deck.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>

        <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.28)] bg-[rgba(212,160,84,0.1)] px-4 text-sm font-bold text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.16)]">
          View decklist
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  return (
    <Link href={`#deck-${deck.deckId}`} className="block transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

export default function FeaturedDecks({ decks, targetUserId }: FeaturedDecksProps) {
  const { user } = useCloudSync();
  const isOwner = Boolean(user && user.id === targetUserId);
  const emptySlots = isOwner ? Math.max(0, 3 - decks.length) : 0;

  return (
    <section className="profile-ledger-surface rounded-[2rem] p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Deck Showcase</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Flagship Decks</h2>
        </div>
        <Star className="h-5 w-5 text-[var(--theme-accent-2)]" />
      </div>

      {decks.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.deckId} deck={deck} />
          ))}

          {Array.from({ length: emptySlots }).map((_, index) => (
            <Link
              key={`empty-featured-slot-${index}`}
              href="/decks"
              className="profile-soft-tile flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border-dashed p-6 text-center sm:min-h-[21rem]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(212,160,84,0.22)] bg-[rgba(212,160,84,0.1)]">
                <Sparkles className="h-5 w-5 text-[var(--theme-accent-2)]" />
              </div>
              <p className="mt-4 text-lg font-black text-[var(--color-navy)]">Pin a deck</p>
              <p className="mt-2 max-w-[16rem] text-sm text-[var(--color-text-mid)]">
                Pick up to 3 public decks from your Crew Hangar to feature on your public profile.
              </p>
            </Link>
          ))}
        </div>
      ) : isOwner ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Link
              key={`owner-empty-slot-${index}`}
              href="/decks"
              className="profile-soft-tile flex min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border-dashed p-6 text-center sm:min-h-[21rem]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(212,160,84,0.22)] bg-[rgba(212,160,84,0.1)]">
                <Sparkles className="h-5 w-5 text-[var(--theme-accent-2)]" />
              </div>
              <p className="mt-4 text-lg font-black text-[var(--color-navy)]">Pin a deck</p>
              <p className="mt-2 max-w-[16rem] text-sm text-[var(--color-text-mid)]">
                Head to Crew Hangar, make a deck public, and mark it to feature it here.
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-[var(--color-text-light)]">No featured decks yet.</p>
      )}
    </section>
  );
}

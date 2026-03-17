import { BookOpen, Gem, Telescope, Trophy } from "lucide-react";
import type { ProfileSummary } from "@/lib/profile-types";

type ProfileStatCardsProps = {
  summary: ProfileSummary | null;
  followerCount: number;
};

const CARD_STYLES = [
  "md:rotate-[-1.4deg] md:-translate-y-1",
  "md:rotate-[1.2deg]",
  "md:rotate-[-0.8deg] md:translate-y-1",
  "md:rotate-[1deg] md:-translate-y-0.5",
];

const ICON_WRAP = "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f8d479]/25 bg-black/25 text-[var(--theme-accent-2)] shadow-[0_10px_24px_rgba(0,0,0,0.28)]";

export default function ProfileStatCards({ summary, followerCount }: ProfileStatCardsProps) {
  const cards = [
    {
      label: "Collection Value",
      value: `$${(summary?.collectionValue || 0).toFixed(2)}`,
      detail: `${summary?.setsCompleted || 0} sets completed`,
      icon: <Gem className="h-5 w-5" />,
    },
    {
      label: "Deck Lab",
      value: String(summary?.totalDecksBuilt || 0),
      detail: `${summary?.battleReadyDecks || 0} battle-ready decks`,
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Crew Reach",
      value: String(followerCount),
      detail: `${summary?.wishlistCount || 0} wishlist cards`,
      icon: <Telescope className="h-5 w-5" />,
    },
    {
      label: "Treasure Count",
      value: String(summary?.uniqueCardsOwned || 0),
      detail: `${summary?.totalCardsOwned || 0} total cards logged`,
      icon: <Trophy className="h-5 w-5" />,
    },
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Captain Snapshot</p>
          <h2 className="mt-2 text-2xl font-black text-white">Pirate&apos;s Bounty</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-[1.7rem] border border-[#f8d479]/16 bg-[linear-gradient(180deg,rgba(34,24,14,0.82),rgba(12,12,16,0.94))] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.28)] ${CARD_STYLES[index]}`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(0deg,transparent_24%,rgba(248,212,121,0.6)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(248,212,121,0.35)_25%,transparent_26%)] [background-size:18px_18px]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-[var(--theme-accent-2)]">{card.value}</p>
                <p className="mt-1 text-sm text-white/58">{card.detail}</p>
              </div>
              <div className={ICON_WRAP}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

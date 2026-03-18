"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import BackToMarketButton from "@/components/market/BackToMarketButton";
import CardDetailMarketPanel from "@/components/market/CardDetailMarketPanel";
import { displayCardId, routeCardId, type Card } from "@/lib/cards";

function statValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? value.toLocaleString() : value;
}

export default function CardDetailClient({
  initialCard,
  variants,
}: {
  initialCard: Card;
  variants: Card[];
}) {
  const variantMap = useMemo(() => {
    const map = new Map<string, Card>();
    for (const variant of variants) {
      map.set(variant.id.toUpperCase(), variant);
    }
    if (!map.has(initialCard.id.toUpperCase())) {
      map.set(initialCard.id.toUpperCase(), initialCard);
    }
    return map;
  }, [initialCard, variants]);

  const [activeCardId, setActiveCardId] = useState(initialCard.id.toUpperCase());

  const activeCard = variantMap.get(activeCardId) || initialCard;
  const inactiveVariants = variants.filter((variant) => variant.id.toUpperCase() !== activeCard.id.toUpperCase());

  function swapToVariant(variantId: string) {
    const normalizedId = variantId.trim().toUpperCase();
    if (!normalizedId || normalizedId === activeCard.id.toUpperCase()) return;

    const nextCard = variantMap.get(normalizedId);
    if (!nextCard) return;

    setActiveCardId(normalizedId);

    if (typeof window !== "undefined") {
      const nextUrl = `/cards/${routeCardId(nextCard)}${window.location.search}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackToMarketButton />

        <div className="flex flex-wrap items-center gap-2">
          {activeCard.releaseUrl ? (
            <a
              href={activeCard.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white"
            >
              Official Release
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-5">
          <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(240,192,64,0.14),transparent_42%),rgba(255,255,255,0.03)] p-5">
            <img
              src={`/api/card-image?id=${encodeURIComponent(activeCard.id)}`}
              alt={activeCard.name}
              className="mx-auto w-full max-w-[280px] rounded-[24px] border border-white/10 bg-[#08111f] p-2"
            />
          </div>

          {inactiveVariants.length > 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Print Variants</p>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {inactiveVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => swapToVariant(variant.id)}
                    className="w-24 flex-shrink-0 text-left sm:w-20"
                    aria-label={`View ${variant.variantLabel || variant.rarity || variant.id}`}
                  >
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#08111f] transition-all hover:border-[#F0C040]/35">
                      <img
                        src={`/api/card-image?id=${encodeURIComponent(variant.id)}`}
                        alt={`${variant.name} ${variant.variantLabel || variant.rarity}`}
                        className="aspect-[5/7] w-full object-contain p-1.5 transition-transform duration-200 hover:scale-[1.02]"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-white/55">{variant.variantLabel || variant.rarity || variant.id}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-[#F0C040]/20 bg-[radial-gradient(circle_at_top_left,rgba(240,192,64,0.18),transparent_34%),linear-gradient(135deg,rgba(12,19,36,0.96),rgba(8,13,23,0.92))] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#F0C040]/25 bg-[#F0C040]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0C040]">
                {activeCard.rarity}
              </span>
              {activeCard.baseId && activeCard.id !== activeCard.baseId && activeCard.variantLabel ? (
                <span className="rounded-full border border-[#F0C040]/25 bg-[#F0C040]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0C040]">
                  {activeCard.variantLabel}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
                {activeCard.type}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
                {activeCard.color}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">{activeCard.name}</h1>
            <p className="mt-3 text-base text-white/55">
              {displayCardId(activeCard)} · {activeCard.set}
              {activeCard.releaseDate ? ` · Released ${new Date(activeCard.releaseDate).toLocaleDateString()}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Set Code", value: activeCard.setCode },
              { label: "Card Number", value: activeCard.number },
              { label: "Cost", value: statValue(activeCard.cost) },
              { label: "Life", value: statValue(activeCard.life) },
              { label: "Power", value: statValue(activeCard.power) },
              { label: "Counter", value: statValue(activeCard.counter ?? 0) },
              { label: "Attribute", value: statValue(activeCard.attribute) },
              { label: "Traits", value: statValue(activeCard.traits) },
              { label: "Series", value: statValue(activeCard.seriesLabel?.replace(/<br class="spInline">/gu, " ")) },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Effect / Ability</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/80">
                {activeCard.effect || "No effect text listed."}
              </p>
            </div>

            {activeCard.trigger ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Trigger</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/80">{activeCard.trigger}</p>
              </div>
            ) : null}

            {activeCard.notes?.length ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Notes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeCard.notes.map((note) => (
                    <span key={note} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <CardDetailMarketPanel cardId={activeCard.id} cardName={activeCard.name} />
        </section>
      </div>
    </div>
  );
}

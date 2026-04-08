"use client";

import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackToMarketButton from "@/components/market/BackToMarketButton";
import CardDetailMarketPanel from "@/components/market/CardDetailMarketPanel";
import { displayCardId, displayRarity, routeCardId, type Card } from "@/lib/cards";

function statValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? value.toLocaleString() : value;
}

function colorBadgeClasses(color: string | null | undefined) {
  switch ((color || "").trim().toLowerCase()) {
    case "red":
      return "border-[#d8a18f] bg-[#f7e4dc] text-[#8f3f2a]";
    case "blue":
      return "border-[#a9c7d8] bg-[#e9f2f7] text-[#295d7d]";
    case "green":
      return "border-[#a9cdb2] bg-[#eaf4ed] text-[#386d47]";
    case "purple":
      return "border-[#c6b4e6] bg-[#f0ebfb] text-[#644594]";
    case "black":
      return "border-[#d7cfbf] bg-[#faf7f2] text-[#4b4035]";
    case "yellow":
      return "border-[#e2c48f] bg-[#fbf1db] text-[#986f22]";
    default:
      return "border-[#d7cfbf] bg-[#faf7f2] text-[#4b4035]";
  }
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activeCard = variantMap.get(activeCardId) || initialCard;
  const inactiveVariants = variants.filter((variant) => variant.id.toUpperCase() !== activeCard.id.toUpperCase());
  const activeVariantLabel =
    activeCard.baseId && activeCard.id !== activeCard.baseId && activeCard.variantLabel
      ? activeCard.variantLabel.toUpperCase() === displayRarity(activeCard.rarity).toUpperCase()
        ? null
        : activeCard.variantLabel
      : null;

  useEffect(() => {
    if (!isLightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

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
    <div className="relative ml-[calc(50%-50vw)] w-screen bg-[#faf7f2] text-[#2a2118]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <nav
          className="flex flex-wrap items-center gap-2 border-b border-[#e8dfd0] pb-3 font-sans text-[13px]"
          aria-label="Breadcrumb"
          data-card-breadcrumb
        >
          <Link href="/market" className="text-[#2d6a8f] transition hover:underline">
            Market
          </Link>
          <span className="text-[#8a7e70]">›</span>
          <span className="text-[#8a7e70]">{activeCard.setCode}</span>
          <span className="text-[#8a7e70]">›</span>
          <span className="text-[#2a2118]">
            {displayCardId(activeCard)} {activeCard.name}
          </span>
        </nav>

        <div className="mt-7 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]" data-card-hero>
          <section className="space-y-5">
            <div className="rounded-[28px] border border-[#e3d8c5] bg-[#f5efe3] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="group mx-auto block w-full max-w-[280px] cursor-zoom-in"
                aria-label={`Open fullscreen preview for ${activeCard.name}`}
                data-card-image-button
              >
                <img
                  src={`/api/card-image?id=${encodeURIComponent(activeCard.id)}`}
                  alt={activeCard.name}
                  className="mx-auto w-full rotate-[1deg] rounded-[18px] border border-[#dccfb9] bg-[#f3eadc] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-transform duration-200 group-hover:scale-[1.01]"
                  data-card-image
                />
              </button>
            </div>

            {inactiveVariants.length > 0 ? (
              <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] p-5 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8863c]">Print Variants</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {inactiveVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => swapToVariant(variant.id)}
                      className="w-24 flex-shrink-0 text-left sm:w-20"
                      aria-label={`View ${variant.variantLabel || variant.rarity || variant.id}`}
                    >
                      <div className="overflow-hidden rounded-[8px] border border-[#d9ccb7] bg-[#f5efe3] shadow-[0_8px_20px_rgba(27,40,56,0.08)] transition-all duration-200 hover:-translate-y-[2px] hover:border-[#d4a054] hover:shadow-[0_12px_26px_rgba(27,40,56,0.12)]">
                        <img
                          src={`/api/card-image?id=${encodeURIComponent(variant.id)}`}
                          alt={`${variant.name} ${variant.variantLabel || variant.rarity}`}
                          className="aspect-[5/7] w-full object-contain bg-[#08111f] p-1.5 transition-transform duration-200 hover:scale-[1.02]"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 font-sans text-[12px] text-[#5a4e40]">
                        {variant.variantLabel || variant.rarity || variant.id}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-6">
            <div
              className="rounded-[18px] border border-[#e1cfaf] bg-[radial-gradient(circle_at_top_left,rgba(240,192,64,0.16),transparent_28%),linear-gradient(145deg,rgba(245,239,227,0.98),rgba(239,230,214,0.98))] p-8 text-[#2a2118] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_40px_rgba(27,40,56,0.12)]"
              data-card-identity-panel
            >
              <div className="rounded-[14px] border border-[#d4a054]/35 bg-[#fffaf1] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <div className="flex flex-wrap items-center gap-2 font-sans">
                  <span className="rounded-full bg-[#d4a054] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1b2838]">
                    {displayRarity(activeCard.rarity)}
                  </span>
                  {activeVariantLabel ? (
                    <span className="rounded-full bg-[#d4a054] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1b2838]">
                      {activeVariantLabel}
                    </span>
                    ) : null}
                  <span className="rounded-full border border-[#d7cfbf] bg-[#faf7f2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a4e40]">
                    {activeCard.type}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${colorBadgeClasses(activeCard.color)}`}
                  >
                    {activeCard.color}
                  </span>
                </div>

                <h1 className="mt-5 text-[2.2rem] font-semibold leading-[0.95] text-[#1b2838] md:text-[3.1rem]">
                  {activeCard.name}
                </h1>
                <p className="mt-4 font-sans text-[13px] leading-relaxed text-[#8a7e70]">
                  {displayCardId(activeCard)} · {activeCard.set}
                  {activeCard.releaseDate ? ` · Released ${new Date(activeCard.releaseDate).toLocaleDateString()}` : ""}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3 font-sans">
                  <BackToMarketButton />

                  {activeCard.releaseUrl ? (
                    <a
                      href={activeCard.releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[#d7cfbf] bg-[#faf7f2] px-3.5 py-2 text-sm font-semibold text-[#5a4e40] transition-all hover:-translate-y-[1px] hover:border-[#d4a054] hover:text-[#1b2838]"
                    >
                      Official Release
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-[#e3d8c5] bg-[#f5efe3] p-6 shadow-[0_12px_30px_rgba(27,40,56,0.08)]">
              <div className="grid gap-x-5 gap-y-0 sm:grid-cols-2 xl:grid-cols-3">
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
                ].map((item, index, items) => (
                  <div
                    key={item.label}
                    className={`border-b border-[#e8dfd0] px-1 py-4 ${index >= items.length - (items.length % 3 || 3) ? "xl:border-b-0" : ""} ${index >= items.length - 2 ? "sm:border-b-0" : ""}`}
                  >
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a7e70]">{item.label}</p>
                    <p className="mt-1.5 font-sans text-base font-bold text-[#2a2118]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[12px] border border-[#e3d8c5] border-l-[3px] border-l-[#d4a054] bg-[#f5efe3] p-6 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8863c]">Effect / Ability</p>
                <p className="mt-3 whitespace-pre-wrap font-serif text-[15px] leading-8 text-[#2a2118]">
                  {activeCard.effect || "No effect text listed."}
                </p>
              </div>

              {activeCard.trigger ? (
                <div className="rounded-[12px] border border-[#e3d8c5] border-l-[3px] border-l-[#d4a054] bg-[#f5efe3] p-6 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
                  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8863c]">Trigger</p>
                  <p className="mt-3 whitespace-pre-wrap font-serif text-[15px] leading-8 text-[#2a2118]">{activeCard.trigger}</p>
                </div>
              ) : null}

              {activeCard.notes?.length ? (
                <div className="rounded-[12px] border border-[#e3d8c5] bg-[#f5efe3] p-6 shadow-[0_12px_26px_rgba(27,40,56,0.06)]">
                  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#b8863c]">Notes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCard.notes.map((note) => (
                      <span key={note} className="rounded-full border border-[#d9ccb7] bg-[#faf7f2] px-3 py-1 font-sans text-xs font-semibold text-[#5a4e40]">
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

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(42,33,24,0.52)] p-4 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeCard.name} fullscreen preview`}
          data-card-lightbox
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7cfbf] bg-[#faf7f2] text-[#5a4e40] transition hover:border-[#d4a054] hover:text-[#1b2838]"
            aria-label="Close fullscreen preview"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="flex max-h-[92vh] max-w-[min(92vw,760px)] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={`/api/card-image?id=${encodeURIComponent(activeCard.id)}`}
              alt={activeCard.name}
              className="max-h-[92vh] w-auto max-w-full rounded-[18px] border border-[#d7cfbf] bg-[#efe6d6] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

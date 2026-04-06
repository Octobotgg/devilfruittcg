"use client";

import Image from "next/image";
import { Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Trash2, Download, Save, Crown, X, BookOpen, AlertTriangle, CheckCircle2, Loader2, Filter, ArrowUpDown, GripVertical, Sparkles, FlaskConical, RefreshCw, ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Card } from "@/lib/cards";
import DonButton from "@/components/ui/DonButton";
import type { Deck } from "@/lib/cloud/types";
import { buildLoginUrl, clearPendingAuthAction, doesPendingActionMatchCurrentPath, getPendingAuthAction, setPendingAuthAction } from "@/lib/cloud/pending-auth-action";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { usePreferredSpecialPrintIds } from "@/lib/use-preferred-special-prints";
import { getBaseCardId } from "@/lib/card-variants";
import { buildDeckSummaryPatch } from "@/lib/profile-summary";
import { logProfileActivity, syncProfileSummaryPatch } from "@/lib/profile-sync-client";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import { createPlaytestState, drawPlaytestCard, type PlaytestState, type PlaytestTurnOrder } from "@/lib/deck-playtest";
import { DECK_FORMAT_RULES, DON_DECK_SIZE, type DeckFormatId, validateDeckAgainstFormat } from "@/lib/deck-validation";

const COLORS = ["Red", "Blue", "Green", "Purple", "Black", "Yellow"];
const COLOR_BAR_CLASS: Record<string, string> = {
  Red: "bg-red-400",
  Blue: "bg-sky-400",
  Green: "bg-emerald-400",
  Purple: "bg-violet-400",
  Black: "bg-slate-300",
  Yellow: "bg-amber-300",
};
const TYPES = ["Leader", "Character", "Event", "Stage"];
const COUNTER_BUCKET_VALUES = [0, 1000, 2000] as const;
const LOCAL_ART_SELECTION_PREFIX = "devilfruit_deck_art_selection:";
const LOCAL_MANUAL_ORDER_PREFIX = "devilfruit_deck_manual_order:";
const MAIN_DECK_TYPE_ORDER: Record<string, number> = {
  Character: 0,
  Event: 1,
  Stage: 2,
};
const DECK_SORT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "manual", label: "Manual" },
  { value: "cost", label: "Cost" },
  { value: "power", label: "Power" },
  { value: "counter", label: "Counter" },
  { value: "color", label: "Color" },
  { value: "type", label: "Type" },
  { value: "name", label: "Name" },
] as const;
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type CurveBucket = {
  label: string;
  count: number;
};

type DeckSortMode = (typeof DECK_SORT_OPTIONS)[number]["value"];

type DeckPriceResponseItem = {
  cardId: string;
  estimatedPrice: number;
  marketPrice: number | null;
  source: "market_cache" | "mock";
  stale: boolean;
  updatedAt: string | null;
};

type DeckDisplayEntry = {
  cardId: string;
  quantity: number;
  card?: Card;
  manualIndex: number;
};

type DeckPreviewItem = {
  cardId: string;
  name: string;
  imageSrc: string;
};

async function syncDeckProfileArtifacts(input: {
  shouldSync: boolean;
  nextDecks: Deck[];
  deckToSave: Deck;
  existingIndex: number;
  cards: Card[];
}) {
  if (!input.shouldSync) return;

  const activityKind = input.existingIndex >= 0 ? "deck_updated" : "deck_created";
  const activityTitle = input.existingIndex >= 0 ? `Updated ${input.deckToSave.name}` : `Built ${input.deckToSave.name}`;
  const activityDetail =
    input.existingIndex >= 0 ? `Updated deck: ${input.deckToSave.name}.` : `Built a new deck: ${input.deckToSave.name}.`;

  await Promise.allSettled([
    syncProfileSummaryPatch(
      buildDeckSummaryPatch({
        decks: input.nextDecks,
        cards: input.cards,
      }),
    ),
    logProfileActivity({
      kind: activityKind,
      title: activityTitle,
      detail: activityDetail,
      deckId: input.deckToSave.id,
      publicVisible: true,
    }),
  ]);
}

function readStoredMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [entryKey, value]) => {
      const nextKey = String(entryKey || "").trim().toUpperCase();
      const nextValue = String(value || "").trim().toUpperCase();
      if (nextKey && nextValue) acc[nextKey] = nextValue;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function readStoredList(key: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
}

function persistStoredValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore local persistence failures
  }
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function safeNumber(value: unknown) {
  const next = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function sortCostBucket(card?: Card) {
  return typeof card?.cost === "number" ? card.cost : 0;
}

function compareAutoDeckEntries(a: DeckDisplayEntry, b: DeckDisplayEntry) {
  const typeDelta = (MAIN_DECK_TYPE_ORDER[a.card?.type || "Stage"] ?? 99) - (MAIN_DECK_TYPE_ORDER[b.card?.type || "Stage"] ?? 99);
  if (typeDelta !== 0) return typeDelta;

  const costDelta = sortCostBucket(a.card) - sortCostBucket(b.card);
  if (costDelta !== 0) return costDelta;

  const powerDelta = safeNumber(b.card?.power) - safeNumber(a.card?.power);
  if (powerDelta !== 0) return powerDelta;

  return compareText(a.card?.name || a.cardId, b.card?.name || b.cardId);
}

function compareDeckEntries(a: DeckDisplayEntry, b: DeckDisplayEntry, mode: DeckSortMode) {
  if (mode === "manual") return a.manualIndex - b.manualIndex;
  if (mode === "auto") return compareAutoDeckEntries(a, b);

  if (mode === "cost") {
    const delta = sortCostBucket(a.card) - sortCostBucket(b.card);
    if (delta !== 0) return delta;
  }

  if (mode === "power") {
    const delta = safeNumber(b.card?.power) - safeNumber(a.card?.power);
    if (delta !== 0) return delta;
  }

  if (mode === "counter") {
    const delta = safeNumber(b.card?.counter) - safeNumber(a.card?.counter);
    if (delta !== 0) return delta;
  }

  if (mode === "color") {
    const delta = compareText(a.card?.color || "", b.card?.color || "");
    if (delta !== 0) return delta;
  }

  if (mode === "type") {
    const delta = compareText(a.card?.type || "", b.card?.type || "");
    if (delta !== 0) return delta;
  }

  if (mode === "name") {
    const delta = compareText(a.card?.name || a.cardId, b.card?.name || b.cardId);
    if (delta !== 0) return delta;
  }

  return compareAutoDeckEntries(a, b);
}

function formatPower(value: number) {
  return `${Math.round(value).toLocaleString()}`;
}

function DeckCardImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  imageClassName: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 animate-pulse bg-[var(--color-parchment-dark)]/40 transition-opacity ${loaded ? "opacity-0" : "opacity-100"}`} />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className={`${imageClassName} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

function MobileSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          />
          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#09111f] p-4 shadow-2xl lg:hidden"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Deck Lab</p>
                <h2 className="text-lg font-black text-white">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Dismiss ${title}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function PlaytestModal({
  open,
  deckName,
  leaderCard,
  playtestState,
  allCards,
  onClose,
  onDraw,
  onMulligan,
  onReset,
  order,
  onOrderChange,
}: {
  open: boolean;
  deckName: string;
  leaderCard: Card | null;
  playtestState: PlaytestState | null;
  allCards: Map<string, Card>;
  onClose: () => void;
  onDraw: () => void;
  onMulligan: () => void;
  onReset: () => void;
  order: PlaytestTurnOrder;
  onOrderChange: (order: PlaytestTurnOrder) => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close playtest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80"
          />
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#09111f] p-4 shadow-2xl lg:inset-x-[max(4rem,calc(50%-34rem))] lg:bottom-auto lg:top-8 lg:rounded-[30px] lg:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Playtest Lab</p>
                <h2 className="text-2xl font-black text-white">{deckName || "Untitled Deck"}</h2>
                <p className="mt-1 text-sm text-white/45">{leaderCard ? `Leader: ${leaderCard.name}` : "Leader required"}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss playtest"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Turn order</p>
              <div className="inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
                {(["first", "second"] as PlaytestTurnOrder[]).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => onOrderChange(candidate)}
                    className={`min-h-10 rounded-lg px-3 text-xs font-bold uppercase tracking-[0.08em] ${order === candidate ? "bg-[var(--theme-accent)] text-black" : "text-white/60"}`}
                  >
                    Go {candidate}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Remaining Deck</p>
                <p className="mt-1 text-2xl font-black text-white">{playtestState?.drawPile.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Simulated Turn</p>
                <p className="mt-1 text-2xl font-black text-white">{playtestState?.turn ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">DON!!</p>
                <p className="mt-1 text-2xl font-black text-[var(--theme-accent-2)]">{playtestState?.donCount ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onMulligan}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Mulligan
              </button>
              <button
                type="button"
                onClick={onDraw}
                disabled={!playtestState?.drawPile.length}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 px-4 text-sm font-bold text-[var(--theme-accent-2)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FlaskConical className="h-4 w-4" />
                Draw
              </button>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white"
              >
                Reset
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">Leader</p>
                  {leaderCard ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <DeckCardImage
                        src={`/api/card-image?id=${encodeURIComponent(leaderCard.id)}`}
                        alt={leaderCard.name}
                        sizes="180px"
                        className="aspect-[63/88] w-full rounded-xl"
                        imageClassName="object-cover"
                      />
                      <p className="mt-2 text-sm font-bold text-white">{leaderCard.name}</p>
                      <p className="text-xs text-white/45">
                        {leaderCard.id} · Life {typeof leaderCard.life === "number" ? leaderCard.life : 5}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/45">Life Area</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(playtestState?.life || []).map((_, index) => (
                      <div key={`life-${index}`} className="aspect-[63/88] rounded-xl border border-white/10 bg-[radial-gradient(circle_at_top,#1b355e,transparent_60%),linear-gradient(160deg,#111d31,#060b14)] p-2">
                        <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Life</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">Current Hand</p>
                  {playtestState?.lastDrawnId ? (
                    <p className="text-[11px] text-white/40">Last draw: {allCards.get(playtestState.lastDrawnId)?.name || playtestState.lastDrawnId}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {(playtestState?.hand || []).map((cardId, index) => {
                    const card = allCards.get(cardId);
                    return (
                      <div key={`${cardId}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-2">
                        <DeckCardImage
                          src={`/api/card-image?id=${encodeURIComponent(cardId)}`}
                          alt={card?.name || cardId}
                          sizes="(max-width: 768px) 44vw, 180px"
                          className="aspect-[63/88] w-full rounded-xl"
                          imageClassName="object-cover"
                        />
                        <p className="mt-2 truncate text-xs font-bold text-white">{card?.name || cardId}</p>
                        <p className="text-[10px] text-white/45">{card?.id || cardId}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function VariantGalleryModal({
  open,
  baseCard,
  variants,
  selectedVariantId,
  loading,
  inDeck,
  onClose,
  onChoose,
}: {
  open: boolean;
  baseCard: Card | null;
  variants: Card[];
  selectedVariantId: string;
  loading: boolean;
  inDeck: boolean;
  onClose: () => void;
  onChoose: (variantId: string) => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close variant gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80"
          />
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#09111f] p-4 shadow-2xl lg:inset-x-[max(4rem,calc(50%-34rem))] lg:bottom-auto lg:top-8 lg:rounded-[30px] lg:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Official Variant Gallery</p>
                <h2 className="text-2xl font-black text-white">{baseCard?.name || "Card variants"}</h2>
                <p className="mt-1 text-sm text-white/45">
                  {loading ? "Loading official prints..." : `${variants.length} official prints available in the English catalog.`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss variant gallery"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
              {inDeck ? "Selecting a print updates the art shown for this card in your deck." : "Selecting a print adds the base card to your deck and uses this art in the builder."}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {variants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onChoose(variant.id)}
                    aria-pressed={isSelected}
                    className={`rounded-2xl border p-2 text-left ${isSelected ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/10" : "border-white/10 bg-black/20"}`}
                  >
                    <DeckCardImage
                      src={`/api/card-image?id=${encodeURIComponent(variant.id)}`}
                      alt={`${variant.name} ${variant.variantLabel || variant.id}`}
                      sizes="(max-width: 768px) 44vw, 180px"
                      className="aspect-[63/88] w-full rounded-xl"
                      imageClassName="object-cover"
                    />
                    <div className="mt-2">
                      <p className="truncate text-xs font-bold text-white">{variant.variantLabel || "Base art"}</p>
                      <p className="truncate text-[10px] text-white/45">{variant.id}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function DeckImageLightbox({
  open,
  cards,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  open: boolean;
  cards: DeckPreviewItem[];
  activeIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const activeCard = activeIndex >= 0 ? cards[activeIndex] : null;
  const canNavigate = cards.length > 1;
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (!canNavigate) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canNavigate, onClose, onNext, onPrevious, open]);

  return (
    <AnimatePresence>
      {open && activeCard ? (
        <motion.div
          key="deck-image-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="group fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6"
        >
          <motion.button
            type="button"
            aria-label="Close card preview"
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close card preview"
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/65 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {canNavigate ? (
            <>
              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous deck card"
                className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/60 opacity-0 transition hover:text-white md:flex md:group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next deck card"
                className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/60 opacity-0 transition hover:text-white md:flex md:group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeCard.cardId}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex max-w-full items-center justify-center"
              onClick={(event) => event.stopPropagation()}
              onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
              onTouchEnd={(event) => {
                const startX = touchStartX;
                const endX = event.changedTouches[0]?.clientX ?? null;
                setTouchStartX(null);

                if (!canNavigate || startX == null || endX == null) return;
                const delta = endX - startX;
                if (Math.abs(delta) < 45) return;

                if (delta < 0) onNext();
                else onPrevious();
              }}
            >
              <Image
                src={activeCard.imageSrc}
                alt={activeCard.name}
                width={630}
                height={880}
                sizes="(max-width: 768px) 92vw, 500px"
                priority
                unoptimized
                className="h-auto max-h-[82vh] w-auto max-w-[calc(100vw-2rem)] rounded-[22px] border border-white/10 object-contain shadow-[0_24px_70px_rgba(0,0,0,0.58)] sm:max-w-[31rem]"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function newDeck(): Deck {
  return {
    id: Date.now().toString(),
    name: "Holy Grail Deck",
    leaderId: null,
    leaderVariantId: null,
    visibility: "private",
    cards: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDeckVariantId(cardId: string, variantId?: string | null) {
  const baseId = getBaseCardId(cardId.toUpperCase());
  const nextVariantId = String(variantId || "").trim().toUpperCase();
  if (!nextVariantId || nextVariantId === baseId) return undefined;
  return nextVariantId;
}

function extractDeckArtOverrides(deck: Deck) {
  const overrides: Record<string, string> = {};

  if (deck.leaderId) {
    const variantId = normalizeDeckVariantId(deck.leaderId, deck.leaderVariantId);
    if (variantId) overrides[getBaseCardId(deck.leaderId.toUpperCase())] = variantId;
  }

  deck.cards.forEach((entry) => {
    const variantId = normalizeDeckVariantId(entry.cardId, entry.variantId);
    if (variantId) overrides[getBaseCardId(entry.cardId.toUpperCase())] = variantId;
  });

  return overrides;
}

function normalizeDeckToBaseIds(deck: Deck): Deck {
  const merged = new Map<string, { cardId: string; quantity: number; variantId?: string }>();

  for (const entry of deck.cards) {
    const baseId = getBaseCardId(entry.cardId.toUpperCase());
    const variantId = normalizeDeckVariantId(baseId, entry.variantId || (entry.cardId.toUpperCase() !== baseId ? entry.cardId : null));
    const current = merged.get(baseId);
    if (current) {
      current.quantity = Math.min(4, current.quantity + entry.quantity);
      if (variantId) current.variantId = variantId;
    } else {
      merged.set(baseId, { cardId: baseId, quantity: Math.min(4, entry.quantity), ...(variantId ? { variantId } : {}) });
    }
  }

  const rawLeaderId = deck.leaderId ? deck.leaderId.toUpperCase() : null;
  const leaderId = rawLeaderId ? getBaseCardId(rawLeaderId) : null;
  const leaderVariantId = leaderId
    ? normalizeDeckVariantId(leaderId, deck.leaderVariantId || (rawLeaderId !== leaderId ? rawLeaderId : null)) ?? null
    : null;

  return {
    ...deck,
    leaderId,
    leaderVariantId,
    cards: Array.from(merged.values()),
  };
}

function formatCurrency(value: number) {
  return USD_FORMATTER.format(value);
}

function formatCounterLabel(value: number) {
  if (value === 0) return "0";
  if (value % 1000 === 0) return `${value / 1000}k`;
  return value.toLocaleString();
}

function CurveChart({ title, buckets }: { title: string; buckets: CurveBucket[] }) {
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">{title}</p>
      <div className="flex items-end gap-1 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2">
        {buckets.map((bucket) => {
          const height = Math.max(8, Math.round((bucket.count / maxCount) * 58));

          return (
            <div key={bucket.label} className="flex-1 text-center">
              <div
                className="mx-auto flex w-full max-w-[26px] items-end justify-center rounded-sm border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[9px] font-black text-[var(--color-navy)]"
                style={{ height: `${height}px` }}
              >
                {bucket.count > 0 ? bucket.count : ""}
              </div>
              <p className="mt-1 text-[9px] text-[var(--color-text-light)]">{bucket.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DeckBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-20">
          <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-mid)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-light)]" />
              Loading Deck Lab
            </div>
          </section>
        </div>
      }
    >
      <DeckBuilderPageContent />
    </Suspense>
  );
}

function DeckBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdFromUrl = searchParams.get("id");
  const { loadDecks: loadDecksFromStore, saveDecks: saveDecksToStore, ready: cloudReady, user, hasCloud } = useCloudSync();
  const previousUserIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deck, setDeck] = useState<Deck>(newDeck());
  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [altArtView, setAltArtView] = useState(false);
  const [techSlots, setTechSlots] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [results, setResults] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Map<string, Card>>(new Map());
  const [deckPrices, setDeckPrices] = useState<Map<string, DeckPriceResponseItem>>(new Map());
  const [deckPriceLoading, setDeckPriceLoading] = useState(false);
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>("auto");
  const [manualCardOrder, setManualCardOrder] = useState<string[]>([]);
  const [artOverrides, setArtOverrides] = useState<Record<string, string>>({});
  const [variantPickerFor, setVariantPickerFor] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<Map<string, Card[]>>(new Map());
  const [variantLoadingIds, setVariantLoadingIds] = useState<string[]>([]);
  const [mobileDeckOpen, setMobileDeckOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<DeckFormatId>("standard");
  const [playtestOpen, setPlaytestOpen] = useState(false);
  const [playtestOrder, setPlaytestOrder] = useState<PlaytestTurnOrder>("first");
  const [playtestState, setPlaytestState] = useState<PlaytestState | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  const mainDeckCount = useMemo(() => deck.cards.reduce((sum, card) => sum + card.quantity, 0), [deck.cards]);
  const totalCards = (deck.leaderId ? 1 : 0) + mainDeckCount;
  const deckStorageKeySuffix = deck.id || deckIdFromUrl || "draft";
  const artStorageKey = `${LOCAL_ART_SELECTION_PREFIX}${deckStorageKeySuffix}`;
  const manualOrderStorageKey = `${LOCAL_MANUAL_ORDER_PREFIX}${deckStorageKeySuffix}`;

  const leaderCard = deck.leaderId ? allCards.get(deck.leaderId) || null : null;
  const savedDeckArtOverrides = useMemo(() => extractDeckArtOverrides(deck), [deck]);
  const activeDeckBaseIds = useMemo(() => {
    const ids = new Set<string>();
    if (deck.leaderId) ids.add(getBaseCardId(deck.leaderId.toUpperCase()));
    deck.cards.forEach((entry) => ids.add(getBaseCardId(entry.cardId.toUpperCase())));
    return Array.from(ids);
  }, [deck.cards, deck.leaderId]);
  const deckQuantityById = useMemo(
    () => new Map(deck.cards.map((entry) => [entry.cardId.toUpperCase(), entry.quantity])),
    [deck.cards],
  );
  const deckPriceCardIds = useMemo(() => {
    const ids = new Set<string>();
    if (deck.leaderId) ids.add(deck.leaderId);
    deck.cards.forEach((card) => ids.add(card.cardId));
    return Array.from(ids);
  }, [deck.cards, deck.leaderId]);
  const deckPriceRequestKey = deckPriceCardIds.join(",");

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      const frame = window.requestAnimationFrame(() => {
        setDeck(deckIdFromUrl ? { ...newDeck(), id: deckIdFromUrl } : newDeck());
        setSaved(false);
        setExported(false);
        setTechSlots([]);
        setArtOverrides({});
        setManualCardOrder([]);
        setVariantPickerFor(null);
        setVariantOptions(new Map());
        setVariantLoadingIds([]);
        setDeckPrices(new Map());
        setDeckPriceLoading(false);
        setActionNotice(null);
        setPlaytestOpen(false);
        setPlaytestState(null);
        setPreviewCardId(null);
      });
      previousUserIdRef.current = nextUserId;
      return () => window.cancelAnimationFrame(frame);
    }

    previousUserIdRef.current = nextUserId;
  }, [deckIdFromUrl, user]);

  useEffect(() => {
    let cancelled = false;
    setSearching(true);

    const timeout = window.setTimeout(() => {
      void (async () => {
      const params = new URLSearchParams({ pageSize: "72" });
      const trimmedQuery = deferredQuery.trim();
      if (trimmedQuery) params.set("q", trimmedQuery);
      if (colorFilter) params.set("color", colorFilter);
      if (typeFilter) params.set("type", typeFilter);

      try {
        const res = await fetch(`/api/cards?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load cards");
        const json = await res.json();
        const nextResults = Array.isArray(json.results) ? (json.results as Card[]) : [];

        if (cancelled) return;

        setResults(nextResults);
        setAllCards((prev) => {
          const next = new Map(prev);
          nextResults.forEach((card) => next.set(card.id, card));
          return next;
        });
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
      })();
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [deferredQuery, colorFilter, typeFilter]);

  useEffect(() => {
    if (!cloudReady) return;

    let cancelled = false;

    void loadDecksFromStore()
      .then((decks) => {
        if (cancelled) return;

        if (deckIdFromUrl) {
          const existingDeck = decks.find((candidate) => candidate.id === deckIdFromUrl);
          if (existingDeck) {
            setDeck(normalizeDeckToBaseIds(existingDeck));
          } else {
            setDeck((current) => (current.id === deckIdFromUrl ? current : { ...newDeck(), id: deckIdFromUrl }));
          }
        }

        setStorageReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudReady, deckIdFromUrl, loadDecksFromStore]);

  useEffect(() => {
    if (!leaderCard?.color) return;
    const [color] = parseLeaderColors(leaderCard.color);
    setThemeByLeaderColor(color);
  }, [leaderCard?.color]);

  useEffect(() => {
    setArtOverrides(readStoredMap(artStorageKey));
    setManualCardOrder(readStoredList(manualOrderStorageKey));
    setDeckSortMode("auto");
    setVariantPickerFor(null);
  }, [artStorageKey, manualOrderStorageKey]);

  useEffect(() => {
    setDeck((current) => {
      let changed = false;

      const nextCards = current.cards.map((entry) => {
        const baseId = getBaseCardId(entry.cardId.toUpperCase());
        const currentVariantId = normalizeDeckVariantId(entry.cardId, entry.variantId);
        const nextVariantId = normalizeDeckVariantId(entry.cardId, artOverrides[baseId]);

        if (!nextVariantId || currentVariantId === nextVariantId) return entry;

        changed = true;
        return { ...entry, variantId: nextVariantId };
      });

      const leaderBaseId = current.leaderId ? getBaseCardId(current.leaderId.toUpperCase()) : null;
      const nextLeaderVariantId = leaderBaseId
        ? normalizeDeckVariantId(current.leaderId as string, artOverrides[leaderBaseId]) ?? current.leaderVariantId ?? null
        : null;

      if (!changed && nextLeaderVariantId === (current.leaderVariantId ?? null)) return current;

      return {
        ...current,
        leaderVariantId: nextLeaderVariantId,
        cards: nextCards,
      };
    });
  }, [artOverrides, deck.cards, deck.leaderId]);

  useEffect(() => {
    setArtOverrides((prev) => {
      if (!activeDeckBaseIds.length) return prev;

      let changed = false;
      const next = { ...prev };

      activeDeckBaseIds.forEach((baseId) => {
        const storedVariantId = savedDeckArtOverrides[baseId];
        if (storedVariantId) {
          if (next[baseId] !== storedVariantId) {
            next[baseId] = storedVariantId;
            changed = true;
          }
          return;
        }

        if (next[baseId]) {
          delete next[baseId];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [activeDeckBaseIds, savedDeckArtOverrides]);

  const mainDeckIds = useMemo(() => deck.cards.map((entry) => entry.cardId.toUpperCase()), [deck.cards]);

  useEffect(() => {
    setManualCardOrder((prev) => {
      const seen = new Set<string>();
      const currentSet = new Set(mainDeckIds);
      const filtered = prev.filter((id) => {
        const normalized = id.toUpperCase();
        if (seen.has(normalized) || !currentSet.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
      const missing = mainDeckIds.filter((id) => !seen.has(id));
      const next = [...filtered, ...missing];
      return next.length === prev.length && next.every((id, index) => id === prev[index]) ? prev : next;
    });

    setTechSlots((prev) => prev.filter((id) => mainDeckIds.includes(id)).slice(0, 8));
  }, [deck.leaderId, mainDeckIds]);

  useEffect(() => {
    persistStoredValue(artStorageKey, artOverrides);
  }, [artOverrides, artStorageKey]);

  useEffect(() => {
    persistStoredValue(manualOrderStorageKey, manualCardOrder);
  }, [manualCardOrder, manualOrderStorageKey]);

  useEffect(() => {
    if (!storageReady || !user) return;

    const pending = getPendingAuthAction();
    if (!pending || pending.kind !== "save_deck" || !doesPendingActionMatchCurrentPath(pending)) return;

    let cancelled = false;

    void (async () => {
      try {
        const deckToSave = normalizeDeckToBaseIds({ ...pending.deck, updatedAt: pending.deck.updatedAt || new Date().toISOString() });
        const decks = await loadDecksFromStore();
        const idx = decks.findIndex((candidate) => candidate.id === deckToSave.id);
        const nextDecks = [...decks];

        if (idx >= 0) nextDecks[idx] = deckToSave;
        else nextDecks.push(deckToSave);

        await saveDecksToStore(nextDecks);
        await syncDeckProfileArtifacts({
          shouldSync: true,
          nextDecks,
          deckToSave,
          existingIndex: idx,
          cards: Array.from(allCards.values()),
        });

        if (cancelled) return;

        setDeck(deckToSave);
        clearPendingAuthAction();
        setSaved(true);
        setActionNotice({ tone: "success", message: `Saved "${deckToSave.name}" to your account.` });
        window.setTimeout(() => {
          setSaved(false);
          setActionNotice(null);
        }, 2200);
      } catch {
        if (cancelled) return;
        setActionNotice({ tone: "error", message: "We could not finish saving that deck after login. Try again." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allCards, loadDecksFromStore, saveDecksToStore, storageReady, user]);

  useEffect(() => {
    if (!deckPriceRequestKey) {
      setDeckPrices(new Map());
      setDeckPriceLoading(false);
      return;
    }

    let cancelled = false;
    setDeckPriceLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/cards/prices?ids=${encodeURIComponent(deckPriceRequestKey)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load deck prices");
        const json = await res.json();
        const results = Array.isArray(json.results) ? (json.results as DeckPriceResponseItem[]) : [];

        if (cancelled) return;

        setDeckPrices(new Map(results.map((item) => [item.cardId.toUpperCase(), item])));
      } catch {
        if (!cancelled) setDeckPrices(new Map());
      } finally {
        if (!cancelled) setDeckPriceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckPriceRequestKey]);

  const curveBuckets = useMemo<CurveBucket[]>(() => {
    const b = Array.from({ length: 11 }, (_, i) => ({ label: i === 10 ? "10+" : String(i), count: 0 }));
    deck.cards.forEach(({ cardId, quantity }) => {
      const card = allCards.get(cardId);
      if (!card || card.type === "Leader") return;
      const raw = typeof card.cost === "number" ? card.cost : Number(card.cost ?? 0);
      const idx = Number.isFinite(raw) ? Math.max(0, Math.min(10, raw >= 10 ? 10 : Math.floor(raw))) : 0;
      b[idx].count += quantity;
    });
    return b;
  }, [deck.cards, allCards]);

  const counterBuckets = useMemo<CurveBucket[]>(() => {
    const values = new Set<number>(COUNTER_BUCKET_VALUES);
    deck.cards.forEach(({ cardId }) => {
      const card = allCards.get(cardId);
      values.add(typeof card?.counter === "number" ? card.counter : 0);
    });

    const buckets = Array.from(values)
      .sort((a, b) => a - b)
      .map((value) => ({ value, label: formatCounterLabel(value), count: 0 }));

    deck.cards.forEach(({ cardId, quantity }) => {
      const card = allCards.get(cardId);
      const counterValue = typeof card?.counter === "number" ? card.counter : 0;
      const bucket = buckets.find((item) => item.value === counterValue);
      if (bucket) bucket.count += quantity;
    });

    return buckets.map(({ label, count }) => ({ label, count }));
  }, [deck.cards, allCards]);

  const visibleTechSlots = useMemo(
    () => techSlots.filter((id) => deck.cards.some((card) => card.cardId === id)).slice(0, 8),
    [deck.cards, techSlots]
  );

  const hydratedDeckCardIds = useMemo(() => {
    const ids = new Set<string>();
    deck.cards.forEach((card) => ids.add(card.cardId));
    visibleTechSlots.forEach((id) => ids.add(id));
    if (deck.leaderId) ids.add(deck.leaderId);
    return Array.from(ids);
  }, [deck.cards, visibleTechSlots, deck.leaderId]);

  useEffect(() => {
    const missingIds = hydratedDeckCardIds.filter((id) => !allCards.has(id));
    if (!missingIds.length) return;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/cards?ids=${encodeURIComponent(missingIds.join(","))}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to hydrate deck cards");
        const json = await res.json();
        const fetched = Array.isArray(json.results) ? (json.results as Card[]) : [];

        if (cancelled) return;

        setAllCards((prev) => {
          const next = new Map(prev);
          fetched.forEach((card) => next.set(card.id, card));
          return next;
        });
      } catch {
        // keep current cache
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [allCards, hydratedDeckCardIds]);

  const deckVisibleCardIds = useMemo(() => {
    const ids = new Set<string>();
    deck.cards.forEach((card) => ids.add(card.cardId));
    visibleTechSlots.forEach((id) => ids.add(id));
    if (deck.leaderId) ids.add(deck.leaderId);
    return Array.from(ids);
  }, [deck.cards, visibleTechSlots, deck.leaderId]);

  const preferredAltArtIds = usePreferredSpecialPrintIds(deckVisibleCardIds, altArtView, "alt_art");
  const manualOrderIndex = useMemo(
    () => new Map(manualCardOrder.map((cardId, index) => [cardId.toUpperCase(), index])),
    [manualCardOrder],
  );
  const deckDisplayEntries = useMemo<DeckDisplayEntry[]>(
    () =>
      deck.cards
        .map((entry, originalIndex) => ({
          cardId: entry.cardId,
          quantity: entry.quantity,
          card: allCards.get(entry.cardId),
          manualIndex: manualOrderIndex.has(entry.cardId.toUpperCase())
            ? (manualOrderIndex.get(entry.cardId.toUpperCase()) as number)
            : manualCardOrder.length + originalIndex,
        }))
        .sort((a, b) => compareDeckEntries(a, b, deckSortMode)),
    [allCards, deck.cards, deckSortMode, manualCardOrder.length, manualOrderIndex],
  );
  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>([
      ["Character", 0],
      ["Event", 0],
      ["Stage", 0],
    ]);

    deck.cards.forEach(({ cardId, quantity }) => {
      const type = allCards.get(cardId)?.type;
      if (type && counts.has(type)) counts.set(type, (counts.get(type) || 0) + quantity);
    });

    return Array.from(counts.entries()).map(([label, count]) => ({
      label,
      count,
      percent: mainDeckCount > 0 ? (count / mainDeckCount) * 100 : 0,
    }));
  }, [allCards, deck.cards, mainDeckCount]);
  const colorDistribution = useMemo(() => {
    const counts = new Map<string, number>();

    deck.cards.forEach(({ cardId, quantity }) => {
      const colors = parseLeaderColors(allCards.get(cardId)?.color || "");
      if (!colors.length) return;

      colors.forEach((color) => {
        counts.set(color, (counts.get(color) || 0) + quantity);
      });
    });

    return COLORS.map((color) => ({
      label: color,
      count: counts.get(color) || 0,
      percent: mainDeckCount > 0 ? ((counts.get(color) || 0) / mainDeckCount) * 100 : 0,
    })).filter((item) => item.count > 0);
  }, [allCards, deck.cards, mainDeckCount]);
  const powerByCost = useMemo(() => {
    const buckets = new Map<string, { sortValue: number; totalPower: number; totalCopies: number }>();

    deck.cards.forEach(({ cardId, quantity }) => {
      const card = allCards.get(cardId);
      if (!card || card.type !== "Character" || typeof card.power !== "number") return;

      const numericCost = typeof card.cost === "number" ? card.cost : Number(card.cost ?? 0);
      const safeCost = Number.isFinite(numericCost) ? numericCost : 0;
      const label = safeCost >= 10 ? "10+" : String(safeCost);
      const existing = buckets.get(label) || {
        sortValue: safeCost >= 10 ? 10 : safeCost,
        totalPower: 0,
        totalCopies: 0,
      };

      existing.totalPower += card.power * quantity;
      existing.totalCopies += quantity;
      buckets.set(label, existing);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[1].sortValue - b[1].sortValue)
      .map(([label, bucket]) => ({
        label,
        averagePower: bucket.totalCopies > 0 ? bucket.totalPower / bucket.totalCopies : 0,
        copies: bucket.totalCopies,
      }));
  }, [allCards, deck.cards]);
  const deckPriceSummary = useMemo(() => {
    const lineItems = [
      ...(deck.leaderId ? [{ cardId: deck.leaderId, quantity: 1 }] : []),
      ...deck.cards,
    ];

    let total = 0;
    let cachedEntries = 0;
    let placeholderEntries = 0;
    let staleEntries = 0;
    const seen = new Set<string>();

    lineItems.forEach(({ cardId, quantity }) => {
      const normalizedId = cardId.toUpperCase();
      const price = deckPrices.get(normalizedId);
      if (!price) return;

      total += price.estimatedPrice * quantity;

      if (!seen.has(normalizedId)) {
        seen.add(normalizedId);
        if (price.source === "market_cache") cachedEntries += 1;
        else placeholderEntries += 1;
        if (price.stale) staleEntries += 1;
      }
    });

    return {
      total,
      cachedEntries,
      placeholderEntries,
      staleEntries,
    };
  }, [deck.leaderId, deck.cards, deckPrices]);
  const validationResult = useMemo(
    () => validateDeckAgainstFormat(deck, allCards, selectedFormat),
    [allCards, deck, selectedFormat],
  );
  const selectedFormatRule = DECK_FORMAT_RULES[selectedFormat];
  const canPlaytest = validationResult.legal && validationResult.summary.mainDeckCount === 50 && validationResult.summary.leaderCount === 1;
  const playtestLifeCards = leaderCard && typeof leaderCard.life === "number" ? leaderCard.life : 5;

  useEffect(() => {
    if (canPlaytest) return;
    setPlaytestOpen(false);
    setPlaytestState(null);
  }, [canPlaytest]);

  const resolveDeckImageId = (cardId: string) => {
    const baseId = getBaseCardId(cardId.toUpperCase());
    const manualId = artOverrides[baseId] || savedDeckArtOverrides[baseId];
    if (manualId) return manualId;
    if (altArtView) return preferredAltArtIds.get(baseId) || baseId;
    return baseId;
  };

  const deckImageFor = (id: string) => `/api/card-image?id=${encodeURIComponent(resolveDeckImageId(id))}`;
  const hasActiveFilters = Boolean(query || colorFilter || typeFilter);
  const mobileDeckLabel = `${mainDeckCount}/50`;
  const activeVariantBaseId = variantPickerFor ? getBaseCardId(variantPickerFor.toUpperCase()) : null;
  const activeVariantBaseCard = activeVariantBaseId ? allCards.get(activeVariantBaseId) || null : null;
  const activeVariantOptions = useMemo(() => {
    if (!activeVariantBaseId) return [];
    const options = variantOptions.get(activeVariantBaseId) || [];
    return options.length ? options : activeVariantBaseCard ? [activeVariantBaseCard] : [];
  }, [activeVariantBaseCard, activeVariantBaseId, variantOptions]);
  const activeVariantSelectedId = activeVariantBaseId ? resolveDeckImageId(activeVariantBaseId) : "";
  const activeVariantLoading = activeVariantBaseId ? variantLoadingIds.includes(activeVariantBaseId) : false;
  const activeVariantInDeck = activeVariantBaseId ? deck.cards.some((entry) => entry.cardId === activeVariantBaseId) || deck.leaderId === activeVariantBaseId : false;
  const deckPreviewItems: DeckPreviewItem[] = deckDisplayEntries.flatMap(({ cardId, card }) =>
    card
      ? [
          {
            cardId,
            name: card.name,
            imageSrc: deckImageFor(cardId),
          },
        ]
      : [],
  );
  const previewActiveIndex = previewCardId ? deckPreviewItems.findIndex((item) => item.cardId === previewCardId) : -1;

  useEffect(() => {
    if (!previewCardId) return;
    if (deckPreviewItems.some((item) => item.cardId === previewCardId)) return;
    setPreviewCardId(null);
  }, [deckPreviewItems, previewCardId]);

  function toggleTechSlot(cardId: string) {
    setTechSlots((prev) => {
      const next = prev.filter((id) => deck.cards.some((card) => card.cardId === id)).slice(0, 8);
      if (next.includes(cardId)) return next.filter((id) => id !== cardId);
      if (next.length >= 8) return next;
      return [...next, cardId];
    });
  }

  function reorderTechSlots(from: number, to: number) {
    setTechSlots((prev) => {
      const next = prev.filter((id) => deck.cards.some((card) => card.cardId === id)).slice(0, 8);
      if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
      const copy = [...next];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function addCard(card: Card, variantId?: string | null) {
    const baseId = getBaseCardId(card.id.toUpperCase());
    const normalizedVariantId = normalizeDeckVariantId(baseId, variantId);

    if (card.type === "Leader") {
      setDeck((d) => ({
        ...d,
        leaderId: baseId,
        leaderVariantId: normalizedVariantId ?? null,
        updatedAt: new Date().toISOString(),
      }));
      return;
    }

    setDeck((d) => {
      const existing = d.cards.find((c) => c.cardId === baseId);
      if (existing) {
        if (existing.quantity >= 4) return d;
        return {
          ...d,
          cards: d.cards.map((c) =>
            c.cardId === baseId
              ? {
                  ...c,
                  quantity: c.quantity + 1,
                  ...(normalizedVariantId ? { variantId: normalizedVariantId } : {}),
                }
              : c,
          ),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...d,
        cards: [...d.cards, { cardId: baseId, quantity: 1, ...(normalizedVariantId ? { variantId: normalizedVariantId } : {}) }],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function moveDeckEntry(fromCardId: string, toCardId: string) {
    const fromId = fromCardId.toUpperCase();
    const toId = toCardId.toUpperCase();
    if (!fromId || !toId || fromId === toId) return;

    setManualCardOrder((prev) => {
      const normalized = [...prev.filter((id) => mainDeckIds.includes(id)), ...mainDeckIds.filter((id) => !prev.includes(id))];
      const fromIndex = normalized.indexOf(fromId);
      const toIndex = normalized.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) return normalized;
      const next = [...normalized];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDeckSortMode("manual");
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

  async function ensureVariantOptions(cardId: string) {
    const baseId = getBaseCardId(cardId.toUpperCase());
    if (!baseId || variantOptions.has(baseId) || variantLoadingIds.includes(baseId)) return;

    setVariantLoadingIds((prev) => (prev.includes(baseId) ? prev : [...prev, baseId]));

    try {
      const res = await fetch(`/api/cards/variants?id=${encodeURIComponent(baseId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load variants");
      const json = await res.json();
      const variants = Array.isArray(json.variants) ? (json.variants as Card[]) : [];

      setVariantOptions((prev) => {
        const next = new Map(prev);
        next.set(baseId, variants);
        return next;
      });
      setAllCards((prev) => {
        const next = new Map(prev);
        variants.forEach((variant) => next.set(variant.id, variant));
        return next;
      });
    } catch {
      setVariantOptions((prev) => {
        const next = new Map(prev);
        if (!next.has(baseId)) next.set(baseId, []);
        return next;
      });
    } finally {
      setVariantLoadingIds((prev) => prev.filter((id) => id !== baseId));
    }
  }

  function toggleVariantPicker(cardId: string) {
    const baseId = getBaseCardId(cardId.toUpperCase());
    setVariantPickerFor((prev) => (prev === baseId ? null : baseId));
    void ensureVariantOptions(baseId);
  }

  function closeVariantPicker() {
    setVariantPickerFor(null);
  }

  function setCardArtOverride(cardId: string, variantId: string | null) {
    const baseId = getBaseCardId(cardId.toUpperCase());
    const normalizedVariantId = normalizeDeckVariantId(baseId, variantId);

    setArtOverrides((prev) => {
      const next = { ...prev };
      if (!normalizedVariantId) delete next[baseId];
      else next[baseId] = normalizedVariantId;
      return next;
    });

    setDeck((current) => {
      let changed = false;

      const nextCards = current.cards.map((entry) => {
        if (entry.cardId !== baseId) return entry;
        changed = true;
        if (!normalizedVariantId) {
          if (!("variantId" in entry)) return entry;
          const nextEntry = { ...entry };
          delete nextEntry.variantId;
          return nextEntry;
        }
        return { ...entry, variantId: normalizedVariantId };
      });

      const nextLeaderVariantId = current.leaderId === baseId ? normalizedVariantId ?? null : current.leaderVariantId ?? null;
      if (!changed && nextLeaderVariantId === (current.leaderVariantId ?? null)) return current;

      return {
        ...current,
        leaderVariantId: nextLeaderVariantId,
        cards: nextCards,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function applyVariantSelection(cardId: string, variantId: string) {
    const baseId = getBaseCardId(cardId.toUpperCase());
    const baseCard = allCards.get(baseId);

    setCardArtOverride(baseId, variantId);

    if (baseCard) {
      if (baseCard.type === "Leader") {
        addCard(baseCard, variantId);
      } else if (!deck.cards.some((entry) => entry.cardId === baseId)) {
        addCard(baseCard, variantId);
      }
    }

    setVariantPickerFor(null);
  }

  async function saveDeck() {
    if (!storageReady) return;

    const deckToSave = normalizeDeckToBaseIds({ ...deck, updatedAt: new Date().toISOString() });
    setDeck(deckToSave);

    if (hasCloud && !user) {
      const nextPath = `/deckbuilder?id=${encodeURIComponent(deckToSave.id)}`;
      setPendingAuthAction({
        kind: "save_deck",
        createdAt: new Date().toISOString(),
        next: nextPath,
        deck: deckToSave,
      });
      router.push(buildLoginUrl(nextPath, "save_deck"));
      return;
    }

    const decks = await loadDecksFromStore();
    const idx = decks.findIndex((candidate) => candidate.id === deckToSave.id);
    const nextDecks = [...decks];

    if (idx >= 0) nextDecks[idx] = deckToSave;
    else nextDecks.push(deckToSave);

    await saveDecksToStore(nextDecks);
    await syncDeckProfileArtifacts({
      shouldSync: Boolean(user),
      nextDecks,
      deckToSave,
      existingIndex: idx,
      cards: Array.from(allCards.values()),
    });
    setSaved(true);
    setActionNotice({ tone: "success", message: user ? `Saved "${deckToSave.name}" to your account.` : `Saved "${deckToSave.name}" locally.` });
    setTimeout(() => {
      setSaved(false);
      setActionNotice(null);
    }, 1800);
  }

  function exportDeck() {
    const leader = deck.leaderId ? allCards.get(deck.leaderId) : null;
    const lines = leader ? [`1x ${leader.id} ${leader.name} [Leader]`] : [];
    deckDisplayEntries.forEach(({ cardId, quantity }) => {
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

  function clearDeckBuilder() {
    setDeck(newDeck());
    setTechSlots([]);
    setArtOverrides({});
    setManualCardOrder([]);
    setDeckSortMode("auto");
    setVariantPickerFor(null);
    setMobileDeckOpen(false);
    setPlaytestOpen(false);
    setPlaytestState(null);
    setPreviewCardId(null);
  }

  function openCardPreview(cardId: string) {
    setPreviewCardId(cardId);
  }

  function closeCardPreview() {
    setPreviewCardId(null);
  }

  function stepCardPreview(direction: -1 | 1) {
    if (!deckPreviewItems.length) return;

    setPreviewCardId((current) => {
      const currentIndex = current ? deckPreviewItems.findIndex((item) => item.cardId === current) : -1;
      const fallbackIndex = direction === 1 ? 0 : deckPreviewItems.length - 1;
      const nextIndex = currentIndex < 0 ? fallbackIndex : (currentIndex + direction + deckPreviewItems.length) % deckPreviewItems.length;
      return deckPreviewItems[nextIndex]?.cardId || null;
    });
  }

  function createNextPlaytestState(order: PlaytestTurnOrder) {
    return createPlaytestState(deck, {
      order,
      handSize: 5,
      lifeCards: playtestLifeCards,
    });
  }

  function openPlaytest() {
    if (!canPlaytest) return;
    setPlaytestState(createNextPlaytestState(playtestOrder));
    setPlaytestOpen(true);
  }

  function handlePlaytestOrderChange(order: PlaytestTurnOrder) {
    setPlaytestOrder(order);
    if (!canPlaytest) return;
    setPlaytestState(createNextPlaytestState(order));
  }

  function handlePlaytestMulligan() {
    if (!canPlaytest) return;
    setPlaytestState(createNextPlaytestState(playtestOrder));
  }

  function handlePlaytestReset() {
    if (!canPlaytest) return;
    setPlaytestState(createNextPlaytestState(playtestOrder));
  }

  function handlePlaytestDraw() {
    setPlaytestState((current) => (current ? drawPlaytestCard(current) : current));
  }

  const storageLabel = user ? "Account sync active" : hasCloud ? "Sign in required to save decks" : "Saved locally";
  const deckPriceStatus = !deckPriceCardIds.length
    ? "Add cards to estimate"
    : deckPriceLoading && deckPrices.size === 0
      ? "Loading estimates"
      : deckPrices.size === 0
        ? "Pricing unavailable"
        : deckPriceSummary.placeholderEntries > 0
          ? `${deckPriceSummary.cachedEntries} cached · ${deckPriceSummary.placeholderEntries} estimated`
          : "Cached market pricing";
  const deckPriceTitle = [
    `Estimated deck total: ${formatCurrency(deckPriceSummary.total)}`,
    "Pricing uses cached market data where available.",
    deckPriceSummary.placeholderEntries > 0 ? `${deckPriceSummary.placeholderEntries} card entries are using placeholder pricing.` : null,
    deckPriceSummary.staleEntries > 0 ? `${deckPriceSummary.staleEntries} cached entries may be stale.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  function renderFilterControls(layout: "desktop" | "sheet") {
    const containerClass =
      layout === "desktop"
        ? "hidden md:flex md:flex-wrap md:items-center md:gap-2"
        : "grid gap-2 sm:grid-cols-2";

    const selectClass =
      layout === "desktop"
        ? "rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-text-dark)]"
        : "min-h-11 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2.5 text-sm text-[var(--color-text-dark)]";

    const buttonClass =
      layout === "desktop"
        ? "rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"
        : "min-h-11 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2.5 text-sm text-[var(--color-text-mid)]";

    return (
      <div className={containerClass}>
        <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className={selectClass} aria-label="Filter cards by color">
          <option value="">All Colors</option>
          {COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass} aria-label="Filter cards by type">
          <option value="">All Types</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setColorFilter("");
              setTypeFilter("");
            }}
            className={buttonClass}
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  function renderDeckPanel() {
    return (
      <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4">
        <input
          value={deck.name}
          onChange={(event) => setDeck((current) => ({ ...current, name: event.target.value, updatedAt: new Date().toISOString() }))}
          aria-label="Deck name"
          className="w-full border-b border-[var(--color-parchment-dark)] bg-transparent pb-1 text-lg font-bold text-[var(--color-navy)] outline-none"
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDropActive(true);
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDropActive(false);
            handleDropCard(event.dataTransfer.getData("text/plain"));
          }}
          className={`mt-3 rounded-xl border border-dashed p-3 text-xs transition-all ${isDropActive ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-navy)]" : "border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)]"}`}
        >
          Drag card here to add to deck
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2">
            <p className="text-[10px] text-[var(--color-text-light)]">Leader</p>
            <p className="mt-1 text-xs font-bold text-[var(--color-navy)]">{deck.leaderId ? "SET" : "NONE"}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2">
            <p className="text-[10px] text-[var(--color-text-light)]">Main</p>
            <p className="mt-1 text-xs font-bold text-[var(--color-navy)]">{mainDeckCount}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2">
            <p className="text-[10px] text-[var(--color-text-light)]">Built</p>
            <p className="mt-1 text-xs font-bold text-[var(--color-navy)]">{totalCards}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2" title={deckPriceTitle}>
            <p className="text-[10px] text-[var(--color-text-light)]">Price</p>
            <p className="mt-1 text-xs font-bold text-[var(--color-gold)]">{deckPriceLoading && deckPrices.size === 0 ? "..." : formatCurrency(deckPriceSummary.total)}</p>
            <p className="mt-1 text-[9px] text-[var(--color-text-light)]">{deckPriceStatus}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
          <div className={`inline-flex items-center gap-2 text-sm font-bold ${validationResult.legal ? "text-emerald-700" : "text-amber-700"}`}>
            {validationResult.legal ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            {validationResult.legal ? `${selectedFormatRule.label} legal` : `${validationResult.issues.length} issues to fix`}
          </div>
          <button
            type="button"
            onClick={openPlaytest}
            disabled={!canPlaytest}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-gold)] bg-[var(--color-gold)]/15 px-4 text-sm font-bold text-[var(--color-gold)] disabled:cursor-not-allowed disabled:border-[var(--color-parchment-dark)] disabled:bg-[var(--color-cream)] disabled:text-[var(--color-text-light)]"
          >
            <FlaskConical className="h-4 w-4" />
            Playtest
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">
              <Crown className="h-3 w-3" />
              Leader
            </p>
            {leaderCard ? (
              <button
                type="button"
                onClick={() => toggleVariantPicker(leaderCard.id)}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-[var(--color-parchment-dark)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Art
              </button>
            ) : null}
          </div>
          {leaderCard ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-cream)] p-2">
                <DeckCardImage
                  src={deckImageFor(leaderCard.id)}
                  alt={leaderCard.name}
                  sizes="40px"
                  className="h-14 w-10 rounded"
                  imageClassName="object-cover"
                  priority
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--color-navy)]">{leaderCard.name}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">
                    {leaderCard.id} · {leaderCard.color}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeck((current) => ({ ...current, leaderId: null, leaderVariantId: null, updatedAt: new Date().toISOString() }))}
                  aria-label="Remove leader"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--color-text-light)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--color-parchment-dark)] p-3 text-xs text-[var(--color-text-light)]">Pick or drop a Leader card</p>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Captain&apos;s Tech Board (drag to reorder)</p>
          <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            {visibleTechSlots.length === 0 ? (
              <p className="text-xs text-[var(--color-text-light)]">Mark cards with the T button to pin up to 8 key tech slots.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-1">
                {visibleTechSlots.map((cardId, index) => {
                  const card = allCards.get(cardId);
                  if (!card) return null;

                  return (
                    <div
                      key={cardId}
                      draggable
                      onDragStart={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData("text/tech-index", String(index))}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event: DragEvent<HTMLDivElement>) => {
                        const from = Number(event.dataTransfer.getData("text/tech-index"));
                        reorderTechSlots(from, index);
                      }}
                      className="cursor-grab"
                      style={{ transform: `rotate(${(index - (visibleTechSlots.length - 1) / 2) * 4}deg)` }}
                      title={`${index + 1}. ${card.name}`}
                    >
                      <DeckCardImage
                        src={deckImageFor(cardId)}
                        alt={card.name}
                        sizes="44px"
                        className="h-16 w-11 rounded border border-[var(--color-parchment-dark)] shadow-lg"
                        imageClassName="object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Visual Stack</p>
            <div className="flex items-center gap-2">
              {deckSortMode === "manual" ? <p className="hidden text-[10px] text-[var(--color-text-light)] sm:block">Drag rows to reorder</p> : null}
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-light)]" />
                <select
                  value={deckSortMode}
                  onChange={(event) => setDeckSortMode(event.target.value as DeckSortMode)}
                  aria-label="Sort deck cards"
                  className="min-h-9 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] py-2 pl-7 pr-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-dark)]"
                >
                  {DECK_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {deckDisplayEntries.map(({ cardId, quantity, card }) => {
                if (!card) return null;
                const costValue = typeof card.cost === "number" ? card.cost : 0;
                const counterValue = typeof card.counter === "number" ? formatCounterLabel(card.counter) : "0";
                const typeLine = `${card.id} · ${card.type}`;
                const statsLine = `Cost ${costValue} · ${counterValue} Counter`;

                return (
                  <motion.div
                    key={cardId}
                    layout
                    draggable={deckSortMode === "manual"}
                    onDragStartCapture={(event: DragEvent<HTMLDivElement>) => {
                      if (deckSortMode !== "manual") return;
                      event.dataTransfer.setData("text/deck-card-id", cardId);
                    }}
                    onDragOver={(event) => {
                      if (deckSortMode === "manual") event.preventDefault();
                    }}
                    onDrop={(event: DragEvent<HTMLDivElement>) => {
                      if (deckSortMode !== "manual") return;
                      const fromId = event.dataTransfer.getData("text/deck-card-id");
                      moveDeckEntry(fromId, cardId);
                    }}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2.5 py-2 lg:px-3"
                  >
                    <div className="lg:hidden">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold leading-tight text-[var(--color-navy)]">{card.name}</p>
                        </div>
                        {techSlots.includes(cardId) ? (
                          <span className="shrink-0 rounded-full bg-[var(--color-gold)] px-1.5 py-0.5 text-[9px] font-black text-white">
                            TECH
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={deckSortMode === "manual" ? `Drag ${card.name} to reorder` : `${card.name} ordering is controlled by sort mode`}
                            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--color-parchment-dark)] sm:min-h-9 sm:min-w-9 ${deckSortMode === "manual" ? "cursor-grab text-[var(--color-text-mid)]" : "cursor-not-allowed text-[var(--color-parchment-dark)]"}`}
                            disabled={deckSortMode !== "manual"}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCardPreview(cardId);
                            }}
                            aria-label={`Open large preview for ${card.name}`}
                            title={`Open large preview for ${card.name}`}
                            className="shrink-0 cursor-pointer rounded-lg transition duration-150 hover:scale-[1.03] hover:brightness-110"
                          >
                            <DeckCardImage
                              src={deckImageFor(cardId)}
                              alt={card.name}
                              sizes="40px"
                              className="h-14 w-10 shrink-0 rounded"
                              imageClassName="object-cover"
                            />
                          </button>
                        </div>

                        <div className="min-w-0 self-start sm:self-center">
                          <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-light)]">{card.id}</p>
                          <p className="mt-1 text-[11px] text-[var(--color-text-mid)]">{card.type}</p>
                          <p className="text-[11px] text-[var(--color-text-mid)]">Cost {costValue}</p>
                          <p className="text-[11px] text-[var(--color-text-mid)]">{counterValue} counter</p>
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-1 sm:col-span-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => removeOne(cardId)}
                            aria-label={`Remove one ${card.name}`}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--color-text-mid)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-[var(--color-navy)] sm:min-h-9 sm:min-w-9"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-[var(--color-navy)]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => addCard(card)}
                            disabled={quantity >= 4}
                            aria-label={`Add one ${card.name}`}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--color-text-mid)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-[var(--color-navy)] disabled:opacity-30 sm:min-h-9 sm:min-w-9"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleVariantPicker(cardId)}
                            aria-label={`Choose art for ${card.name}`}
                            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border sm:min-h-9 sm:min-w-9 ${artOverrides[getBaseCardId(cardId)] ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]" : "border-[var(--color-parchment-dark)] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleTechSlot(cardId)}
                            aria-label={techSlots.includes(cardId) ? `Unpin ${card.name} from tech board` : `Pin ${card.name} to tech board`}
                            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border text-xs font-bold sm:min-h-9 sm:min-w-9 ${techSlots.includes(cardId) ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white" : "border-[var(--color-parchment-dark)] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                          >
                            T
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCard(cardId)}
                            aria-label={`Remove ${card.name} from deck`}
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--color-text-light)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-red-600 sm:min-h-9 sm:min-w-9"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:flex lg:items-center lg:gap-3">
                      <button
                        type="button"
                        aria-label={deckSortMode === "manual" ? `Drag ${card.name} to reorder` : `${card.name} ordering is controlled by sort mode`}
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-parchment-dark)] ${deckSortMode === "manual" ? "cursor-grab text-[var(--color-text-mid)]" : "cursor-not-allowed text-[var(--color-parchment-dark)]"}`}
                        disabled={deckSortMode !== "manual"}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openCardPreview(cardId);
                        }}
                        aria-label={`Open large preview for ${card.name}`}
                        title={`Open large preview for ${card.name}`}
                        className="shrink-0 cursor-pointer rounded-lg transition duration-150 hover:scale-[1.03] hover:brightness-110"
                      >
                        <DeckCardImage
                          src={deckImageFor(cardId)}
                          alt={card.name}
                          sizes="44px"
                          className="h-16 w-11 shrink-0 rounded-lg border border-[var(--color-parchment-dark)]"
                          imageClassName="object-cover"
                        />
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p title={card.name} className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight text-[var(--color-navy)]">
                            {card.name}
                          </p>
                          {techSlots.includes(cardId) ? (
                            <span className="shrink-0 rounded-full bg-[var(--color-gold)] px-1.5 py-0.5 text-[9px] font-black text-white">
                              TECH
                            </span>
                          ) : null}
                        </div>
                        <p title={typeLine} className="truncate text-[11px] leading-[1.35] text-[var(--color-text-light)]">
                          {typeLine}
                        </p>
                        <p title={statsLine} className="truncate text-[11px] leading-[1.35] text-[var(--color-text-mid)]">
                          {statsLine}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => removeOne(cardId)}
                          aria-label={`Remove one ${card.name}`}
                          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--color-text-mid)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-[var(--color-navy)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[var(--color-navy)]">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => addCard(card)}
                          disabled={quantity >= 4}
                          aria-label={`Add one ${card.name}`}
                          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--color-text-mid)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-[var(--color-navy)] disabled:opacity-30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleVariantPicker(cardId)}
                          aria-label={`Choose art for ${card.name}`}
                          className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border ${artOverrides[getBaseCardId(cardId)] ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]" : "border-[var(--color-parchment-dark)] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleTechSlot(cardId)}
                          aria-label={techSlots.includes(cardId) ? `Unpin ${card.name} from tech board` : `Pin ${card.name} to tech board`}
                          className={`inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-lg border px-2 text-[10px] font-bold ${techSlots.includes(cardId) ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white" : "border-[var(--color-parchment-dark)] text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCard(cardId)}
                          aria-label={`Remove ${card.name} from deck`}
                          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[var(--color-text-light)] hover:bg-[var(--color-parchment-dark)]/50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {deckDisplayEntries.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--color-parchment-dark)] p-4 text-xs text-[var(--color-text-light)]">Your deck is empty. Tap or drag cards in from the browser.</p> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CurveChart title="DON Curve" buckets={curveBuckets} />
          <CurveChart title="Counter Curve" buckets={counterBuckets} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Type Split</p>
            <div className="space-y-2">
              {typeDistribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-mid)]">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-parchment-dark)]/50">
                    <div className="h-2 rounded-full bg-[var(--color-gold)] transition-all" style={{ width: `${Math.max(item.percent, item.count > 0 ? 10 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Color Split</p>
            <div className="space-y-2">
              {colorDistribution.length ? (
                colorDistribution.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-mid)]">
                      <span>{item.label}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-parchment-dark)]/50">
                      <div className={`h-2 rounded-full transition-all ${COLOR_BAR_CLASS[item.label] || "bg-[var(--color-navy)]"}`} style={{ width: `${Math.max(item.percent, item.count > 0 ? 10 : 0)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--color-text-light)]">Add cards to see the deck&apos;s color spread.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Average Power by Cost</p>
            <p className="text-[10px] text-[var(--color-text-light)]">Characters only</p>
          </div>
          {powerByCost.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {powerByCost.map((bucket) => (
                <div key={bucket.label} className="rounded-lg border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-2 text-center">
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Cost {bucket.label}</p>
                  <p className="mt-1 text-sm font-black text-[var(--color-navy)]">{formatPower(bucket.averagePower)}</p>
                  <p className="text-[10px] text-[var(--color-text-light)]">{bucket.copies} copies</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-light)]">Character power averages appear once you add characters with power values.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <DonButton onClick={saveDeck}>
            {saved ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Save className="h-4 w-4" />
                Save
              </span>
            )}
          </DonButton>
          <DonButton onClick={exportDeck}>
            {exported ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Copied
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Download className="h-4 w-4" />
                Export
              </span>
            )}
          </DonButton>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={clearDeckBuilder}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-red-600/30 py-2 text-xs text-red-700 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <Link href="/decks" className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--color-parchment-dark)] py-2 text-xs text-[var(--color-text-mid)] hover:text-[var(--color-navy)]">
            <BookOpen className="h-3.5 w-3.5" />
            My Decks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-gold)]">
          <FlaskConical className="h-3 w-3" />
          Deck Construction
        </div>
        <h1 className="font-[var(--font-display)] text-3xl font-black text-[var(--color-navy)] md:text-4xl">Deck Lab</h1>
        <p className="mt-2 text-sm text-[var(--color-text-mid)]">Drag cards into your deck zone, tune your DON curve, and export tournament-ready lists.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-light)]">
          {user ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <Loader2 className={`h-3.5 w-3.5 ${storageReady ? "text-[var(--color-text-light)]" : "animate-spin text-[var(--color-text-light)]"}`} />}
          {storageReady ? storageLabel : deckIdFromUrl ? "Loading saved deck" : "Checking deck storage"}
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setAltArtView((v) => !v)}
            aria-pressed={altArtView}
            aria-label={altArtView ? "Alt Art View on" : "Alt Art View off"}
            title="Swap deck images to alternate art when an explicit alt-art variant is available"
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] ${altArtView ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]" : "border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)]"}`}
          >
            {altArtView ? "Alt Art View: ON" : "Alt Art View: OFF"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Deck Size</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{mainDeckCount}/50</p>
            <p className="text-xs text-[var(--color-text-mid)]">Leader counted separately</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Leader</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-gold)]">{leaderCard ? leaderCard.name : "Not set"}</p>
            <p className="text-xs text-[var(--color-text-mid)]">{leaderCard ? leaderCard.color : "Drop/select a Leader card first"}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Status</p>
            <div className={`mt-1 inline-flex items-center gap-2 text-sm font-bold ${validationResult.legal ? "text-emerald-700" : "text-amber-700"}`}>
              {validationResult.legal ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {validationResult.legal ? "Deck Legal" : "Needs tuning"}
            </div>
          </div>
        </div>

        {actionNotice ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              actionNotice.tone === "success"
                ? "border-emerald-700/20 bg-emerald-700/10 text-emerald-800"
                : "border-red-700/20 bg-red-700/10 text-red-800"
            }`}
          >
            {actionNotice.message}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-light)]">Official Format Validation</p>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${validationResult.legal ? "border-emerald-700/25 bg-emerald-700/10 text-emerald-800" : "border-amber-700/25 bg-amber-700/10 text-amber-800"}`}>
              {validationResult.legal ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {validationResult.legal ? "Deck Legal" : "Deck Needs Fixes"}
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-mid)]">{selectedFormatRule.description}</p>
            {selectedFormatRule.effectiveDate ? <p className="mt-1 text-xs text-[var(--color-text-light)]">Official effective date: {selectedFormatRule.effectiveDate}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">Format</span>
              <select
                value={selectedFormat}
                onChange={(event) => setSelectedFormat(event.target.value as DeckFormatId)}
                aria-label="Select deck validation format"
                className="min-h-11 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-text-dark)]"
              >
                {Object.values(DECK_FORMAT_RULES).map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={openPlaytest}
              disabled={!canPlaytest}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-gold)] bg-[var(--color-gold)]/15 px-4 text-sm font-bold text-[var(--color-gold)] disabled:cursor-not-allowed disabled:border-[var(--color-parchment-dark)] disabled:bg-[var(--color-cream)] disabled:text-[var(--color-text-light)] sm:self-end"
            >
              <FlaskConical className="h-4 w-4" />
              Test Hand
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Leader</p>
            <p className="mt-1 text-xl font-black text-[var(--color-navy)]">{validationResult.summary.leaderCount}/1</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Main Deck</p>
            <p className="mt-1 text-xl font-black text-[var(--color-navy)]">{validationResult.summary.mainDeckCount}/50</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">DON!! Deck</p>
            <p className="mt-1 text-xl font-black text-[var(--color-navy)]">{DON_DECK_SIZE}/10</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Issues</p>
            <p className="mt-1 text-xl font-black text-[var(--color-navy)]">{validationResult.issues.length}</p>
          </div>
        </div>

        {validationResult.issues.length ? (
          <div className="mt-4 space-y-2">
            {validationResult.issues.map((issue, index) => (
              <div key={`${issue.code}-${index}`} className="rounded-2xl border border-red-700/20 bg-red-700/10 px-4 py-3 text-sm text-red-800">
                {issue.message}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-700/20 bg-emerald-700/10 px-4 py-3 text-sm text-emerald-800">
            This deck satisfies the current {selectedFormatRule.label} deck construction checks in the builder.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-light)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search cards"
                placeholder="Set sail to a card..."
                className="w-full rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] py-3 pl-9 pr-10 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
              />
              {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--color-text-light)]" /> : null}
            </div>
            <div className="mt-3 flex gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 text-sm font-bold text-[var(--color-navy)]"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters ? <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-black text-white">Live</span> : null}
              </button>
              <button
                type="button"
                onClick={() => setMobileDeckOpen(true)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 text-sm font-bold text-[var(--color-navy)]"
              >
                <BookOpen className="h-4 w-4" />
                Deck
                <span className="text-[var(--color-text-mid)]">{mobileDeckLabel}</span>
              </button>
            </div>
            <div className="mt-3">{renderFilterControls("desktop")}</div>
            <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">
              <span>{results.length} cards loaded</span>
              <span>{hasActiveFilters ? "Filtered view" : "Full browse view"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {results.map((card, index) => {
              const qty = card.type === "Leader"
                ? (deck.leaderId === card.id ? 1 : 0)
                : (deckQuantityById.get(card.id.toUpperCase()) ?? 0);

              return (
                <motion.div
                  key={card.id}
                  draggable
                  onDragStartCapture={(event: DragEvent<HTMLDivElement>) => event.dataTransfer.setData("text/plain", card.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addCard(card)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      addCard(card);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={card.type === "Leader" ? `Set ${card.name} as leader` : `Add ${card.name} to deck`}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border text-left ${qty > 0 ? "border-[var(--color-gold)]" : "border-[var(--color-parchment-dark)]"} bg-[var(--color-cream)] shadow-[0_12px_40px_rgba(0,0,0,0.08)]`}
                >
                  <DeckCardImage
                    src={`/api/card-image?id=${encodeURIComponent(card.id)}`}
                    alt={card.name}
                    sizes="(max-width: 640px) 46vw, (max-width: 1280px) 22vw, 180px"
                    className="aspect-[63/88] w-full"
                    imageClassName="object-cover"
                    priority={index < 4}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void ensureVariantOptions(card.id);
                      toggleVariantPicker(card.id);
                    }}
                    aria-label={`Open official print gallery for ${card.name}`}
                    className="absolute left-2 top-2 z-10 inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/20 bg-black/55 text-white/80 backdrop-blur hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                  {qty > 0 ? <span className="absolute right-2 top-2 rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-black text-white">{qty}</span> : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-1">
                    <p className="truncate text-[10px] font-bold text-white/90">{card.name}</p>
                    <p className="mt-0.5 text-[9px] text-white/55">
                      {card.type} · {card.color}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {!results.length && !searching ? <p className="rounded-2xl border border-dashed border-[var(--color-parchment-dark)] p-6 text-sm text-[var(--color-text-light)]">No cards matched the current search and filters.</p> : null}
        </section>

        <aside className="hidden self-start space-y-4 lg:sticky lg:top-4 lg:block">{renderDeckPanel()}</aside>
      </div>

      <MobileSheet open={mobileFiltersOpen} title="Filters" onClose={() => setMobileFiltersOpen(false)}>
        <div className="space-y-3">
          {renderFilterControls("sheet")}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white"
          >
            Apply Filters
          </button>
        </div>
      </MobileSheet>

      <MobileSheet open={mobileDeckOpen} title="Current Deck" onClose={() => setMobileDeckOpen(false)}>
        {renderDeckPanel()}
      </MobileSheet>

      <PlaytestModal
        open={playtestOpen}
        deckName={deck.name}
        leaderCard={leaderCard}
        playtestState={playtestState}
        allCards={allCards}
        onClose={() => setPlaytestOpen(false)}
        onDraw={handlePlaytestDraw}
        onMulligan={handlePlaytestMulligan}
        onReset={handlePlaytestReset}
        order={playtestOrder}
        onOrderChange={handlePlaytestOrderChange}
      />

      <VariantGalleryModal
        open={Boolean(activeVariantBaseId)}
        baseCard={activeVariantBaseCard}
        variants={activeVariantOptions}
        selectedVariantId={activeVariantSelectedId}
        loading={activeVariantLoading}
        inDeck={activeVariantInDeck}
        onClose={closeVariantPicker}
        onChoose={(variantId) => applyVariantSelection(activeVariantBaseId || variantId, variantId)}
      />

      <DeckImageLightbox
        open={previewActiveIndex >= 0}
        cards={deckPreviewItems}
        activeIndex={previewActiveIndex}
        onClose={closeCardPreview}
        onPrevious={() => stepCardPreview(-1)}
        onNext={() => stepCardPreview(1)}
      />
    </div>
  );
}

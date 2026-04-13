"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, ExternalLink, ImageIcon, Loader2, PencilLine, X } from "lucide-react";

import type { Card } from "@/lib/cards";
import type { CardPriceQuote } from "@/lib/card-price-quotes";
import type { Deck } from "@/lib/cloud/types";
import type { DeckCollectionCoverage } from "@/lib/decks/deck-collection-coverage";
import type { DeckAnalyticsSummary } from "@/lib/decks/deck-modal-analytics";
import type { DeckMatchupRow } from "@/lib/decks/deck-modal-matchups";

export type DeckModalGroup = {
  key: "leader" | "character" | "event" | "stage";
  label: string;
  total: number;
  entries: Array<{
    card: Card;
    quantity: number;
    imageCardId: string;
    pricingId: string;
  }>;
};

type NotesState = "idle" | "loading" | "saving" | "saved" | "error";

type DeckViewModalProps = {
  open: boolean;
  deck: Deck | null;
  leader: Card | null;
  totalCards: number;
  deckValueLabel: string;
  groups: DeckModalGroup[];
  priceQuotes: Map<string, CardPriceQuote>;
  collectionCoverage: DeckCollectionCoverage | null;
  hasCollectionData: boolean;
  analytics: DeckAnalyticsSummary | null;
  matchupRows: DeckMatchupRow[];
  notes: string;
  notesState: NotesState;
  notesEnabled: boolean;
  notesError?: string | null;
  simExportText: string;
  onClose: () => void;
  onNotesChange: (next: string) => void;
  onNotesCommit: () => void;
  onCardSelect?: (card: Card) => void;
};

type ModalNotice = {
  tone: "success" | "error";
  message: string;
};

function actionButtonClasses() {
  return "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-dark)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)] disabled:opacity-60 disabled:hover:border-[var(--color-parchment-dark)] disabled:hover:text-[var(--color-text-dark)]";
}

function proxyCardImageUrl(cardId: string) {
  return `/api/card-image?id=${encodeURIComponent(cardId)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toneClasses(tone: DeckMatchupRow["tone"]) {
  if (tone === "favored") return "border-emerald-300/45 bg-emerald-50 text-emerald-800";
  if (tone === "unfavored") return "border-red-300/45 bg-red-50 text-red-700";
  return "border-[var(--color-gold)]/35 bg-[rgba(212,160,84,0.12)] text-[var(--color-gold-dark)]";
}

function notesStatusCopy(state: NotesState, error?: string | null) {
  if (state === "loading") return "Loading notes...";
  if (state === "saving") return "Saving...";
  if (state === "saved") return "Saved";
  if (state === "error") return error || "Couldn't save note";
  return "Autosaves when you click away";
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image data"));
    reader.readAsDataURL(blob);
  });
}

async function fetchCardImageDataUrl(cardId: string) {
  const response = await fetch(proxyCardImageUrl(cardId), { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load card image for ${cardId}`);
  }

  return await blobToDataUrl(await response.blob());
}

async function nextPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function CurveChart({ title, buckets }: { title: string; buckets: DeckAnalyticsSummary["costCurve"] }) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">{title}</p>
        <span className="text-[10px] text-[var(--color-text-light)]">Main deck only</span>
      </div>
      <div className="mt-4 flex items-end gap-2">
        {buckets.map((bucket) => (
          <div key={`${title}-${bucket.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end rounded-full bg-[var(--color-parchment)] px-1 py-1">
              <div
                className="w-full rounded-full bg-[linear-gradient(180deg,var(--color-gold),var(--color-gold-dark))] transition-all"
                style={{ height: `${bucket.count === 0 ? 8 : Math.max((bucket.count / max) * 100, 12)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black text-[var(--color-text-dark)]">{bucket.count}</p>
              <p className="text-[10px] text-[var(--color-text-light)]">{bucket.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DeckViewModal({
  open,
  deck,
  leader,
  totalCards,
  deckValueLabel,
  groups,
  priceQuotes,
  collectionCoverage,
  hasCollectionData,
  analytics,
  matchupRows,
  notes,
  notesState,
  notesEnabled,
  notesError,
  simExportText,
  onClose,
  onNotesChange,
  onNotesCommit,
  onCardSelect,
}: DeckViewModalProps) {
  const [notice, setNotice] = useState<ModalNotice | null>(null);
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [exportImages, setExportImages] = useState<Record<string, string>>({});
  const exportRef = useRef<HTMLDivElement | null>(null);

  const leaderEntry = useMemo(
    () => groups.find((group) => group.key === "leader")?.entries[0] || null,
    [groups],
  );
  const mainGroups = useMemo(
    () => groups.filter((group) => group.key !== "leader"),
    [groups],
  );
  const exportImageIds = useMemo(() => {
    const ids = new Set<string>();
    if (leaderEntry?.imageCardId) ids.add(leaderEntry.imageCardId);
    for (const group of mainGroups) {
      for (const entry of group.entries) ids.add(entry.imageCardId);
    }
    return Array.from(ids);
  }, [leaderEntry, mainGroups]);
  const canCopyImage =
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    setSharePreviewUrl(null);
    setNotice(null);
    setCopyingImage(false);
  }, [deck?.id]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function ensureExportImages() {
    const missingIds = exportImageIds.filter((cardId) => !exportImages[cardId]);
    if (!missingIds.length) return exportImages;

    const fetchedEntries = await Promise.all(
      missingIds.map(async (cardId) => [cardId, await fetchCardImageDataUrl(cardId)] as const),
    );

    const next = { ...exportImages };
    for (const [cardId, dataUrl] of fetchedEntries) {
      next[cardId] = dataUrl;
    }
    setExportImages(next);
    return next;
  }

  async function handleShareAsImage() {
    if (!deck || !leaderEntry?.imageCardId) return;

    setShareLoading(true);
    try {
      await ensureExportImages();
      await nextPaint();
      await nextPaint();

      if (!exportRef.current) {
        throw new Error("Export view isn't ready yet.");
      }

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#111827",
      });
      setSharePreviewUrl(dataUrl);
      setNotice({ tone: "success", message: "Deck image ready." });
    } catch (error) {
      setSharePreviewUrl(null);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to generate deck image right now.",
      });
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopySim() {
    try {
      await navigator.clipboard.writeText(simExportText);
      setNotice({ tone: "success", message: "Deck copied for OPTCGSim!" });
    } catch {
      setNotice({ tone: "error", message: "Couldn't copy the deck list." });
    }
  }

  function handleDownloadImage() {
    if (!sharePreviewUrl || !deck) return;
    const anchor = document.createElement("a");
    anchor.href = sharePreviewUrl;
    anchor.download = `${deck.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-deck.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  async function handleCopyImage() {
    if (!sharePreviewUrl || !canCopyImage) return;
    setCopyingImage(true);

    try {
      const response = await fetch(sharePreviewUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setNotice({ tone: "success", message: "Image copied to clipboard." });
    } catch {
      setNotice({ tone: "error", message: "Couldn't copy the image." });
    } finally {
      setCopyingImage(false);
    }
  }

  return (
    <AnimatePresence>
      {open && deck ? (
        <div className="fixed inset-0 z-[140]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(13,21,38,0.74)] backdrop-blur-sm"
          />

          <div className="absolute inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-0 md:items-center md:p-4">
              <motion.section
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 20 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="relative flex h-screen w-full flex-col overflow-hidden border border-[var(--color-parchment-dark)] bg-[linear-gradient(180deg,rgba(245,239,227,0.98),rgba(250,247,242,0.98))] shadow-[0_24px_60px_rgba(19,28,43,0.35)] md:h-auto md:max-h-[92vh] md:w-[90vw] md:max-w-[1200px] md:rounded-[28px]"
                aria-modal="true"
                role="dialog"
                aria-label={deck.name}
              >
                <div className="sticky top-0 z-10 border-b border-[var(--color-parchment-dark)] bg-[rgba(250,247,242,0.96)] px-4 py-3 backdrop-blur md:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Crew Hangar</p>
                      <h2 className="font-['Pirata_One'] text-2xl text-[var(--color-navy)] md:text-3xl">{deck.name}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/deckbuilder?id=${encodeURIComponent(deck.id)}`} className={actionButtonClasses()}>
                        <PencilLine className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit Deck</span>
                      </Link>
                      <button
                        type="button"
                        className={actionButtonClasses()}
                        onClick={() => {
                          void handleShareAsImage();
                        }}
                        disabled={shareLoading}
                      >
                        {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        <span className="hidden sm:inline">Share as Image</span>
                      </button>
                      <button
                        type="button"
                        className={actionButtonClasses()}
                        onClick={() => {
                          void handleCopySim();
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Export to Sim</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close deck view"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {notice ? (
                    <div
                      className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        notice.tone === "success"
                          ? "border-emerald-300/45 bg-emerald-50 text-emerald-800"
                          : "border-red-300/45 bg-red-50 text-red-700"
                      }`}
                    >
                      {notice.message}
                    </div>
                  ) : null}
                </div>

                <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(320px,0.34fr)_minmax(0,0.66fr)]">
                  <aside className="overflow-y-auto border-b border-[var(--color-parchment-dark)] bg-[rgba(252,249,243,0.92)] p-4 md:border-b-0 md:border-r md:p-6">
                    <div className="mx-auto max-w-[300px] space-y-5 text-center md:mx-0 md:max-w-none md:text-left">
                      <div className="mx-auto w-[180px] overflow-hidden rounded-[24px] border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-2 shadow-[0_18px_36px_rgba(42,33,24,0.14)] md:mx-0 md:w-[220px]">
                        <img
                          src={proxyCardImageUrl(leaderEntry?.imageCardId || leader?.id || deck.leaderId || "")}
                          alt={leader?.name || "Leader"}
                          className="aspect-[63/88] w-full rounded-[18px] object-cover"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-black text-[var(--color-navy)]">{leader?.name || "No leader selected"}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
                          <span className="rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[11px] font-bold text-[var(--color-text-dark)]">
                            {totalCards}/50 main deck
                          </span>
                          <span className="rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[11px] font-bold text-[var(--color-text-dark)]">
                            {mainGroups.reduce((sum, group) => sum + group.entries.length, 0)} unique
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                        <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">Deck Value</p>
                          <p className="mt-1 text-2xl font-black text-[var(--color-gold-dark)]">{deckValueLabel}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-light)]">Live JustTCG pricing</p>
                        </div>

                        <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">Collection Coverage</p>
                          {hasCollectionData && collectionCoverage ? (
                            <>
                              <p className="mt-1 text-lg font-black text-[var(--color-navy)]">
                                You own {collectionCoverage.ownedCopies}/{collectionCoverage.totalCopies} cards
                              </p>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-parchment)]">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-gold-dark))]"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.round((collectionCoverage.ownedCopies / Math.max(collectionCoverage.totalCopies, 1)) * 100),
                                    )}%`,
                                  }}
                                />
                              </div>
                              {collectionCoverage.missingCards.length ? (
                                <details className="mt-3 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-3">
                                  <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-mid)]">
                                    Missing Cards ({collectionCoverage.missingCards.length})
                                  </summary>
                                  <div className="mt-3 space-y-2 text-left">
                                    {collectionCoverage.missingCards.map((item) => (
                                      <div
                                        key={`${deck.id}-${item.cardId}`}
                                        className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-text-dark)]"
                                      >
                                        <p className="font-bold text-[var(--color-navy)]">{item.cardName}</p>
                                        <p className="mt-1 text-[var(--color-text-light)]">Need {item.quantity}, own {item.owned}</p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : (
                                <p className="mt-2 text-xs text-emerald-700">You already own this full list.</p>
                              )}
                            </>
                          ) : (
                            <div className="mt-2 rounded-xl border border-dashed border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-3 py-3 text-sm text-[var(--color-text-light)]">
                              Track your collection to see deck coverage.
                              <div className="mt-2">
                                <Link href="/collection" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">
                                  Open Collection
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/deckbuilder?id=${encodeURIComponent(deck.id)}`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-navy)] px-4 py-3 text-sm font-bold text-white transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit Deck in Deck Lab
                      </Link>
                    </div>
                  </aside>

                  <div className="min-h-0 overflow-y-auto p-4 md:p-6">
                    <div className="space-y-6">
                      {mainGroups.map((group) => (
                        <section key={group.key} className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                              {group.label} ({group.total})
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {group.entries.map((entry) => {
                              const quote = priceQuotes.get(entry.pricingId.toUpperCase());
                              const unitPrice = quote?.priced && typeof quote.marketPrice === "number" ? formatCurrency(quote.marketPrice) : "N/A";
                              const subtotal =
                                quote?.priced && typeof quote.marketPrice === "number"
                                  ? formatCurrency(quote.marketPrice * entry.quantity)
                                  : "No price";

                              return (
                                <button
                                  key={`${group.key}-${entry.imageCardId}-${entry.card.id}`}
                                  type="button"
                                  onClick={() => onCardSelect?.(entry.card)}
                                  className="overflow-hidden rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-left shadow-[0_12px_28px_rgba(42,33,24,0.08)] transition-transform hover:-translate-y-0.5"
                                >
                                  <div className="relative">
                                    <img
                                      src={proxyCardImageUrl(entry.imageCardId)}
                                      alt={entry.card.name}
                                      className="aspect-[63/88] w-full object-cover"
                                    />
                                    <div className="absolute left-2 top-2 rounded-full border border-black/10 bg-[rgba(15,23,42,0.78)] px-2 py-1 text-[10px] font-black text-white">
                                      ×{entry.quantity}
                                    </div>
                                  </div>
                                  <div className="space-y-2 p-2.5">
                                    <p className="line-clamp-2 text-xs font-black text-[var(--color-text-dark)]">{entry.card.name}</p>
                                    <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-2.5 py-2">
                                      <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-light)]">
                                        {entry.quantity} × {unitPrice}
                                      </p>
                                      <p className="mt-1 text-sm font-black text-[var(--color-gold-dark)]">{subtotal}</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}

                      {analytics ? (
                        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
                          <CurveChart title="Cost Curve" buckets={analytics.costCurve} />
                          <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">Counter Breakdown</p>
                            <div className="mt-4 space-y-3">
                              {[
                                { label: "+2000", count: analytics.counterBreakdown.plus2000, tone: "bg-emerald-50 text-emerald-800 border-emerald-300/35" },
                                { label: "+1000", count: analytics.counterBreakdown.plus1000, tone: "bg-[rgba(212,160,84,0.12)] text-[var(--color-gold-dark)] border-[var(--color-gold)]/35" },
                                { label: "0 Counter", count: analytics.counterBreakdown.zero, tone: "bg-[var(--color-parchment)] text-[var(--color-text-mid)] border-[var(--color-parchment-dark)]" },
                              ].map((bucket) => (
                                <div
                                  key={bucket.label}
                                  className={`flex items-center justify-between rounded-2xl border px-3 py-3 ${bucket.tone}`}
                                >
                                  <span className="text-xs font-black uppercase tracking-[0.1em]">{bucket.label}</span>
                                  <span className="text-lg font-black">{bucket.count}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        </section>
                      ) : null}

                      <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">Your Matchups</p>
                          <span className="text-[10px] text-[var(--color-text-light)]">Top meta leaders</span>
                        </div>
                        {matchupRows.length ? (
                          <div className="mt-4 space-y-2">
                            {matchupRows.map((row) => (
                              <div
                                key={`${deck.id}-${row.opponentId}`}
                                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-3 py-2.5"
                              >
                                <img
                                  src={proxyCardImageUrl(row.opponentCardId)}
                                  alt={row.opponentName}
                                  className="h-10 w-10 rounded-xl border border-[var(--color-parchment-dark)] object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-[var(--color-text-dark)]">{row.opponentName}</p>
                                  <p className="text-[11px] text-[var(--color-text-light)]">{row.opponentColor} · {row.metaShare.toFixed(1)}% meta share</p>
                                </div>
                                <div className={`rounded-full border px-3 py-1 text-xs font-black ${toneClasses(row.tone)}`}>
                                  {row.winRate.toFixed(0)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-[var(--color-text-light)]">No matchup data available for this leader yet.</p>
                        )}
                      </section>

                      <section className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-light)]">CAPTAIN&apos;S LOG</p>
                            <p className="mt-1 text-sm text-[var(--color-text-mid)]">Jot down your gameplan, mulligan priorities, key combos...</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-semibold ${notesState === "error" ? "text-red-700" : "text-[var(--color-text-light)]"}`}>
                              {notesStatusCopy(notesState, notesError)}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-text-light)]">{notes.length}/2000</p>
                          </div>
                        </div>
                        <textarea
                          value={notes}
                          onChange={(event) => onNotesChange(event.target.value.slice(0, 2000))}
                          onBlur={onNotesCommit}
                          disabled={!notesEnabled}
                          placeholder="Jot down your gameplan, mulligan priorities, key combos..."
                          className="mt-3 min-h-36 w-full rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-3 text-sm text-[var(--color-text-dark)] outline-none transition focus:border-[var(--color-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        {!notesEnabled ? (
                          <p className="mt-2 text-xs text-[var(--color-text-light)]">Sign in to save private deck notes to your account.</p>
                        ) : null}
                      </section>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>

          <div className="pointer-events-none fixed left-[-200vw] top-0 opacity-0">
            <div
              ref={exportRef}
              className="w-[1200px] bg-[linear-gradient(180deg,#162236,#0d1526)] p-10 text-white"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-[180px] overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-2">
                    {leaderEntry?.imageCardId && exportImages[leaderEntry.imageCardId] ? (
                      <img
                        src={exportImages[leaderEntry.imageCardId]}
                        alt={leader?.name || "Leader"}
                        className="aspect-[63/88] w-full rounded-[18px] object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">DevilFruitTCG.gg</p>
                    <h3 className="mt-4 font-['Pirata_One'] text-5xl">{deck.name}</h3>
                    <p className="mt-2 text-lg text-white/80">{leader?.name || "No leader selected"}</p>
                    <div className="mt-6 flex gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/55">Deck Value</p>
                        <p className="mt-1 text-2xl font-black text-[#F0C040]">{deckValueLabel}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.12em] text-white/55">Main Deck</p>
                        <p className="mt-1 text-2xl font-black text-white">{totalCards}/50</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70">
                  Crew Hangar Export
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {mainGroups.map((group) => (
                  <section key={`export-${group.key}`}>
                    <p className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-[#C9A84C]">{group.label} ({group.total})</p>
                    <div className="grid grid-cols-10 gap-3">
                      {group.entries.map((entry) => (
                        <div key={`export-${group.key}-${entry.imageCardId}-${entry.card.id}`} className="space-y-1.5">
                          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                            {exportImages[entry.imageCardId] ? (
                              <img
                                src={exportImages[entry.imageCardId]}
                                alt={entry.card.name}
                                className="aspect-[63/88] w-full object-cover"
                              />
                            ) : null}
                            <div className="absolute left-2 top-2 rounded-full bg-[rgba(12,18,30,0.92)] px-2 py-1 text-[10px] font-black text-white">
                              ×{entry.quantity}
                            </div>
                          </div>
                          <p className="line-clamp-2 text-[10px] font-semibold text-white/80">{entry.card.name}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {sharePreviewUrl ? (
              <div className="fixed inset-0 z-[150]">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[rgba(13,21,38,0.78)]"
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 12 }}
                    className="relative max-h-[92vh] w-full max-w-[960px] overflow-hidden rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] shadow-[0_24px_60px_rgba(19,28,43,0.35)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-parchment-dark)] px-4 py-3 md:px-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Share Preview</p>
                        <h3 className="font-['Pirata_One'] text-2xl text-[var(--color-navy)]">{deck.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSharePreviewUrl(null)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dark)]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-4 md:p-6">
                      <div className="overflow-hidden rounded-2xl border border-[var(--color-parchment-dark)] bg-[#162236]">
                        <img src={sharePreviewUrl} alt={`${deck.name} export preview`} className="w-full object-contain" />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" className={actionButtonClasses()} onClick={handleDownloadImage}>
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button
                          type="button"
                          className={actionButtonClasses()}
                          onClick={() => {
                            void handleCopyImage();
                          }}
                          disabled={!canCopyImage || copyingImage}
                        >
                          {copyingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                          Copy to Clipboard
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

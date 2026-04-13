"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, Download, ExternalLink, ImageIcon, Loader2, PencilLine, X } from "lucide-react";

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

function editButtonClasses() {
  return "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[rgba(212,160,84,0.42)] bg-transparent px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.1)] hover:text-[var(--color-navy)] disabled:opacity-60";
}

function utilityActionClasses() {
  return "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-[rgba(212,160,84,0.24)] bg-[var(--color-navy)] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-gold-light)] transition-colors hover:border-[rgba(212,160,84,0.45)] hover:text-[#f3d89d] disabled:opacity-60";
}

function panelHeadingClasses() {
  return "font-['Pirata_One'] text-[1.5rem] leading-none text-[var(--color-gold-dark)] md:text-[1.75rem]";
}

function sectionShellClasses() {
  return "rounded-[24px] border border-[var(--color-parchment-dark)] bg-[linear-gradient(180deg,rgba(255,250,241,0.95),rgba(245,239,227,0.92))] p-5 shadow-[0_12px_32px_rgba(27,40,56,0.08)]";
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
  if (tone === "favored") return "border-emerald-400/30 bg-[rgba(74,140,92,0.1)] text-emerald-800";
  if (tone === "unfavored") return "border-red-400/30 bg-[rgba(192,57,43,0.1)] text-[#9b3328]";
  return "border-[rgba(212,160,84,0.28)] bg-[rgba(212,160,84,0.1)] text-[var(--color-gold-dark)]";
}

function notesStatusCopy(state: NotesState, error?: string | null) {
  if (state === "loading") return "Loading notes...";
  if (state === "saving") return "Saving...";
  if (state === "saved") return "Saved";
  if (state === "error") return error || "Couldn't save note";
  return "Autosaves when you click away";
}

function notesStatusClasses(state: NotesState) {
  if (state === "saved") return "text-[var(--color-gold-dark)]";
  if (state === "saving" || state === "loading") return "text-[var(--color-text-light)]";
  if (state === "error") return "text-[#9b3328]";
  return "text-[var(--color-text-light)]";
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
    <section className={sectionShellClasses()}>
      <div className="flex items-end justify-between gap-3">
        <h3 className={panelHeadingClasses()}>{title}</h3>
        <span className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Main deck only</span>
      </div>
      <div className="mt-5 rounded-[22px] border border-[rgba(212,160,84,0.16)] bg-[linear-gradient(180deg,rgba(255,250,241,0.96),rgba(241,233,218,0.92))] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <div className="flex items-end gap-2.5">
          {buckets.map((bucket) => (
            <div key={`${title}-${bucket.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end rounded-full border border-[rgba(184,134,60,0.1)] bg-[rgba(184,134,60,0.08)] px-1 py-1">
                <div
                  className="w-full rounded-full bg-[linear-gradient(180deg,var(--color-gold),var(--color-gold-dark))] shadow-[0_8px_14px_rgba(212,160,84,0.12)] transition-all"
                  style={{ height: `${bucket.count === 0 ? 8 : Math.max((bucket.count / max) * 100, 12)}%` }}
                />
              </div>
              <div className="text-center">
                <p className="font-sans text-[11px] font-black text-[var(--color-navy)]">{bucket.count}</p>
                <p className="font-sans text-[10px] text-[var(--color-text-light)]">{bucket.label}</p>
              </div>
            </div>
          ))}
        </div>
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
  const [imageCopied, setImageCopied] = useState(false);
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
    setImageCopied(false);
  }, [deck?.id]);

  useEffect(() => {
    if (!imageCopied) return;
    const timeout = window.setTimeout(() => setImageCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [imageCopied]);

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
      setImageCopied(true);
      setNotice({ tone: "success", message: "Image copied to clipboard." });
    } catch {
      setImageCopied(false);
      setNotice({ tone: "error", message: "Couldn't copy the image." });
    } finally {
      setCopyingImage(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && deck ? (
          <div className="fixed inset-0 z-[140]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[rgba(13,21,38,0.76)] backdrop-blur-[3px]"
            />

            <div className="absolute inset-0 overflow-y-auto" data-deck-modal-scroll>
              <div className="flex min-h-full items-end justify-center p-0 md:items-center md:p-4">
                <motion.section
                  initial={{ opacity: 0, scale: 0.985, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.985, y: 20 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  className="relative flex h-screen w-full flex-col overflow-hidden border border-[rgba(212,160,84,0.22)] bg-[radial-gradient(circle_at_top_left,rgba(212,160,84,0.12),transparent_22%),linear-gradient(180deg,rgba(245,239,227,0.99),rgba(250,247,242,0.98))] shadow-[0_24px_60px_rgba(19,28,43,0.35)] md:h-auto md:max-h-[92vh] md:w-[90vw] md:max-w-[1200px] md:rounded-[30px]"
                  aria-modal="true"
                  role="dialog"
                  aria-label={deck.name}
                  data-deck-view-panel
                >
                  <div className="sticky top-0 z-10 bg-[rgba(250,247,242,0.94)] px-4 pb-4 pt-4 backdrop-blur md:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-light)]">Crew Hangar</p>
                        <h2 className="truncate font-['Pirata_One'] text-[1.9rem] leading-none text-[var(--color-navy)] md:text-[2.4rem]">
                          {deck.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.18)] bg-[rgba(27,40,56,0.04)] p-1.5">
                          <Link href={`/deckbuilder?id=${encodeURIComponent(deck.id)}`} className={editButtonClasses()}>
                            <PencilLine className="h-4 w-4" />
                            <span className="hidden md:inline">Edit Deck</span>
                          </Link>
                          <button
                            type="button"
                            className={`${utilityActionClasses()} w-10 px-0 md:w-auto md:px-3`}
                            onClick={() => {
                              void handleShareAsImage();
                            }}
                            disabled={shareLoading}
                          >
                            {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                            <span className="hidden md:inline">Share as Image</span>
                          </button>
                          <button
                            type="button"
                            className={`${utilityActionClasses()} w-10 px-0 md:w-auto md:px-3`}
                            onClick={() => {
                              void handleCopySim();
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            <span className="hidden md:inline">Export to Sim</span>
                          </button>
                        </div>

                        <div className="hidden h-8 w-px bg-[rgba(212,160,84,0.24)] md:block" />

                        <button
                          type="button"
                          onClick={onClose}
                          aria-label="Close deck view"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,160,84,0.18)] bg-[rgba(255,250,241,0.92)] text-[var(--color-text-mid)] transition-colors hover:border-[rgba(212,160,84,0.4)] hover:text-[var(--color-gold-dark)]"
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

                    <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(212,160,84,0),rgba(212,160,84,0.72),rgba(212,160,84,0))]" />
                  </div>

                  <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(320px,0.34fr)_minmax(0,0.66fr)]">
                    <aside
                      className="overflow-y-auto border-b border-[rgba(212,160,84,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(212,160,84,0.1),transparent_28%),rgba(252,249,243,0.94)] p-4 md:border-b-0 md:border-r md:p-6"
                      data-deck-modal-scroll
                    >
                      <div className="mx-auto max-w-[320px] space-y-6 text-center md:mx-0 md:max-w-none md:text-left">
                        <section className="rounded-[30px] border border-[rgba(212,160,84,0.22)] bg-[radial-gradient(circle_at_top_left,rgba(212,160,84,0.12),transparent_32%),linear-gradient(180deg,rgba(255,250,241,0.96),rgba(246,239,228,0.9))] p-5 shadow-[0_18px_42px_rgba(27,40,56,0.08)]">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-light)]">Captain&apos;s Manifest</p>
                            <h3 className="font-['Pirata_One'] text-[2.15rem] leading-[0.94] text-[var(--color-navy)] md:text-[2.35rem]">
                              {deck.name}
                            </h3>
                            <p className="font-['Crimson_Pro'] text-[1.02rem] italic text-[var(--color-text-mid)]">
                              Led by {leader?.name || "your leader"}
                            </p>
                          </div>

                          <div className="mt-5 space-y-3">
                            <div className="mx-auto w-[196px] overflow-hidden rounded-[28px] border border-[rgba(212,160,84,0.3)] bg-[radial-gradient(circle_at_top_left,rgba(212,160,84,0.14),transparent_30%),var(--color-cream)] p-2 shadow-[0_18px_36px_rgba(27,40,56,0.12)] md:mx-0 md:w-[236px]">
                              <img
                                src={proxyCardImageUrl(leaderEntry?.imageCardId || leader?.id || deck.leaderId || "")}
                                alt={leader?.name || "Leader"}
                                className="aspect-[63/88] w-full rotate-[1deg] rounded-[20px] border border-[rgba(212,160,84,0.18)] bg-[#f3eadc] object-cover shadow-[0_14px_34px_rgba(0,0,0,0.14)]"
                              />
                            </div>
                            <div>
                              <p className="text-lg font-black text-[var(--color-navy)]">{leader?.name || "No leader selected"}</p>
                              <p className="mt-1 text-sm italic text-[var(--color-text-light)]">
                                {mainGroups.reduce((sum, group) => sum + group.entries.length, 0)} unique cards in this build
                              </p>
                            </div>
                          </div>
                        </section>

                        <div className="space-y-3 border-t border-[rgba(212,160,84,0.2)] pt-4">
                          <div className="flex items-end justify-between gap-4 border-b border-[var(--color-parchment-dark)]/70 pb-3">
                            <div>
                              <p className="font-sans text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-light)]">Deck Value</p>
                              <p className="mt-1 text-xs text-[var(--color-text-light)]">Live JustTCG pricing</p>
                            </div>
                            <p className="text-2xl font-black text-[var(--color-gold-dark)]">{deckValueLabel}</p>
                          </div>
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <p className="font-sans text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-light)]">Main Deck</p>
                              <p className="mt-1 text-xs text-[var(--color-text-light)]">Leader counted separately</p>
                            </div>
                            <p className="text-2xl font-black text-[var(--color-gold-dark)]">{totalCards} / 50</p>
                          </div>
                        </div>

                        <section className={sectionShellClasses()}>
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="font-sans text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-light)]">Collection Coverage</p>
                              {hasCollectionData && collectionCoverage ? (
                                <p className="mt-2 text-lg font-black text-[var(--color-navy)]">
                                  You own <span className="text-[var(--color-gold-dark)]">{collectionCoverage.ownedCopies}/{collectionCoverage.totalCopies}</span> cards
                                </p>
                              ) : (
                                <p className="mt-2 text-sm italic text-[var(--color-text-light)]">Track your collection to see deck coverage.</p>
                              )}
                            </div>
                          </div>

                          {hasCollectionData && collectionCoverage ? (
                            <>
                              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(27,40,56,0.18)]">
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
                                <details className="group mt-4 rounded-[20px] border border-[rgba(209,91,58,0.18)] bg-[rgba(209,91,58,0.05)] p-3 [&_summary::-webkit-details-marker]:hidden">
                                  <summary className="flex list-none cursor-pointer items-center justify-between gap-3">
                                    <div>
                                      <p className="font-sans text-[11px] font-black uppercase tracking-[0.18em] text-[#b8863c]">Missing Cards</p>
                                      <p className="mt-1 text-xs text-[var(--color-text-light)]">{collectionCoverage.missingCards.length} actionable gaps in this list</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-full border border-[rgba(209,91,58,0.18)] bg-[rgba(209,91,58,0.1)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#9b3328]">
                                        Review
                                      </span>
                                      <ChevronDown className="h-4 w-4 text-[#b8863c] transition-transform group-open:rotate-180" />
                                    </div>
                                  </summary>
                                  <div className="mt-3 space-y-2 text-left">
                                    {collectionCoverage.missingCards.map((item) => (
                                      <div
                                        key={`${deck.id}-${item.cardId}`}
                                        className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[rgba(255,250,241,0.88)] px-3 py-2.5 text-xs text-[var(--color-text-dark)]"
                                      >
                                        <p className="font-bold text-[var(--color-navy)]">{item.cardName}</p>
                                        <p className="mt-1 text-[var(--color-text-light)]">Need {item.quantity}, own {item.owned}</p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : (
                                <p className="mt-3 text-sm italic text-emerald-700">You already own this full list.</p>
                              )}
                            </>
                          ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-parchment-dark)] bg-[rgba(255,250,241,0.72)] px-4 py-3 text-sm text-[var(--color-text-light)]">
                              Track your collection to see deck coverage.
                              <div className="mt-3">
                                <Link href="/collection" className="inline-flex items-center gap-1 font-sans text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-gold-dark)]">
                                  Open Collection
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          )}
                        </section>

                        <Link
                          href={`/deckbuilder?id=${encodeURIComponent(deck.id)}`}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(212,160,84,0.45)] bg-transparent px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.08)] hover:text-[var(--color-navy)]"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit Deck in Deck Lab
                        </Link>
                      </div>
                    </aside>

                    <div
                      className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,252,247,0.9),rgba(248,243,234,0.72))] p-4 md:p-6"
                      data-deck-modal-scroll
                    >
                      <div className="rounded-[30px] border border-[rgba(212,160,84,0.14)] bg-[rgba(255,250,241,0.56)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:p-6">
                        <div className="space-y-10">
                        {mainGroups.map((group, groupIndex) => {
                          return (
                            <section
                              key={group.key}
                              className={`space-y-4 ${groupIndex === 0 ? "" : "border-t border-[rgba(212,160,84,0.18)] pt-8"}`}
                            >
                              <div className="flex items-end justify-between gap-3 border-b border-[rgba(212,160,84,0.18)] pb-3">
                                <h3 className={panelHeadingClasses()}>{group.label}</h3>
                                <span className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                                  {group.total} cards
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                                      className="overflow-hidden rounded-[22px] border border-[var(--color-parchment-dark)] bg-[rgba(255,250,241,0.92)] p-2 text-left shadow-[0_14px_30px_rgba(27,40,56,0.08)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(27,40,56,0.12)]"
                                    >
                                      <div className="relative overflow-hidden rounded-[18px] border border-[rgba(212,160,84,0.12)] shadow-[0_10px_26px_rgba(0,0,0,0.12)]">
                                        <img
                                          src={proxyCardImageUrl(entry.imageCardId)}
                                          alt={entry.card.name}
                                          className="aspect-[63/88] w-full object-cover"
                                        />
                                        <div className="absolute left-2.5 top-2.5 rounded-full border border-[rgba(212,160,84,0.16)] bg-[rgba(27,40,56,0.9)] px-2.5 py-1 text-[10px] font-black text-[var(--color-gold-light)] shadow-[0_6px_14px_rgba(0,0,0,0.16)]">
                                          ×{entry.quantity}
                                        </div>
                                      </div>
                                      <div className="space-y-2 px-1 pb-1 pt-3">
                                        <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[var(--color-text-dark)]">{entry.card.name}</p>
                                        <div className="space-y-1 border-t border-[rgba(212,160,84,0.16)] pt-2">
                                          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-light)]">
                                            {entry.quantity} × {unitPrice}
                                          </p>
                                          <p className="text-sm font-black text-[var(--color-gold-dark)]">{subtotal}</p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })}

                        {analytics ? (
                          <section className="grid gap-5 border-t border-[rgba(212,160,84,0.18)] pt-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                            <CurveChart title="Cost Curve" buckets={analytics.costCurve} />
                            <section className={sectionShellClasses()}>
                              <div className="flex items-end justify-between gap-3">
                                <h3 className={panelHeadingClasses()}>Counter Breakdown</h3>
                                <span className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                                  Defensive profile
                                </span>
                              </div>
                              <div className="mt-5 flex flex-wrap gap-2.5">
                                {[
                                  {
                                    label: "+2000",
                                    count: analytics.counterBreakdown.plus2000,
                                    tone: "border-emerald-400/30 bg-[rgba(74,140,92,0.12)] text-emerald-800",
                                  },
                                  {
                                    label: "+1000",
                                    count: analytics.counterBreakdown.plus1000,
                                    tone: "border-[rgba(212,160,84,0.28)] bg-[rgba(212,160,84,0.14)] text-[var(--color-gold-dark)]",
                                  },
                                  {
                                    label: "0 Counter",
                                    count: analytics.counterBreakdown.zero,
                                    tone: "border-[rgba(192,57,43,0.18)] bg-[rgba(192,57,43,0.08)] text-[#9b3328]",
                                  },
                                ].map((bucket) => (
                                  <div
                                    key={bucket.label}
                                    className={`inline-flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-full border px-4 py-3 ${bucket.tone}`}
                                  >
                                    <span className="font-sans text-[11px] font-black uppercase tracking-[0.12em]">{bucket.label}</span>
                                    <span className="text-lg font-black">{bucket.count}</span>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </section>
                        ) : null}

                        <section className={`${sectionShellClasses()} border-t border-[rgba(212,160,84,0.18)]`}>
                          <div className="flex items-end justify-between gap-3">
                            <h3 className={panelHeadingClasses()}>Your Matchups</h3>
                            <span className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                              Top meta leaders
                            </span>
                          </div>
                          {matchupRows.length ? (
                            <div className="mt-5 space-y-2.5">
                              {matchupRows.map((row) => (
                                <div
                                  key={`${deck.id}-${row.opponentId}`}
                                  className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border px-3.5 py-3 ${toneClasses(row.tone)}`}
                                >
                                  <img
                                    src={proxyCardImageUrl(row.opponentCardId)}
                                    alt={row.opponentName}
                                    className="h-11 w-11 rounded-xl border border-white/25 object-cover shadow-[0_8px_18px_rgba(0,0,0,0.1)]"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-[var(--color-text-dark)]">{row.opponentName}</p>
                                    <p className="font-sans text-[11px] text-[var(--color-text-light)]">{row.opponentColor} · {row.metaShare.toFixed(1)}% meta share</p>
                                  </div>
                                  <div className={`rounded-full border px-3 py-1 text-xs font-black ${toneClasses(row.tone)}`}>
                                    {row.winRate.toFixed(0)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-4 text-sm italic text-[var(--color-text-light)]">
                              No matchup data for this leader yet — check back as the meta evolves!
                            </p>
                          )}
                        </section>

                        <section className={sectionShellClasses()}>
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <h3 className={panelHeadingClasses()}>Captain&apos;s Log</h3>
                              <p className="mt-2 text-sm italic text-[var(--color-text-light)]">
                                Jot down your gameplan, mulligan priorities, key combos...
                              </p>
                            </div>
                          </div>

                          <div className="relative mt-5">
                            <textarea
                              value={notes}
                              onChange={(event) => onNotesChange(event.target.value.slice(0, 2000))}
                              onBlur={onNotesCommit}
                              disabled={!notesEnabled}
                              placeholder="Jot down your gameplan, mulligan priorities, key combos..."
                              className="min-h-40 w-full rounded-[22px] border border-[rgba(212,160,84,0.24)] bg-[linear-gradient(180deg,rgba(248,241,230,0.98),rgba(242,233,219,0.98))] px-4 py-3 pb-10 font-['Crimson_Pro'] text-[15px] leading-7 text-[var(--color-text-dark)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition placeholder:italic placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] disabled:cursor-not-allowed disabled:opacity-70"
                            />
                            <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-[var(--color-text-light)]">
                              {notes.length}/2000
                            </div>
                            <div className={`pointer-events-none absolute bottom-3 right-4 text-[11px] font-semibold ${notesStatusClasses(notesState)}`}>
                              {notesStatusCopy(notesState, notesError)}
                            </div>
                          </div>

                          {!notesEnabled ? (
                            <p className="mt-3 text-sm italic text-[var(--color-text-light)]">
                              Sign in to keep a Captain&apos;s Log for each deck.
                            </p>
                          ) : null}
                        </section>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              </div>
            </div>

            <div className="pointer-events-none fixed left-[-200vw] top-0 opacity-0">
              <div
                ref={exportRef}
                className="w-[1200px] overflow-hidden rounded-[34px] border border-[rgba(184,134,60,0.28)] bg-[radial-gradient(circle_at_top_left,rgba(212,160,84,0.16),transparent_26%),linear-gradient(180deg,#fcfaf5_0%,#f5efe3_52%,#ede2cf_100%)] p-10 text-[var(--color-text-dark)] shadow-[0_24px_60px_rgba(27,40,56,0.18)]"
              >
                <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-8 border-b border-[rgba(184,134,60,0.18)] pb-8">
                  <div className="overflow-hidden rounded-[30px] border border-[rgba(184,134,60,0.3)] bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(245,239,227,0.96))] p-2.5 shadow-[0_18px_36px_rgba(27,40,56,0.14)]">
                    {leaderEntry?.imageCardId && exportImages[leaderEntry.imageCardId] ? (
                      <img
                        src={exportImages[leaderEntry.imageCardId]}
                        alt={leader?.name || "Leader"}
                        className="aspect-[63/88] w-full rounded-[24px] object-cover shadow-[0_18px_30px_rgba(27,40,56,0.16)]"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-h-full flex-col justify-between">
                    <div>
                      <p className="font-sans text-xs font-black uppercase tracking-[0.24em] text-[var(--color-gold-dark)]">DevilFruitTCG.gg Deck Manifest</p>
                      <h3 className="mt-4 font-['Pirata_One'] text-[3.55rem] leading-[0.9] text-[var(--color-navy)]">{deck.name}</h3>
                      <p className="mt-3 font-['Crimson_Pro'] text-[1.35rem] italic text-[var(--color-text-mid)]">
                        {leader?.name || "No leader selected"}
                      </p>
                    </div>

                    <div className="mt-8 grid max-w-[480px] grid-cols-2 gap-3">
                      <div className="rounded-[22px] border border-[rgba(184,134,60,0.18)] bg-[rgba(255,250,241,0.86)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                        <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Deck Value</p>
                        <p className="mt-2 text-[2rem] font-black text-[var(--color-gold-dark)]">{deckValueLabel}</p>
                      </div>
                      <div className="rounded-[22px] border border-[rgba(184,134,60,0.18)] bg-[rgba(255,250,241,0.86)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                        <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Main Deck</p>
                        <p className="mt-2 text-[2rem] font-black text-[var(--color-navy)]">{totalCards}/50</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-7">
                  {mainGroups.map((group) => (
                    <section key={`export-${group.key}`} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[rgba(184,134,60,0.16)] pb-2">
                        <p className="font-['Pirata_One'] text-[1.65rem] text-[var(--color-gold-dark)]">{group.label}</p>
                        <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">{group.total} cards</p>
                      </div>
                      <div className="grid grid-cols-8 gap-4">
                        {group.entries.map((entry) => (
                          <div key={`export-${group.key}-${entry.imageCardId}-${entry.card.id}`} className="space-y-2">
                            <div className="relative overflow-hidden rounded-[20px] border border-[rgba(184,134,60,0.16)] bg-[rgba(255,250,241,0.82)] shadow-[0_10px_24px_rgba(27,40,56,0.12)]">
                              {exportImages[entry.imageCardId] ? (
                                <img
                                  src={exportImages[entry.imageCardId]}
                                  alt={entry.card.name}
                                  className="aspect-[63/88] w-full object-cover"
                                />
                              ) : null}
                              <div className="absolute left-2.5 top-2.5 rounded-full border border-[rgba(184,134,60,0.14)] bg-[rgba(27,40,56,0.94)] px-2.5 py-1 text-[10px] font-black text-[var(--color-gold)]">
                                ×{entry.quantity}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between rounded-[24px] border border-[rgba(184,134,60,0.22)] bg-[linear-gradient(180deg,rgba(255,250,241,0.96),rgba(245,239,227,0.94))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Deck Value</p>
                      <p className="mt-1 text-lg font-black text-[var(--color-gold-dark)]">{deckValueLabel}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Cards</p>
                      <p className="mt-1 text-lg font-black text-[var(--color-navy)]">{totalCards}/50 + Leader</p>
                    </div>
                  </div>
                  <p className="font-['Pirata_One'] text-[1.55rem] tracking-[0.02em] text-[rgba(184,134,60,0.92)]">
                    DevilFruitTCG.gg
                  </p>
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
                      className="relative max-h-[92vh] w-full max-w-[960px] overflow-hidden rounded-[28px] border border-[rgba(212,160,84,0.22)] bg-[var(--color-parchment)] shadow-[0_24px_60px_rgba(19,28,43,0.35)]"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-parchment-dark)] px-4 py-3 md:px-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Share Preview</p>
                          <h3 className="font-['Pirata_One'] text-2xl text-[var(--color-navy)]">{deck.name}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSharePreviewUrl(null)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,160,84,0.18)] bg-[rgba(255,250,241,0.92)] text-[var(--color-text-mid)] transition-colors hover:border-[rgba(212,160,84,0.4)] hover:text-[var(--color-gold-dark)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-4 md:p-6" data-deck-modal-scroll>
                        <div className="overflow-hidden rounded-[24px] border border-[var(--color-parchment-dark)] bg-[rgba(255,250,241,0.9)] shadow-[0_18px_40px_rgba(27,40,56,0.12)]">
                          <div className="overflow-hidden border-b border-[var(--color-parchment-dark)] bg-[linear-gradient(180deg,rgba(255,250,241,0.96),rgba(245,239,227,0.92))]">
                            <img src={sharePreviewUrl} alt={`${deck.name} export preview`} className="w-full object-contain" />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(180deg,rgba(255,250,241,0.95),rgba(245,239,227,0.92))] px-4 py-4 md:px-5">
                            <div>
                              <p className="font-sans text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-light)]">Ready to share</p>
                              <p className="mt-1 text-sm text-[var(--color-text-mid)]">Download it or copy it straight to your clipboard.</p>
                              <p className="mt-2 font-['Pirata_One'] text-[1.15rem] text-[rgba(184,134,60,0.92)]">DevilFruitTCG.gg</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
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
                                {copyingImage ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : imageCopied ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                                {imageCopied ? "Copied!" : "Copy to Clipboard"}
                              </button>
                            </div>
                          </div>
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

      <style jsx global>{`
        [data-deck-modal-scroll] {
          scrollbar-width: thin;
          scrollbar-color: rgba(184, 134, 60, 0.82) rgba(27, 40, 56, 0.16);
        }

        [data-deck-modal-scroll]::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        [data-deck-modal-scroll]::-webkit-scrollbar-track {
          background: rgba(27, 40, 56, 0.12);
          border-radius: 999px;
        }

        [data-deck-modal-scroll]::-webkit-scrollbar-thumb {
          background: rgba(184, 134, 60, 0.82);
          border-radius: 999px;
          border: 2px solid rgba(27, 40, 56, 0.1);
        }

        [data-deck-modal-scroll]::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 160, 84, 0.94);
        }
      `}</style>
    </>
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  DurdleLeader,
  DurdleAffiliation,
  DurdleColor,
  DurdleStatus,
} from "@/lib/data/formats/durdles-leaders";
import { DURDLE_AFFILIATIONS, DURDLE_COLORS, DURDLE_LEADERS } from "@/lib/data/formats/durdles-leaders";

// ── Color display helpers ───────────────────────────────────────────────────

const COLOR_LABELS: Record<DurdleColor, string> = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  purple: "Purple",
  yellow: "Yellow",
  black: "Black",
};

const COLOR_DOTS: Record<DurdleColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  yellow: "bg-yellow-400",
  black: "bg-gray-400",
};

// ── Sub-components ──────────────────────────────────────────────────────────

function WantedBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`
        inline-flex items-center justify-center font-bold tracking-widest uppercase
        bg-[var(--color-gold)] text-[var(--color-navy)] rounded
        ${small ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2 py-1"}
      `}
      style={{ fontFamily: "var(--font-pirata)", letterSpacing: "0.15em" }}
    >
      Wanted
    </span>
  );
}

function LeaderCard({
  leader,
  onClick,
  large = false,
}: {
  leader: DurdleLeader;
  onClick: (leader: DurdleLeader) => void;
  large?: boolean;
}) {
  const isWanted = leader.status === "wanted";
  return (
    <button
      onClick={() => onClick(leader)}
      className="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
    >
      <div
        className={`
          relative rounded-xl overflow-hidden transition-transform duration-200
          group-hover:-translate-y-1 group-hover:shadow-lg
          ${isWanted
            ? "ring-2 ring-[var(--color-gold)] shadow-[0_0_12px_rgba(212,160,84,0.35)]"
            : "ring-1 ring-[rgba(212,160,84,0.2)]"
          }
        `}
      >
        {/* Card image */}
        <div
          className={`relative w-full bg-[var(--color-navy)] ${
            large ? "aspect-[2/3]" : "aspect-[2/3]"
          }`}
        >
          <Image
            src={leader.imagePath}
            alt={leader.name}
            fill
            className="object-cover"
            sizes={
              large
                ? "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            }
          />

          {/* Wanted badge overlay */}
          {isWanted && (
            <div className="absolute top-2 left-2">
              <WantedBadge small={!large} />
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="px-3 py-2 bg-[var(--color-parchment)]">
          <p
            className="text-xs font-semibold truncate text-[var(--color-navy)]"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            {leader.name}
          </p>
          <p
            className="text-[10px] text-[var(--color-text-light)] truncate"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            {leader.cardNumber}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
  gold,
  sunset,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  gold?: boolean;
  sunset?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        rounded-full border px-3 py-1 text-xs font-medium transition-all
        ${
          active
            ? gold
              ? "border-[var(--color-gold)] bg-[rgba(212,160,84,0.18)] text-[var(--color-gold)]"
              : sunset
              ? "border-[var(--color-sunset)] bg-[rgba(209,91,58,0.18)] text-[var(--color-sunset)]"
              : "border-[var(--color-gold)] bg-[rgba(212,160,84,0.18)] text-[var(--color-gold)]"
            : "border-[rgba(212,160,84,0.25)] text-[var(--color-text-mid)] hover:border-[rgba(212,160,84,0.5)] hover:text-[var(--color-navy)]"
        }
      `}
      style={{ fontFamily: "var(--font-dm)" }}
    >
      {label}
    </button>
  );
}

// ── Lightbox modal ──────────────────────────────────────────────────────────

function LightboxModal({
  leader,
  onClose,
}: {
  leader: DurdleLeader | null;
  onClose: () => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (leader) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [leader]);

  return (
    <AnimatePresence>
      {leader && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex flex-col items-center gap-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 z-20 w-9 h-9 rounded-full bg-[var(--color-navy)] border border-[rgba(212,160,84,0.4)] flex items-center justify-center text-[var(--color-parchment-dark)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Card image */}
            <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden ring-2 ring-[rgba(212,160,84,0.5)] shadow-2xl">
              <Image
                src={leader.imagePath}
                alt={leader.name}
                fill
                className="object-cover"
                sizes="400px"
                priority
              />
            </div>

            {/* Info strip */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span
                className="text-xl text-white"
                style={{ fontFamily: "var(--font-pirata)" }}
              >
                {leader.name}
              </span>
              <span
                className="text-xs text-[var(--color-parchment-dark)]"
                style={{ fontFamily: "var(--font-dm)" }}
              >
                {leader.cardNumber}
              </span>
              {leader.status === "wanted" && <WantedBadge />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main gallery component ──────────────────────────────────────────────────

interface Props {
  leaders: DurdleLeader[];
  wantedLeaders: DurdleLeader[];
}

export default function DurdlesGallery({ leaders, wantedLeaders }: Props) {
  const [selectedLeader, setSelectedLeader] = useState<DurdleLeader | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DurdleStatus | null>(null);
  const [affiliationFilters, setAffiliationFilters] = useState<Set<DurdleAffiliation>>(
    new Set()
  );
  const [colorFilters, setColorFilters] = useState<Set<DurdleColor>>(new Set());

  const hasActiveFilters =
    statusFilter !== null || affiliationFilters.size > 0 || colorFilters.size > 0;

  function toggleAffiliation(a: DurdleAffiliation) {
    setAffiliationFilters((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });
  }

  function toggleColor(c: DurdleColor) {
    setColorFilters((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  function clearAll() {
    setStatusFilter(null);
    setAffiliationFilters(new Set());
    setColorFilters(new Set());
  }

  const filtered = leaders.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (affiliationFilters.size > 0 && !l.affiliations.some((a) => affiliationFilters.has(a)))
      return false;
    if (colorFilters.size > 0 && !l.colors.some((c) => colorFilters.has(c))) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24">
      {/* ── D. Currently Wanted ──────────────────────────────────── */}
      <section className="py-14">
        <div className="text-center mb-8">
          <h2 className="text-4xl text-[var(--color-navy)] mb-1">Currently Wanted</h2>
          <p
            className="text-sm text-[var(--color-text-mid)]"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            The active tournament pool
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {wantedLeaders.map((leader) => (
            <LeaderCard
              key={leader.slug}
              leader={leader}
              onClick={setSelectedLeader}
              large
            />
          ))}
        </div>
      </section>

      <div className="manga-divider mb-2" />

      {/* ── E. All Durdle Leaders ────────────────────────────────── */}
      <section className="py-14">
        <div className="text-center mb-8">
          <h2 className="text-4xl text-[var(--color-navy)] mb-1">
            All Durdle Leaders ({DURDLE_LEADERS.length})
          </h2>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-[rgba(212,160,84,0.25)] bg-[var(--color-parchment)] p-4 mb-8 space-y-3">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold text-[var(--color-text-light)] uppercase tracking-wider mr-1 shrink-0"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              Status
            </span>
            <FilterChip
              label="Wanted"
              active={statusFilter === "wanted"}
              onClick={() => setStatusFilter(statusFilter === "wanted" ? null : "wanted")}
              gold
            />
            <FilterChip
              label="Rogue"
              active={statusFilter === "rogue"}
              onClick={() => setStatusFilter(statusFilter === "rogue" ? null : "rogue")}
              sunset
            />
          </div>

          {/* Affiliation */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold text-[var(--color-text-light)] uppercase tracking-wider mr-1 shrink-0"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              Crew
            </span>
            {DURDLE_AFFILIATIONS.map((a) => (
              <FilterChip
                key={a}
                label={a}
                active={affiliationFilters.has(a)}
                onClick={() => toggleAffiliation(a)}
              />
            ))}
          </div>

          {/* Color */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold text-[var(--color-text-light)] uppercase tracking-wider mr-1 shrink-0"
              style={{ fontFamily: "var(--font-dm)" }}
            >
              Color
            </span>
            {DURDLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => toggleColor(c)}
                className={`
                  flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all
                  ${
                    colorFilters.has(c)
                      ? "border-[var(--color-gold)] bg-[rgba(212,160,84,0.18)] text-[var(--color-gold)]"
                      : "border-[rgba(212,160,84,0.25)] text-[var(--color-text-mid)] hover:border-[rgba(212,160,84,0.5)] hover:text-[var(--color-navy)]"
                  }
                `}
                style={{ fontFamily: "var(--font-dm)" }}
              >
                <span className={`w-2 h-2 rounded-full ${COLOR_DOTS[c]}`} />
                {COLOR_LABELS[c]}
              </button>
            ))}
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <div className="pt-1">
              <button
                onClick={clearAll}
                className="text-xs text-[var(--color-sunset)] hover:underline"
                style={{ fontFamily: "var(--font-dm)" }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <p
            className="text-sm text-[var(--color-text-light)] mb-4"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            Showing {filtered.length} of {DURDLE_LEADERS.length} leaders
          </p>
        )}

        {/* Gallery grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((leader) => (
              <LeaderCard
                key={leader.slug}
                leader={leader}
                onClick={setSelectedLeader}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--color-text-light)]" style={{ fontFamily: "var(--font-dm)" }}>
            No leaders match the current filters.
          </div>
        )}
      </section>

      {/* Lightbox modal */}
      <LightboxModal leader={selectedLeader} onClose={() => setSelectedLeader(null)} />
    </div>
  );
}

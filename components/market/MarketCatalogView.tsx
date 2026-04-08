"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  Loader2,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { displayCardId, displayRarity, routeCardId, type Card } from "@/lib/cards";
import {
  formatMarketSetLabel,
  marketCardImageUrl,
  marketEmptyStateCopy,
  marketPriceDisplay,
  marketVariantDisplayLabel,
} from "@/lib/market-display";
import {
  clearPendingMarketRestore,
  readPendingMarketRestore,
  writeLastMarketState,
} from "@/lib/market-navigation";
import {
  applyMarketStateToParams,
  buildMarketCatalogApiQuery,
  defaultMarketSortForQuery,
  DEFAULT_MARKET_PAGE_SIZE,
  MARKET_PAGE_SIZE_OPTIONS,
  parseMarketUrlState,
  type MarketUrlState,
  type ViewMode,
} from "@/lib/market-query";
import {
  getDesktopMarketSidebarClassName,
  getDesktopMarketSidebarBodyClassName,
  getDesktopMarketOpenSections,
  getDesktopMarketSidebarUtilityClassName,
  getInitialMarketOpenSections,
  type MarketFilterSectionState,
  type MarketSectionKey,
} from "@/lib/market-filters";
import {
  buildMarketSetFilterGroups,
  searchMarketSetOptions,
  type MarketSetGroup,
  type MarketSetGroupKey,
} from "@/lib/market-set-groups";
import type { MarketCardResult, MarketCatalogResponse, MarketFacetOption, MarketSort } from "@/lib/market-types";
const SORT_OPTIONS: Array<{ value: MarketSort; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
  { value: "number_asc", label: "Card Number" },
  { value: "newest", label: "Newest / Set Release Date" },
];

const RARITY_LABELS: Record<string, string> = {
  C: "Common (C)",
  UC: "Uncommon (UC)",
  R: "Rare (R)",
  SR: "Super Rare (SR)",
  SEC: "Secret Rare (SEC)",
  L: "Leader (L)",
  P: "Promo (P)",
  TR: "Treasure Rare (TR)",
  "SP CARD": "SP",
};

function toggleListValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : null;
}

function formatUpdatedDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

function cardSetLabel(card: Card) {
  return formatMarketSetLabel(card.set);
}

function compactCardSetLabel(card: Card) {
  return formatMarketSetLabel(card.set, { compact: true });
}

function buildCardHref(cardRouteId: string, marketPath: string) {
  return `/cards/${cardRouteId}?market=${encodeURIComponent(marketPath)}`;
}

function marketVariantLabel(card: Card) {
  return marketVariantDisplayLabel(card);
}

function countActiveFilters(state: MarketUrlState) {
  let total = 0;
  total += state.sets.length;
  total += state.types.length;
  total += state.colors.length;
  total += state.rarities.length;
  total += state.counters.length;
  total += state.attributes.length;
  if (state.costMin || state.costMax) total += 1;
  if (state.lifeMin || state.lifeMax) total += 1;
  if (state.powerMin || state.powerMax) total += 1;
  if (state.priceMin || state.priceMax) total += 1;
  return total;
}

function CardPriceBlock({ card }: { card: MarketCardResult }) {
  const priceState = marketPriceDisplay(card.market);
  const updatedLabel = formatUpdatedDate(card.market?.updatedAt);
  const isMuted = priceState.tone === "muted";

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${isMuted ? "border-[var(--color-parchment-dark)]/60 bg-[var(--color-parchment)]" : "border-[var(--color-parchment-dark)] bg-[var(--color-cream)]"}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-light)]">{priceState.sublabel}</p>
      <p className={`mt-1 text-sm font-black ${isMuted ? "text-[var(--color-text-mid)]" : "text-[#F0C040]"}`}>{priceState.label}</p>
      {updatedLabel && !isMuted ? <p className="mt-1 text-[11px] text-[var(--color-text-light)]">Updated {updatedLabel}</p> : null}
    </div>
  );
}

function MarketCardTile({ card, marketPath }: { card: MarketCardResult; marketPath: string }) {
  const variantLabel = marketVariantLabel(card);

  return (
    <Link
      href={buildCardHref(routeCardId(card), marketPath)}
      className="group flex h-full flex-col rounded-[28px] border border-[var(--color-parchment-dark)] bg-[radial-gradient(circle_at_top,rgba(212,160,84,0.08),transparent_42%),var(--color-parchment)] p-3 transition-all hover:-translate-y-1 hover:border-[#F0C040]/35 hover:bg-[var(--color-cream)]"
    >
      <div className="overflow-hidden rounded-[22px] border border-[var(--color-parchment-dark)] bg-[var(--color-cream)]">
        <img
          src={marketCardImageUrl(card)}
          alt={card.name}
          className="aspect-[5/7] w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 flex flex-1 flex-col space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-black text-[var(--color-navy)]">{card.name}</p>
            <p className="mt-1 text-[11px] text-[var(--color-text-light)]">{displayCardId(card)}</p>
            {variantLabel ? (
              <p className="mt-1 inline-flex rounded-full border border-[#F0C040]/20 bg-[#F0C040]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0C040]">
                {variantLabel}
              </p>
            ) : null}
          </div>
          <span className="rounded-full border border-[#F0C040]/20 bg-[#F0C040]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0C040]">
            {displayRarity(card.rarity)}
          </span>
        </div>

        <div className="text-[11px] text-[var(--color-text-light)]">
          <p className="line-clamp-2">{compactCardSetLabel(card)}</p>
        </div>

        <div className="mt-auto pt-1">
          <CardPriceBlock card={card} />
        </div>
      </div>
    </Link>
  );
}

function MarketCardRow({ card, marketPath }: { card: MarketCardResult; marketPath: string }) {
  const variantLabel = marketVariantLabel(card);

  return (
    <Link
      href={buildCardHref(routeCardId(card), marketPath)}
      className="grid gap-4 rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 transition-all hover:border-[#F0C040]/35 hover:bg-[var(--color-cream)] md:grid-cols-[96px_minmax(0,1fr)_220px]"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)]">
        <img
          src={marketCardImageUrl(card)}
          alt={card.name}
          className="aspect-[5/7] w-full object-contain p-2"
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-[var(--color-navy)]">{card.name}</h3>
          <span className="rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-mid)]">
            {displayRarity(card.rarity)}
          </span>
          {variantLabel ? (
            <span className="rounded-full border border-[#F0C040]/20 bg-[#F0C040]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0C040]">
              {variantLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-light)]">
          {displayCardId(card)} · {compactCardSetLabel(card)} · {card.type} · {card.color}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-mid)]">{card.effect || "No effect text listed."}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
        <CardPriceBlock card={card} />
        <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-light)]">Card Facts</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-navy)]">{card.attribute || "No attribute"}</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-light)]">
            Cost {card.cost ?? "-"} · Power {typeof card.power === "number" ? card.power.toLocaleString() : "-"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SuggestionRow({
  card,
  onSelect,
}: {
  card: MarketCardResult;
  onSelect: () => void;
}) {
  const variantLabel = marketVariantLabel(card);
  const priceState = marketPriceDisplay(card.market);
  const isMuted = priceState.tone === "muted";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
    >
      <img
        src={marketCardImageUrl(card)}
        alt={card.name}
        className="h-14 w-10 rounded-lg border border-white/10 bg-[#08111f] object-contain p-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate pr-2 text-sm font-bold text-white">{card.name}</p>
          <span className={`shrink-0 text-[11px] font-semibold ${isMuted ? "text-white/45" : "text-[#F0C040]"}`}>
            {priceState.label}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] text-white/45">
          {displayCardId(card)} · {compactCardSetLabel(card)}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">{card.type}</span>
          {variantLabel ? (
            <span className="rounded-full border border-[#F0C040]/20 bg-[#F0C040]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F0C040]">
              {variantLabel}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ResultsSkeleton({ view }: { view: ViewMode }) {
  if (view === "list") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`list-skeleton-${index}`} className="grid gap-4 rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 md:grid-cols-[96px_minmax(0,1fr)_220px]">
            <div className="shimmer aspect-[5/7] rounded-2xl" />
            <div className="space-y-3">
              <div className="shimmer h-6 w-2/3 rounded-full" />
              <div className="shimmer h-4 w-1/2 rounded-full" />
              <div className="shimmer h-20 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <div className="shimmer h-20 rounded-2xl" />
              <div className="shimmer h-20 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={`grid-skeleton-${index}`} className="rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-3">
          <div className="shimmer aspect-[5/7] rounded-[22px]" />
          <div className="mt-3 space-y-2">
            <div className="shimmer h-5 rounded-full" />
            <div className="shimmer h-4 w-2/3 rounded-full" />
            <div className="shimmer h-18 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-black uppercase tracking-[0.12em] text-[var(--color-text-dark)]">
          {title}
          {count ? <span className="ml-2 text-[11px] text-[#F0C040]">({count})</span> : null}
        </span>
        <ChevronRight className={`h-4 w-4 text-[var(--color-text-light)] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open ? <div className="border-t border-[var(--color-parchment-dark)] px-4 py-3">{children}</div> : null}
    </section>
  );
}

function CheckboxFilter({
  option,
  checked,
  onChange,
}: {
  option: MarketFacetOption;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] transition-all hover:border-[#F0C040]/25 hover:text-[var(--color-navy)]">
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[#F0C040] focus:ring-[#F0C040]/40"
          aria-label={option.label}
        />
        <span>{option.label}</span>
      </span>
      <span className="text-[11px] text-[var(--color-text-light)]">{option.count}</span>
    </label>
  );
}

function SetGroupBlock({
  group,
  selectedValues,
  expanded,
  onToggleExpanded,
  onToggleValue,
}: {
  group: MarketSetGroup;
  selectedValues: Set<string>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleValue: (value: string) => void;
}) {
  if (!group.options.length) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-white/65">{group.label}</p>
          <p className="mt-1 text-[11px] text-white/35">{group.options.length} exact sets</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/45 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded ? (
        <div className="mt-3 space-y-2">
          {group.options.map((option) => (
            <CheckboxFilter
              key={option.value}
              option={option}
              checked={selectedValues.has(option.value)}
              onChange={() => onToggleValue(option.value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      {pageWindow(page, totalPages).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onPageChange(value)}
          className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold transition-all ${
            value === page
              ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]"
              : "border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-mid)] hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)]"
          }`}
          aria-label={`Page ${value}`}
          aria-current={value === page ? "page" : undefined}
        >
          {value}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)] disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

type MarketCatalogViewProps = {
  initialCatalog?: MarketCatalogResponse | null;
  initialCatalogKey?: string;
};

export default function MarketCatalogView({ initialCatalog = null, initialCatalogKey = "" }: MarketCatalogViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseMarketUrlState(searchParams), [searchParams]);
  const activeFilterCount = useMemo(() => countActiveFilters(state), [state]);
  const [draftQuery, setDraftQuery] = useState({ value: state.q, committed: state.q });
  const [setSearch, setSetSearch] = useState("");
  const [expandedSetGroups, setExpandedSetGroups] = useState<Record<MarketSetGroupKey, boolean>>({
    boosters: false,
    starterDecks: false,
    promos: false,
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState<MarketFilterSectionState>(() => getInitialMarketOpenSections());
  const [catalogState, setCatalogState] = useState<{ key: string; data: MarketCatalogResponse | null; error: string }>({
    key: initialCatalog ? initialCatalogKey : "",
    data: initialCatalog,
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionState, setSuggestionState] = useState<{ query: string; data: MarketCardResult[]; error: string }>({
    query: "",
    data: [],
    error: "",
  });
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const catalogQuery = useMemo(() => buildMarketCatalogApiQuery(state), [state]);
  const activeCatalogKey = `${catalogQuery}::${reloadKey}`;
  const catalog = catalogState.data;
  const loading = catalogState.key !== activeCatalogKey;
  const error = catalogState.key === activeCatalogKey ? catalogState.error : "";
  const searchInput = state.q === draftQuery.committed ? draftQuery.value : state.q;
  const suggestionQuery = searchInput.trim();
  const suggestions = suggestionQuery.length >= 2 && suggestionState.query === suggestionQuery ? suggestionState.data : [];
  const suggestionsLoading = suggestionQuery.length >= 2 && suggestionState.query !== suggestionQuery;
  const suggestionsError = suggestionQuery.length >= 2 && suggestionState.query === suggestionQuery ? suggestionState.error : "";
  const setOptions = catalog?.facets.sets || [];
  const setFilterGroups = useMemo(() => buildMarketSetFilterGroups(setOptions), [setOptions]);
  const setSearchQuery = setSearch.trim();
  const setSearchResults = useMemo(() => searchMarketSetOptions(setOptions, setSearchQuery), [setOptions, setSearchQuery]);
  const selectedSetValues = useMemo(() => new Set(state.sets), [state.sets]);
  const selectedSetOptions = useMemo(() => {
    const optionByValue = new Map(setOptions.map((option) => [option.value, option]));
    return state.sets
      .map((value) => optionByValue.get(value))
      .filter((option): option is MarketFacetOption => Boolean(option));
  }, [setOptions, state.sets]);
  const currentMarketPath = useMemo(() => {
    const query = applyMarketStateToParams(state).toString();
    return query ? `/market?${query}` : "/market";
  }, [state]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setOpenSections(getInitialMarketOpenSections());
      return;
    }

    setOpenSections(getDesktopMarketOpenSections(state));
  }, [state]);

  useEffect(() => {
    const persist = () => {
      writeLastMarketState({
        path: currentMarketPath,
        scrollY: window.scrollY,
        savedAt: Date.now(),
      });
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(persist);
    };

    persist();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      persist();
    };
  }, [currentMarketPath]);

  useEffect(() => {
    if (catalogState.key === activeCatalogKey && catalogState.data) return;

    const controller = new AbortController();

    void fetch(`/api/market/catalog?${catalogQuery}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load market catalogue");
        return (await res.json()) as MarketCatalogResponse;
      })
      .then((json) => {
        setCatalogState({ key: activeCatalogKey, data: json, error: "" });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setCatalogState({
          key: activeCatalogKey,
          data: null,
          error: fetchError instanceof Error ? fetchError.message : "Unable to load market catalogue",
        });
      });

    return () => controller.abort();
  }, [activeCatalogKey, catalogQuery, catalogState.data, catalogState.key]);

  useEffect(() => {
    if (loading) return;

    const pending = readPendingMarketRestore();
    if (!pending || pending.path !== currentMarketPath) return;

    const handle = window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, pending.scrollY), behavior: "auto" });
      clearPendingMarketRestore();
    });

    return () => window.cancelAnimationFrame(handle);
  }, [currentMarketPath, loading]);

  useEffect(() => {
    if (suggestionQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set("q", suggestionQuery);
      params.set("page", "1");
      params.set("pageSize", "8");
      params.set("sort", "relevance");
      params.set("includeMetadata", "0");

      void fetch(`/api/market/catalog?${params.toString()}`, { cache: "no-store", signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error("Unable to load suggestions");
          return (await res.json()) as MarketCatalogResponse;
        })
        .then((json) => {
          setSuggestionState({ query: suggestionQuery, data: json.results, error: "" });
        })
        .catch((fetchError: unknown) => {
          if (controller.signal.aborted) return;
          setSuggestionState({
            query: suggestionQuery,
            data: [],
            error: fetchError instanceof Error ? fetchError.message : "Unable to load suggestions",
          });
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [suggestionQuery]);

  useEffect(() => {
    if (!setSearchQuery) return;
    setOpenSections((current) => (current.sets ? current : { ...current, sets: true }));
  }, [setSearchQuery]);

  const updateState = useCallback((updater: (current: MarketUrlState) => MarketUrlState) => {
    const nextState = updater(state);
    const params = applyMarketStateToParams(nextState);
    const nextUrl = params.toString() ? `/market?${params.toString()}` : "/market";

    startTransition(() => {
      router.push(nextUrl, { scroll: false });
    });
  }, [router, state]);

  const resetFilters = useCallback(() => {
    updateState((current) => ({
      ...current,
      sets: [],
      types: [],
      colors: [],
      rarities: [],
      counters: [],
      attributes: [],
      costMin: "",
      costMax: "",
      lifeMin: "",
      lifeMax: "",
      powerMin: "",
      powerMax: "",
      priceMin: "",
      priceMax: "",
      page: 1,
    }));
  }, [updateState]);

  const clearAll = useCallback(() => {
    setDraftQuery({ value: "", committed: "" });
    setSetSearch("");
    setShowSuggestions(false);
    updateState(() => ({
      q: "",
      sets: [],
      types: [],
      colors: [],
      rarities: [],
      counters: [],
      attributes: [],
      costMin: "",
      costMax: "",
      lifeMin: "",
      lifeMax: "",
      powerMin: "",
      powerMax: "",
      priceMin: "",
      priceMax: "",
      sort: "newest",
      page: 1,
      pageSize: DEFAULT_MARKET_PAGE_SIZE,
      view: "grid",
    }));
  }, [updateState]);

  const submitSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    setDraftQuery({ value: trimmed, committed: trimmed });
    setShowSuggestions(false);
    updateState((current) => ({
      ...current,
      q: trimmed,
      sort: current.sort === "relevance" || current.sort === "newest" ? defaultMarketSortForQuery(trimmed) : current.sort,
      page: 1,
    }));
  }, [updateState]);

  const toggleSetValue = useCallback((value: string) => {
    updateState((current) => ({ ...current, sets: toggleListValue(current.sets, value), page: 1 }));
  }, [updateState]);

  const totalPages = catalog?.totalPages || 1;
  const currentPage = catalog?.page || state.page;
  const showingFrom = catalog?.total ? (currentPage - 1) * state.pageSize + 1 : 0;
  const showingTo = catalog?.total ? Math.min(catalog.total, currentPage * state.pageSize) : 0;
  const emptyState = marketEmptyStateCopy({ query: state.q, activeFilterCount });

  const sidebarUtilityContent = (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-[#F0C040]/20 bg-[radial-gradient(circle_at_top,rgba(240,192,64,0.14),transparent_55%),rgba(255,255,255,0.04)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F0C040]">Filters</p>
            <p className="mt-1 text-sm text-[var(--color-text-mid)]">
              {activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : "Narrow by set, gameplay stats, rarity, and price"}
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-xs font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)]"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Find Set</p>
        <p className="mt-1 text-xs text-white/50">Search exact set codes or promo/event release names.</p>
        <input
          value={setSearch}
          onChange={(event) => setSetSearch(event.target.value)}
          placeholder="Search set code or release..."
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#F0C040]/40 focus:outline-none"
          aria-label="Search sets"
        />
        {selectedSetOptions.length ? (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Selected Sets</p>
            <div className="flex flex-wrap gap-2">
              {selectedSetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSetValue(option.value)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#F0C040]/25 bg-[#F0C040]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F0C040] transition-all hover:border-[#F0C040]/40 hover:bg-[#F0C040]/15"
                >
                  <span>{option.value}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const sidebarSectionsContent = (
    <div className="space-y-4">

      <FilterSection
        title="Card Set / Booster"
        count={state.sets.length}
        open={openSections.sets}
        onToggle={() => setOpenSections((current) => ({ ...current, sets: !current.sets }))}
      >
        <div className="space-y-3">
          {setSearchQuery ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-light)]">Search Results</p>
                <p className="mt-1 text-xs text-[var(--color-text-light)]">
                  Search finds exact set codes and specific promo/event releases.
                </p>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {setSearchResults.length ? (
                  setSearchResults.map((option) => (
                    <CheckboxFilter
                      key={option.value}
                      option={option}
                      checked={selectedSetValues.has(option.value)}
                      onChange={() => toggleSetValue(option.value)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-3 py-4 text-sm text-[var(--color-text-light)]">
                    No matching sets. Try a set code like `OP15` or search a promo/event name.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {setFilterGroups.map((group) => (
                  <SetGroupBlock
                    key={group.key}
                    group={group}
                    selectedValues={selectedSetValues}
                    expanded={expandedSetGroups[group.key]}
                    onToggleExpanded={() =>
                      setExpandedSetGroups((current) => ({ ...current, [group.key]: !current[group.key] }))
                    }
                    onToggleValue={toggleSetValue}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </FilterSection>

      <FilterSection
        title="Card Type"
        count={state.types.length}
        open={openSections.types}
        onToggle={() => setOpenSections((current) => ({ ...current, types: !current.types }))}
      >
        <div className="space-y-2">
          {(catalog?.facets.types || []).map((option) => (
            <CheckboxFilter
              key={option.value}
              option={option}
              checked={state.types.includes(option.value)}
              onChange={() => updateState((current) => ({ ...current, types: toggleListValue(current.types, option.value), page: 1 }))}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Color"
        count={state.colors.length}
        open={openSections.colors}
        onToggle={() => setOpenSections((current) => ({ ...current, colors: !current.colors }))}
      >
        <div className="space-y-2">
          {(catalog?.facets.colors || []).map((option) => (
            <CheckboxFilter
              key={option.value}
              option={option}
              checked={state.colors.includes(option.value)}
              onChange={() => updateState((current) => ({ ...current, colors: toggleListValue(current.colors, option.value), page: 1 }))}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Rarity"
        count={state.rarities.length}
        open={openSections.rarities}
        onToggle={() => setOpenSections((current) => ({ ...current, rarities: !current.rarities }))}
      >
        <div className="space-y-2">
          {(catalog?.facets.rarities || []).map((option) => (
            <CheckboxFilter
              key={option.value}
              option={{ ...option, label: RARITY_LABELS[option.value] || option.label }}
              checked={state.rarities.includes(option.value)}
              onChange={() => updateState((current) => ({ ...current, rarities: toggleListValue(current.rarities, option.value), page: 1 }))}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Cost / Life"
        count={(state.costMin || state.costMax ? 1 : 0) + (state.lifeMin || state.lifeMax ? 1 : 0)}
        open={openSections.costLife}
        onToggle={() => setOpenSections((current) => ({ ...current, costLife: !current.costLife }))}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--color-text-light)]">Cost</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={state.costMin}
                onChange={(event) => updateState((current) => ({ ...current, costMin: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
                placeholder={`Min (${catalog?.ranges.cost.min ?? 1})`}
                className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
                aria-label="Minimum card cost"
              />
              <input
                value={state.costMax}
                onChange={(event) => updateState((current) => ({ ...current, costMax: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
                placeholder={`Max (${catalog?.ranges.cost.max ?? 10})`}
                className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
                aria-label="Maximum card cost"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--color-text-light)]">Life</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={state.lifeMin}
                onChange={(event) => updateState((current) => ({ ...current, lifeMin: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
                placeholder={`Min (${catalog?.ranges.life.min ?? 2})`}
                className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
                aria-label="Minimum life"
              />
              <input
                value={state.lifeMax}
                onChange={(event) => updateState((current) => ({ ...current, lifeMax: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
                placeholder={`Max (${catalog?.ranges.life.max ?? 6})`}
                className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
                aria-label="Maximum life"
              />
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection
        title="Power"
        count={state.powerMin || state.powerMax ? 1 : 0}
        open={openSections.power}
        onToggle={() => setOpenSections((current) => ({ ...current, power: !current.power }))}
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            value={state.powerMin}
            onChange={(event) => updateState((current) => ({ ...current, powerMin: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
            placeholder={`Min (${catalog?.ranges.power.min ?? 1000})`}
            className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
            aria-label="Minimum power"
          />
          <input
            value={state.powerMax}
            onChange={(event) => updateState((current) => ({ ...current, powerMax: event.target.value.replace(/[^0-9]/g, ""), page: 1 }))}
            placeholder={`Max (${catalog?.ranges.power.max ?? 13000})`}
            className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
            aria-label="Maximum power"
          />
        </div>
      </FilterSection>

      <FilterSection
        title="Counter"
        count={state.counters.length}
        open={openSections.counter}
        onToggle={() => setOpenSections((current) => ({ ...current, counter: !current.counter }))}
      >
        <div className="space-y-2">
          {(catalog?.facets.counters || []).map((option) => (
            <CheckboxFilter
              key={option.value}
              option={option}
              checked={state.counters.includes(option.value)}
              onChange={() => updateState((current) => ({ ...current, counters: toggleListValue(current.counters, option.value), page: 1 }))}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Attribute"
        count={state.attributes.length}
        open={openSections.attribute}
        onToggle={() => setOpenSections((current) => ({ ...current, attribute: !current.attribute }))}
      >
        <div className="space-y-2">
          {(catalog?.facets.attributes || []).map((option) => (
            <CheckboxFilter
              key={option.value}
              option={option}
              checked={state.attributes.includes(option.value)}
              onChange={() => updateState((current) => ({ ...current, attributes: toggleListValue(current.attributes, option.value), page: 1 }))}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Price Range"
        count={state.priceMin || state.priceMax ? 1 : 0}
        open={openSections.price}
        onToggle={() => setOpenSections((current) => ({ ...current, price: !current.price }))}
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            value={state.priceMin}
            onChange={(event) => updateState((current) => ({ ...current, priceMin: event.target.value.replace(/[^0-9.]/g, ""), page: 1 }))}
            placeholder="Min price"
            className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
            aria-label="Minimum market price"
          />
          <input
            value={state.priceMax}
            onChange={(event) => updateState((current) => ({ ...current, priceMax: event.target.value.replace(/[^0-9.]/g, ""), page: 1 }))}
            placeholder="Max price"
            className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
            aria-label="Maximum market price"
          />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-[32px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-gold-dark)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-dark)]">Market Search</span>
            </div>
            <h1 className="mt-4 text-4xl font-black text-[var(--color-navy)] md:text-5xl">
              Browse the <span className="text-[var(--color-gold-dark)]">Devil Fruit Marketplace</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-mid)]">
              Search One Piece cards by name, card number, set, and play stats, then browse clean market pricing without the messy internal labels.
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-light)]">Current view</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{catalog ? catalog.total.toLocaleString() : loading ? "Loading..." : "0"}</p>
            <p className="mt-1 text-sm text-[var(--color-text-light)]">
              {state.q ? `Cards matching "${state.q}"` : "Cards available in this view"}
            </p>
          </div>
        </div>

        <div ref={searchContainerRef} className="relative mt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch(searchInput);
            }}
            className="flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-light)]" />
              <input
                value={searchInput}
                onChange={(event) => {
                  setDraftQuery({ value: event.target.value, committed: state.q });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search card names, numbers, set codes, traits, or effect text..."
                className="w-full rounded-[24px] border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] py-4 pl-12 pr-12 text-base text-[var(--color-text-dark)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-gold)] focus:outline-none"
                aria-label="Search cards"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftQuery({ value: "", committed: "" });
                    if (state.q) submitSearch("");
                  }}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-light)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-text-dark)]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="rounded-[24px] border border-[var(--color-gold)] bg-[var(--color-gold)]/14 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)] transition-all hover:bg-[var(--color-gold)]/22"
            >
              Search
            </button>
          </form>

          <AnimatePresence>
            {showSuggestions && searchInput.trim().length >= 2 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute z-30 mt-2 w-full overflow-hidden rounded-[24px] border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] shadow-2xl shadow-black/10"
              >
                {suggestionsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-[var(--color-text-light)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-gold-dark)]" />
                    Searching cards...
                  </div>
                ) : suggestions.length ? (
                  <div className="max-h-[420px] overflow-y-auto py-2">
                    {suggestions.map((card) => (
                      <SuggestionRow key={card.id} card={card} onSelect={() => {
                        const displayId = displayCardId(card);
                        setDraftQuery({ value: displayId, committed: displayId });
                        submitSearch(displayId);
                      }} />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-[var(--color-text-light)]">
                    {suggestionsError || "No matching cards found."}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`hidden self-start lg:flex ${getDesktopMarketSidebarClassName()}`}>
          <div className={getDesktopMarketSidebarUtilityClassName()}>{sidebarUtilityContent}</div>
          <div className={getDesktopMarketSidebarBodyClassName()}>{sidebarSectionsContent}</div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-[var(--color-navy)]">
                {catalog?.total ? `Showing ${showingFrom}-${showingTo} of ${catalog.total.toLocaleString()} results` : "No results yet"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-light)]">
                {state.q ? `Search: "${state.q}"` : "Browse the full One Piece market catalog"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)] lg:hidden"
                aria-label="Open filters"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount ? (
                  <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[11px] font-black text-[var(--color-gold-dark)]">{activeFilterCount}</span>
                ) : null}
              </button>

              <label className="text-sm text-[var(--color-text-light)]">
                <span className="sr-only">Sort cards</span>
                <select
                  value={state.sort}
                  onChange={(event) => updateState((current) => ({ ...current, sort: event.target.value as MarketSort, page: 1 }))}
                  className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)]"
                  aria-label="Sort cards"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[var(--color-cream)]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-[var(--color-text-light)]">
                <span className="sr-only">Results per page</span>
                <select
                  value={state.pageSize}
                  onChange={(event) => updateState((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}
                  className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-text-dark)]"
                  aria-label="Results per page"
                >
                  {MARKET_PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[var(--color-cream)]">
                      {option} / page
                    </option>
                  ))}
                </select>
              </label>

              <div className="inline-flex rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-1">
                <button
                  type="button"
                  onClick={() => updateState((current) => ({ ...current, view: "grid" }))}
                  className={`rounded-lg px-3 py-2 text-sm transition-all ${state.view === "grid" ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]" : "text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateState((current) => ({ ...current, view: "list" }))}
                  className={`rounded-lg px-3 py-2 text-sm transition-all ${state.view === "list" ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]" : "text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"}`}
                  aria-label="List view"
                >
                  <Rows3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <ResultsSkeleton view={state.view} />
          ) : error ? (
            <div className="rounded-[28px] border border-red-300 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="text-lg font-black text-[var(--color-navy)]">Unable to load the market catalog</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    className="mt-4 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-2 text-sm font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : catalog && catalog.results.length ? (
            <>
              {state.view === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {catalog.results.map((card) => (
                    <MarketCardTile key={card.id} card={card} marketPath={currentMarketPath} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {catalog.results.map((card) => (
                    <MarketCardRow key={card.id} card={card} marketPath={currentMarketPath} />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-4 md:flex-row md:items-center md:justify-between">
                <Pagination page={currentPage} totalPages={totalPages} onPageChange={(nextPage) => updateState((current) => ({ ...current, page: nextPage }))} />
                <p className="text-sm text-[var(--color-text-light)]">
                  {state.q ? "Relevance defaults while searching." : "Newest cards surface first until you pick another sort."}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-[32px] border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-6 py-14 text-center">
              <p className="text-2xl font-black text-[var(--color-navy)]">{emptyState.title}</p>
              <p className="mt-3 text-sm text-[var(--color-text-mid)]">{emptyState.body}</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-5 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-4 py-3 text-sm font-semibold text-[var(--color-text-mid)] transition-all hover:bg-[var(--color-parchment-dark)] hover:text-[var(--color-navy)]"
              >
                {emptyState.actionLabel}
              </button>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="relative h-full w-[88vw] max-w-sm overflow-y-auto border-r border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4 shadow-2xl shadow-black/50"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F0C040]">Filters</p>
                  <p className="mt-1 text-sm text-[var(--color-text-mid)]">{activeFilterCount ? `${activeFilterCount} active` : "No filters applied"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] text-[var(--color-text-mid)]"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                {sidebarUtilityContent}
                {sidebarSectionsContent}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

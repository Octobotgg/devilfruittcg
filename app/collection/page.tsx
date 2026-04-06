"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Heart,
  LayoutGrid,
  LineChart as LineChartIcon,
  List,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Card } from "@/lib/cards";
import CardModal, { type CardModalData } from "@/components/CardModal";
import type { Collection, Deck } from "@/lib/cloud/types";
import {
  buildLoginUrl,
  clearPendingAuthAction,
  doesPendingActionMatchCurrentPath,
  getPendingAuthAction,
  setPendingAuthAction,
} from "@/lib/cloud/pending-auth-action";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { fetchWithClientAuth } from "@/lib/client-auth";
import { buildProfileSummary } from "@/lib/profile-summary";
import { logProfileActivity, syncProfileSummaryPatch } from "@/lib/profile-sync-client";

type CollectionTab = "browse" | "my_cards" | "completion" | "portfolio" | "wishlist" | "needed" | "tools";
type OwnershipStatus = "all" | "owned" | "not_owned" | "wishlist";
type BrowseSort = "number" | "price_desc" | "price_asc" | "name_asc" | "name_desc" | "rarity" | "recent";
type MyCardsSort = "number" | "name_asc" | "name_desc" | "price_desc" | "price_asc" | "value_desc" | "quantity_desc" | "recent" | "set";
type ConditionLabel = "NM" | "LP" | "MP" | "HP" | "DMG";
type PortfolioRange = "7d" | "30d" | "90d" | "365d";
type DesktopFilterKey = "set" | "color" | "type" | "rarity" | "counter" | "attribute" | "costPower" | "priceOwnership" | "sort";

type PriceEntry = {
  cardId: string;
  marketPrice: number | null;
  estimatedPrice: number;
  source: "market_cache" | "mock";
  stale: boolean;
  updatedAt: string | null;
};

type WatchlistItem = {
  watchId: string;
  cardId: string;
  variantKey: string;
  targetPrice: number | null;
  alertPercent: number | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

type PriceHistoryPoint = {
  date: string;
  ebayAvg: number | null;
  tcgMarket: number | null;
};

type SetSummary = {
  setCode: string;
  setName: string;
  totalSlots: number;
  ownedSlots: number;
  ownedQuantity: number;
  value: number;
  sampleCardId: string;
};

type NeededCardRow = {
  deckId: string;
  deckName: string;
  cardId: string;
  cardName: string;
  needed: number;
  owned: number;
};

type BulkImportResult = {
  addedLines: number;
  unmatched: string[];
};

type OwnedCardRow = {
  card: Card;
  quantity: number;
  price: number | null;
  totalValue: number | null;
  recentAt: string;
};

type CollectionBrowseFilters = {
  q: string;
  sets: string[];
  colors: string[];
  types: string[];
  rarities: string[];
  counters: string[];
  attributes: string[];
  costMin: string;
  costMax: string;
  powerMin: string;
  powerMax: string;
  priceMin: string;
  priceMax: string;
  ownership: OwnershipStatus;
  sort: BrowseSort;
  page: number;
  tab: CollectionTab;
};

const COLLECTION_CONDITION_KEY = "devilfruit_collection_conditions";
const COLLECTION_RECENT_KEY = "devilfruit_collection_recent";
const COLLECTION_TRADE_KEY = "devilfruit_collection_trade_cards";
const PRICE_BATCH_SIZE = 150;
const BROWSE_PAGE_SIZE = 48;
const CONDITION_OPTIONS: Array<{ value: ConditionLabel; label: string }> = [
  { value: "NM", label: "Near Mint" },
  { value: "LP", label: "Lightly Played" },
  { value: "MP", label: "Moderately Played" },
  { value: "HP", label: "Heavily Played" },
  { value: "DMG", label: "Damaged" },
];
const COLOR_OPTIONS = ["Red", "Blue", "Green", "Purple", "Black", "Yellow", "Multicolor"];
const TYPE_OPTIONS = ["Leader", "Character", "Event", "Stage", "DON!!"];
const TAB_OPTIONS: Array<{ id: CollectionTab; label: string; icon: ReactNode }> = [
  { id: "browse", label: "Browse", icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "my_cards", label: "My Cards", icon: <List className="h-4 w-4" /> },
  { id: "completion", label: "Set Completion", icon: <Boxes className="h-4 w-4" /> },
  { id: "portfolio", label: "Portfolio", icon: <LineChartIcon className="h-4 w-4" /> },
  { id: "wishlist", label: "Wishlist", icon: <Heart className="h-4 w-4" /> },
  { id: "needed", label: "Cards Needed", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "tools", label: "Quick Add & Tools", icon: <WandSparkles className="h-4 w-4" /> },
];

const MY_CARDS_SORT_OPTIONS: Array<{ value: MyCardsSort; label: string }> = [
  { value: "number", label: "Card Number" },
  { value: "name_asc", label: "Name: A–Z" },
  { value: "name_desc", label: "Name: Z–A" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "value_desc", label: "Total Value: High to Low" },
  { value: "quantity_desc", label: "Quantity: High to Low" },
  { value: "recent", label: "Recently Added" },
  { value: "set", label: "Set" },
];
const RARITY_SORT_ORDER = ["L", "SEC", "SR", "R", "UC", "C", "P", "TR", "SP CARD"];
const PIE_COLORS = ["#f0c040", "#22c55e", "#38bdf8", "#f472b6", "#c084fc", "#f97316", "#94a3b8"];

function readStoredMap<T extends Record<string, string>>(key: string): T {
  if (typeof window === "undefined") return {} as T;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {} as T;
    return parsed as T;
  } catch {
    return {} as T;
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
    // ignore persistence failures
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatAge(iso?: string) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function clampNumberInput(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildCardModalData(card: Card): CardModalData {
  return {
    id: card.id,
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
    imageUrl: card.imageUrl,
  };
}

function setSlotKey(card: Card) {
  return `${card.setCode}::${card.number}`;
}

function formatCounterLabel(value: number) {
  if (value === 0) return "0";
  if (value % 1000 === 0) return `${value / 1000}k`;
  return value.toLocaleString();
}

function compareCardNumber(a: Card, b: Card) {
  const setCompare = a.setCode.localeCompare(b.setCode, undefined, { numeric: true });
  if (setCompare !== 0) return setCompare;

  const numberA = Number(a.number.replace(/\D/g, "")) || 0;
  const numberB = Number(b.number.replace(/\D/g, "")) || 0;
  if (numberA !== numberB) return numberA - numberB;

  return a.name.localeCompare(b.name);
}

function rarityRank(card: Card) {
  const variantIndex = ["manga", "manga_red", "manga_gold", "sp", "alt_art", "anniversary", "parallel"].indexOf(card.variantType || "");
  if (variantIndex >= 0) return -50 + variantIndex;
  const index = RARITY_SORT_ORDER.indexOf((card.rarity || "").toUpperCase());
  if (index >= 0) return index;
  return 999;
}

function formatTooltipCurrency(value: unknown) {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (typeof resolved === "number" && Number.isFinite(resolved)) return formatCurrency(resolved);
  if (typeof resolved === "string" && resolved.trim()) {
    const parsed = Number(resolved);
    if (Number.isFinite(parsed)) return formatCurrency(parsed);
  }
  return "—";
}

function portfolioRangeDays(range: PortfolioRange) {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "365d":
      return 365;
    default:
      return 30;
  }
}

function colorMatch(card: Card, selectedColors: string[]) {
  if (!selectedColors.length) return true;

  const parts = card.color.split("/").map((part) => part.trim());
  return selectedColors.some((color) => {
    if (color === "Multicolor") return parts.length > 1;
    return parts.includes(color);
  });
}

function cardPrice(cardId: string, priceMap: Map<string, PriceEntry>, collection: Collection) {
  const live = priceMap.get(cardId);
  if (live) return live.estimatedPrice;
  return collection[cardId]?.price ?? null;
}

function buildFilterState(searchParams: URLSearchParams): CollectionBrowseFilters {
  const repeated = (key: string) => Array.from(new Set(searchParams.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean)));

  const tab = (searchParams.get("tab") || "browse") as CollectionTab;
  const ownership = (searchParams.get("ownership") || "all") as OwnershipStatus;
  const sort = (searchParams.get("sort") || "number") as BrowseSort;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));

  return {
    q: searchParams.get("q") || "",
    sets: repeated("set"),
    colors: repeated("color"),
    types: repeated("type"),
    rarities: repeated("rarity"),
    counters: repeated("counter"),
    attributes: repeated("attribute"),
    costMin: searchParams.get("costMin") || "",
    costMax: searchParams.get("costMax") || "",
    powerMin: searchParams.get("powerMin") || "",
    powerMax: searchParams.get("powerMax") || "",
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    ownership,
    sort,
    page,
    tab: TAB_OPTIONS.some((option) => option.id === tab) ? tab : "browse",
  };
}

function CatalogCardArt({
  cardId,
  alt,
  className,
}: {
  cardId: string;
  alt: string;
  className: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className={`absolute inset-0 animate-pulse bg-white/10 transition-opacity ${loaded ? "opacity-0" : "opacity-100"}`} />
      <Image
        src={`/api/card-image?id=${encodeURIComponent(cardId)}`}
        alt={alt}
        fill
        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 220px"
        unoptimized
        className={`object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

function MobileDrawer({
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
            className="fixed inset-0 z-40 bg-black/75 lg:hidden"
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
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Collection Lab</p>
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

function PlaceholderCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm text-white/55">{body}</p>
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-24 md:pb-10">
          <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] px-5 py-14 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--color-text-light)]" />
            <p className="mt-4 text-sm text-[var(--color-text-light)]">Loading collection command center...</p>
          </section>
        </div>
      }
    >
      <CollectionPageContent />
    </Suspense>
  );
}

function CollectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loadCollection: loadCollectionFromStore,
    saveCollection: saveCollectionToStore,
    loadDecks: loadDecksFromStore,
    ready: cloudReady,
    user,
    hasCloud,
  } = useCloudSync();

  const initialFilters = useMemo(() => buildFilterState(searchParams), [searchParams]);
  const didInitUrlState = useRef(false);
  const resumeKeyRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  const [catalogCards, setCatalogCards] = useState<Card[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [collection, setCollection] = useState<Collection>({});
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [priceMap, setPriceMap] = useState<Map<string, PriceEntry>>(new Map());
  const [priceProgress, setPriceProgress] = useState({ done: 0, total: 0 });
  const [priceLoading, setPriceLoading] = useState(false);
  const [refreshingCollectionPrices, setRefreshingCollectionPrices] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CollectionTab>(initialFilters.tab);
  const [query, setQuery] = useState(initialFilters.q);
  const [setFilterQuery, setSetFilterQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedSets, setSelectedSets] = useState<string[]>(initialFilters.sets);
  const [selectedColors, setSelectedColors] = useState<string[]>(initialFilters.colors);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialFilters.types);
  const [selectedRarities, setSelectedRarities] = useState<string[]>(initialFilters.rarities);
  const [selectedCounters, setSelectedCounters] = useState<string[]>(initialFilters.counters);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(initialFilters.attributes);
  const [costMin, setCostMin] = useState(initialFilters.costMin);
  const [costMax, setCostMax] = useState(initialFilters.costMax);
  const [powerMin, setPowerMin] = useState(initialFilters.powerMin);
  const [powerMax, setPowerMax] = useState(initialFilters.powerMax);
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin);
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipStatus>(initialFilters.ownership);
  const [sortMode, setSortMode] = useState<BrowseSort>(initialFilters.sort);
  const [myCardsSort, setMyCardsSort] = useState<MyCardsSort>("number");
  const [page, setPage] = useState(initialFilters.page);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopExpandedFilter, setDesktopExpandedFilter] = useState<DesktopFilterKey | null>(null);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [quickAddCount, setQuickAddCount] = useState(0);
  const [bulkText, setBulkText] = useState("");
  const [bulkMessage, setBulkMessage] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [modalCard, setModalCard] = useState<CardModalData | null>(null);
  const [conditionMap, setConditionMap] = useState<Record<string, ConditionLabel>>({});
  const [recentAddedMap, setRecentAddedMap] = useState<Record<string, string>>({});
  const [tradeIds, setTradeIds] = useState<string[]>([]);
  const [selectedSetCode, setSelectedSetCode] = useState("");
  const [hoveredSetCardId, setHoveredSetCardId] = useState<string | null>(null);
  const [portfolioRange, setPortfolioRange] = useState<PortfolioRange>("30d");
  const [historyMap, setHistoryMap] = useState<Record<string, PriceHistoryPoint[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const allCardsById = useMemo(() => new Map(catalogCards.map((card) => [card.id, card])), [catalogCards]);
  const wishlistByCardId = useMemo(() => new Map(watchlistItems.map((item) => [item.cardId, item])), [watchlistItems]);
  const collectionEntries = useMemo(() => Object.values(collection), [collection]);
  const storageLabel = user ? "Account sync active" : hasCloud ? "Sign in required to save collection" : "Saved locally";

  function openModal(card: Card) {
    setModalCard(buildCardModalData(card));
  }

  const requireCollectionAccount = useCallback(
    (card?: Card) => {
      if (!hasCloud || user) return false;

      if (card) {
        setPendingAuthAction({
          kind: "collection_add",
          createdAt: new Date().toISOString(),
          next: "/collection",
          cardId: card.id,
          cardName: card.name,
        });
      }

      router.push(buildLoginUrl("/collection", "collection_add"));
      return true;
    },
    [hasCloud, router, user],
  );

  const persistCollection = useCallback(
    (next: Collection) => {
      setCollection(next);
      void saveCollectionToStore(next);
    },
    [saveCollectionToStore],
  );

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      const frame = window.requestAnimationFrame(() => {
        resumeKeyRef.current = null;
        setCollection({});
        setSavedDecks([]);
        setWatchlistItems([]);
        setConditionMap({});
        setRecentAddedMap({});
        setTradeIds([]);
        setQuickAddCount(0);
        setBulkMessage(null);
        setSelectedSetCode("");
        setHoveredSetCardId(null);
        setActionNotice(null);
      });
      previousUserIdRef.current = nextUserId;
      return () => window.cancelAnimationFrame(frame);
    }

    previousUserIdRef.current = nextUserId;
  }, [user]);

  useEffect(() => {
    if (didInitUrlState.current) return;
    didInitUrlState.current = true;
    setActiveTab(initialFilters.tab);
    setQuery(initialFilters.q);
    setSelectedSets(initialFilters.sets);
    setSelectedColors(initialFilters.colors);
    setSelectedTypes(initialFilters.types);
    setSelectedRarities(initialFilters.rarities);
    setSelectedCounters(initialFilters.counters);
    setSelectedAttributes(initialFilters.attributes);
    setCostMin(initialFilters.costMin);
    setCostMax(initialFilters.costMax);
    setPowerMin(initialFilters.powerMin);
    setPowerMax(initialFilters.powerMax);
    setPriceMin(initialFilters.priceMin);
    setPriceMax(initialFilters.priceMax);
    setOwnershipFilter(initialFilters.ownership);
    setSortMode(initialFilters.sort);
    setPage(initialFilters.page);
  }, [initialFilters]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "browse") params.set("tab", activeTab);
    if (query.trim()) params.set("q", query.trim());
    selectedSets.forEach((value) => params.append("set", value));
    selectedColors.forEach((value) => params.append("color", value));
    selectedTypes.forEach((value) => params.append("type", value));
    selectedRarities.forEach((value) => params.append("rarity", value));
    selectedCounters.forEach((value) => params.append("counter", value));
    selectedAttributes.forEach((value) => params.append("attribute", value));
    if (costMin) params.set("costMin", costMin);
    if (costMax) params.set("costMax", costMax);
    if (powerMin) params.set("powerMin", powerMin);
    if (powerMax) params.set("powerMax", powerMax);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (ownershipFilter !== "all") params.set("ownership", ownershipFilter);
    if (sortMode !== "number") params.set("sort", sortMode);
    if (page > 1) params.set("page", String(page));

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/collection?${nextQuery}` : "/collection", { scroll: false });
  }, [
    activeTab,
    costMax,
    costMin,
    ownershipFilter,
    page,
    powerMax,
    powerMin,
    priceMax,
    priceMin,
    query,
    router,
    selectedAttributes,
    selectedColors,
    selectedCounters,
    selectedRarities,
    selectedSets,
    selectedTypes,
    sortMode,
  ]);

  useEffect(() => {
    setConditionMap(readStoredMap<Record<string, ConditionLabel>>(COLLECTION_CONDITION_KEY));
    setRecentAddedMap(readStoredMap<Record<string, string>>(COLLECTION_RECENT_KEY));
    setTradeIds(readStoredList(COLLECTION_TRADE_KEY));
  }, []);

  useEffect(() => {
    persistStoredValue(COLLECTION_CONDITION_KEY, conditionMap);
  }, [conditionMap]);

  useEffect(() => {
    persistStoredValue(COLLECTION_RECENT_KEY, recentAddedMap);
  }, [recentAddedMap]);

  useEffect(() => {
    persistStoredValue(COLLECTION_TRADE_KEY, tradeIds);
  }, [tradeIds]);

  useEffect(() => {
    if (!cloudReady) return;

    let cancelled = false;
    setStorageReady(false);

    void Promise.all([loadCollectionFromStore(), loadDecksFromStore()])
      .then(([nextCollection, nextDecks]) => {
        if (cancelled) return;
        setCollection(nextCollection);
        setSavedDecks(nextDecks);
        setStorageReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCollection({});
        setSavedDecks([]);
        setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cloudReady, loadCollectionFromStore, loadDecksFromStore]);

  useEffect(() => {
    if (!storageReady || !user) return;

    const pending = getPendingAuthAction();
    if (!pending || pending.kind !== "collection_add" || !doesPendingActionMatchCurrentPath(pending)) return;

    const resumeKey = `${pending.kind}:${pending.createdAt}`;
    if (resumeKeyRef.current === resumeKey) return;
    resumeKeyRef.current = resumeKey;

    let cancelled = false;

    void (async () => {
      try {
        const next = { ...collection };
        const current = next[pending.cardId];
        next[pending.cardId] = {
          cardId: pending.cardId,
          quantity: (current?.quantity || 0) + 1,
          price: current?.price,
          lastUpdated: current?.lastUpdated,
        };

        await saveCollectionToStore(next);

        if (cancelled) return;

        setCollection(next);
        setRecentAddedMap((prev) => ({ ...prev, [pending.cardId]: new Date().toISOString() }));
        setActiveTab("browse");
        clearPendingAuthAction();
        setActionNotice({
          tone: "success",
          message: pending.cardName
            ? `Added "${pending.cardName}" to your account collection.`
            : "Added that card to your account collection.",
        });
        window.setTimeout(() => setActionNotice(null), 2200);
      } catch {
        if (cancelled) return;
        resumeKeyRef.current = null;
        setActionNotice({ tone: "error", message: "We could not finish saving that card after login. Try again." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [collection, saveCollectionToStore, storageReady, user]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError("");

    void fetch("/api/cards?includeVariants=true&pageSize=5000", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load card catalog");
        return await res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setCatalogCards(Array.isArray(json.results) ? (json.results as Card[]) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogCards([]);
        setCatalogError("We could not load the collection catalog.");
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalogCards.length) {
      setPriceMap(new Map());
      setPriceProgress({ done: 0, total: 0 });
      return;
    }

    let cancelled = false;
    const uniqueIds = Array.from(new Set(catalogCards.map((card) => card.id.toUpperCase())));
    setPriceLoading(true);
    setPriceProgress({ done: 0, total: uniqueIds.length });

    void (async () => {
      for (let index = 0; index < uniqueIds.length; index += PRICE_BATCH_SIZE) {
        const batch = uniqueIds.slice(index, index + PRICE_BATCH_SIZE);

        try {
          const res = await fetch(`/api/cards/prices?ids=${encodeURIComponent(batch.join(","))}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Unable to load prices");
          const json = await res.json();
          const results = Array.isArray(json.results) ? (json.results as PriceEntry[]) : [];

          if (cancelled) return;

          setPriceMap((prev) => {
            const next = new Map(prev);
            results.forEach((entry) => next.set(entry.cardId.toUpperCase(), entry));
            return next;
          });
        } catch {
          // keep prior price data
        } finally {
          if (!cancelled) {
            setPriceProgress((prev) => ({
              total: uniqueIds.length,
              done: Math.min(uniqueIds.length, prev.done + batch.length),
            }));
          }
        }
      }

      if (!cancelled) setPriceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogCards]);

  useEffect(() => {
    if (!user) {
      setWatchlistItems([]);
      setWatchlistLoading(false);
      return;
    }

    let cancelled = false;
    setWatchlistLoading(true);

    void fetchWithClientAuth("/api/me/watchlist", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load wishlist");
        return await res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setWatchlistItems(Array.isArray(json.items) ? (json.items as WatchlistItem[]) : []);
      })
      .catch(() => {
        if (!cancelled) setWatchlistItems([]);
      })
      .finally(() => {
        if (!cancelled) setWatchlistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !storageReady || !catalogCards.length || watchlistLoading || priceLoading) return;

    const timer = window.setTimeout(() => {
      const summary = buildProfileSummary({
        collection,
        decks: savedDecks,
        watchlistCount: watchlistItems.length,
        tradeCount: tradeIds.length,
        cards: catalogCards,
        priceMap,
      });

      void syncProfileSummaryPatch(summary).catch(() => {
        // ignore profile sync failures
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    catalogCards,
    collection,
    priceLoading,
    priceMap,
    savedDecks,
    storageReady,
    tradeIds.length,
    user,
    watchlistItems.length,
    watchlistLoading,
  ]);

  const ownedIds = useMemo(() => Object.keys(collection), [collection]);
  const activeFilterCount = useMemo(
    () =>
      [
        query.trim(),
        selectedSets.length,
        selectedColors.length,
        selectedTypes.length,
        selectedRarities.length,
        selectedCounters.length,
        selectedAttributes.length,
        costMin,
        costMax,
        powerMin,
        powerMax,
        priceMin,
        priceMax,
        ownershipFilter !== "all",
      ].filter(Boolean).length,
    [
      costMax,
      costMin,
      ownershipFilter,
      powerMax,
      powerMin,
      priceMax,
      priceMin,
      query,
      selectedAttributes.length,
      selectedColors.length,
      selectedCounters.length,
      selectedRarities.length,
      selectedSets.length,
      selectedTypes.length,
    ],
  );

  const desktopFilterCounts = useMemo(
    () => ({
      set: selectedSets.length,
      color: selectedColors.length,
      type: selectedTypes.length,
      rarity: selectedRarities.length,
      counter: selectedCounters.length,
      attribute: selectedAttributes.length,
      costPower: [costMin, costMax, powerMin, powerMax].filter(Boolean).length,
      priceOwnership: [priceMin, priceMax].filter(Boolean).length + (ownershipFilter !== "all" ? 1 : 0),
      sort: sortMode !== "number" ? 1 : 0,
    }),
    [
      costMax,
      costMin,
      ownershipFilter,
      powerMax,
      powerMin,
      priceMax,
      priceMin,
      selectedAttributes.length,
      selectedColors.length,
      selectedCounters.length,
      selectedRarities.length,
      selectedSets.length,
      selectedTypes.length,
      sortMode,
    ],
  );

  const setOptions = useMemo(
    () =>
      Array.from(
        catalogCards.reduce<Map<string, string>>((acc, card) => {
          if (!acc.has(card.setCode)) acc.set(card.setCode, `${card.setCode} · ${card.set}`);
          return acc;
        }, new Map()),
      )
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true })),
    [catalogCards],
  );

  const visibleSetOptions = useMemo(() => {
    const q = setFilterQuery.trim().toLowerCase();
    if (!q) return setOptions;
    return setOptions.filter((option) => option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q));
  }, [setFilterQuery, setOptions]);

  const counterOptions = useMemo(
    () =>
      Array.from(
        new Set(catalogCards.map((card) => String(typeof card.counter === "number" ? card.counter : 0))),
      )
        .sort((a, b) => Number(a) - Number(b))
        .map((value) => ({ value, label: formatCounterLabel(Number(value)) })),
    [catalogCards],
  );

  const attributeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          catalogCards
            .flatMap((card) => String(card.attribute || "").split("/"))
            .map((part) => part.trim())
            .filter((part) => part && part !== "?"),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [catalogCards],
  );

  const rarityOptions = useMemo(() => {
    const baseRarities = Array.from(new Set(catalogCards.map((card) => String(card.rarity || "").trim()).filter(Boolean)));
    const variantTypes = Array.from(new Set(catalogCards.map((card) => String(card.variantType || "").trim()).filter(Boolean)));

    const items = [
      ...baseRarities.map((value) => ({ value, label: value })),
      ...variantTypes.map((value) => ({
        value,
        label:
          value === "alt_art"
            ? "Alt Art"
            : value === "manga"
              ? "Manga Rare"
              : value === "manga_red"
                ? "Manga Rare (Red)"
                : value === "manga_gold"
                  ? "Manga Rare (Gold)"
                  : value === "sp"
                    ? "SP"
                    : value === "anniversary"
                      ? "Anniversary"
                      : value === "parallel"
                        ? "Parallel"
                        : value,
      })),
    ];

    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [catalogCards]);

  const filteredCards = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filters = {
      costMin: parseNumber(costMin),
      costMax: parseNumber(costMax),
      powerMin: parseNumber(powerMin),
      powerMax: parseNumber(powerMax),
      priceMin: parseNumber(priceMin),
      priceMax: parseNumber(priceMax),
    };

    const rows = catalogCards.filter((card) => {
      const ownedQuantity = collection[card.id]?.quantity || 0;
      const isWishlisted = wishlistByCardId.has(card.id);
      const price = cardPrice(card.id, priceMap, collection);
      const searchable = [
        card.name,
        card.id,
        card.setCode,
        card.set,
        card.number,
        card.type,
        card.color,
        card.rarity,
        card.attribute || "",
        card.traits || "",
        card.effect || "",
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchable.includes(q)) return false;
      if (selectedSets.length && !selectedSets.includes(card.setCode)) return false;
      if (!colorMatch(card, selectedColors)) return false;
      if (selectedTypes.length && !selectedTypes.includes(card.type)) return false;
      if (
        selectedRarities.length &&
        !selectedRarities.some((token) => token === card.rarity || token === card.variantType)
      ) {
        return false;
      }
      if (selectedCounters.length) {
        const counter = String(typeof card.counter === "number" ? card.counter : 0);
        if (!selectedCounters.includes(counter)) return false;
      }
      if (selectedAttributes.length) {
        const parts = String(card.attribute || "")
          .split("/")
          .map((part) => part.trim())
          .filter(Boolean);
        if (!selectedAttributes.some((attribute) => parts.includes(attribute))) return false;
      }
      if (filters.costMin !== undefined && (typeof card.cost !== "number" || card.cost < filters.costMin)) return false;
      if (filters.costMax !== undefined && (typeof card.cost !== "number" || card.cost > filters.costMax)) return false;
      if (filters.powerMin !== undefined && (typeof card.power !== "number" || card.power < filters.powerMin)) return false;
      if (filters.powerMax !== undefined && (typeof card.power !== "number" || card.power > filters.powerMax)) return false;
      if (filters.priceMin !== undefined && (typeof price !== "number" || price < filters.priceMin)) return false;
      if (filters.priceMax !== undefined && (typeof price !== "number" || price > filters.priceMax)) return false;

      if (ownershipFilter === "owned" && ownedQuantity <= 0) return false;
      if (ownershipFilter === "not_owned" && ownedQuantity > 0) return false;
      if (ownershipFilter === "wishlist" && !isWishlisted) return false;

      return true;
    });

    rows.sort((a, b) => {
      if (sortMode === "price_desc" || sortMode === "price_asc") {
        const priceA = cardPrice(a.id, priceMap, collection) ?? -1;
        const priceB = cardPrice(b.id, priceMap, collection) ?? -1;
        if (priceA !== priceB) return sortMode === "price_desc" ? priceB - priceA : priceA - priceB;
      }

      if (sortMode === "name_asc") return a.name.localeCompare(b.name);
      if (sortMode === "name_desc") return b.name.localeCompare(a.name);
      if (sortMode === "rarity") {
        const rankDelta = rarityRank(a) - rarityRank(b);
        if (rankDelta !== 0) return rankDelta;
      }
      if (sortMode === "recent") {
        const recentA = Date.parse(recentAddedMap[a.id] || "") || 0;
        const recentB = Date.parse(recentAddedMap[b.id] || "") || 0;
        if (recentA !== recentB) return recentB - recentA;
      }

      return compareCardNumber(a, b);
    });

    return rows;
  }, [
    catalogCards,
    collection,
    costMax,
    costMin,
    deferredQuery,
    ownershipFilter,
    powerMax,
    powerMin,
    priceMap,
    priceMax,
    priceMin,
    recentAddedMap,
    selectedAttributes,
    selectedColors,
    selectedCounters,
    selectedRarities,
    selectedSets,
    selectedTypes,
    sortMode,
    wishlistByCardId,
  ]);

  const myCardsRows = useMemo<OwnedCardRow[]>(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filters = {
      costMin: parseNumber(costMin),
      costMax: parseNumber(costMax),
      powerMin: parseNumber(powerMin),
      powerMax: parseNumber(powerMax),
      priceMin: parseNumber(priceMin),
      priceMax: parseNumber(priceMax),
    };

    const rows = collectionEntries
      .flatMap((entry) => {
        const card = allCardsById.get(entry.cardId);
        if (!card || entry.quantity <= 0) return [];

        const price = cardPrice(entry.cardId, priceMap, collection);
        const searchable = [
          card.name,
          card.id,
          card.setCode,
          card.set,
          card.number,
          card.type,
          card.color,
          card.rarity,
          card.attribute || "",
          card.traits || "",
          card.effect || "",
        ]
          .join(" ")
          .toLowerCase();

        if (q && !searchable.includes(q)) return [];
        if (selectedSets.length && !selectedSets.includes(card.setCode)) return [];
        if (!colorMatch(card, selectedColors)) return [];
        if (selectedTypes.length && !selectedTypes.includes(card.type)) return [];
        if (
          selectedRarities.length &&
          !selectedRarities.some((token) => token === card.rarity || token === card.variantType)
        ) {
          return [];
        }
        if (selectedCounters.length) {
          const counter = String(typeof card.counter === "number" ? card.counter : 0);
          if (!selectedCounters.includes(counter)) return [];
        }
        if (selectedAttributes.length) {
          const parts = String(card.attribute || "")
            .split("/")
            .map((part) => part.trim())
            .filter(Boolean);
          if (!selectedAttributes.some((attribute) => parts.includes(attribute))) return [];
        }
        if (filters.costMin !== undefined && (typeof card.cost !== "number" || card.cost < filters.costMin)) return [];
        if (filters.costMax !== undefined && (typeof card.cost !== "number" || card.cost > filters.costMax)) return [];
        if (filters.powerMin !== undefined && (typeof card.power !== "number" || card.power < filters.powerMin)) return [];
        if (filters.powerMax !== undefined && (typeof card.power !== "number" || card.power > filters.powerMax)) return [];
        if (filters.priceMin !== undefined && (typeof price !== "number" || price < filters.priceMin)) return [];
        if (filters.priceMax !== undefined && (typeof price !== "number" || price > filters.priceMax)) return [];

        return [{
          card,
          quantity: entry.quantity,
          price,
          totalValue: typeof price === "number" ? price * entry.quantity : null,
          recentAt: recentAddedMap[entry.cardId] || entry.lastUpdated || "",
        }];
      });

    rows.sort((a, b) => {
      if (myCardsSort === "price_desc" || myCardsSort === "price_asc") {
        const priceA = a.price ?? -1;
        const priceB = b.price ?? -1;
        if (priceA !== priceB) return myCardsSort === "price_desc" ? priceB - priceA : priceA - priceB;
      }

      if (myCardsSort === "value_desc") {
        const totalA = a.totalValue ?? -1;
        const totalB = b.totalValue ?? -1;
        if (totalA !== totalB) return totalB - totalA;
      }

      if (myCardsSort === "quantity_desc" && a.quantity !== b.quantity) return b.quantity - a.quantity;
      if (myCardsSort === "name_asc") return a.card.name.localeCompare(b.card.name);
      if (myCardsSort === "name_desc") return b.card.name.localeCompare(a.card.name);
      if (myCardsSort === "recent") {
        const recentA = Date.parse(a.recentAt || "") || 0;
        const recentB = Date.parse(b.recentAt || "") || 0;
        if (recentA !== recentB) return recentB - recentA;
      }
      if (myCardsSort === "set") {
        const setCompare = a.card.setCode.localeCompare(b.card.setCode, undefined, { numeric: true });
        if (setCompare !== 0) return setCompare;
      }

      return compareCardNumber(a.card, b.card);
    });

    return rows;
  }, [
    allCardsById,
    collection,
    collectionEntries,
    costMax,
    costMin,
    deferredQuery,
    myCardsSort,
    powerMax,
    powerMin,
    priceMap,
    priceMax,
    priceMin,
    recentAddedMap,
    selectedAttributes,
    selectedColors,
    selectedCounters,
    selectedRarities,
    selectedSets,
    selectedTypes,
  ]);

  const totalBrowsePages = Math.max(1, Math.ceil(filteredCards.length / BROWSE_PAGE_SIZE));
  const safeBrowsePage = Math.min(page, totalBrowsePages);
  const browseCards = useMemo(
    () => filteredCards.slice((safeBrowsePage - 1) * BROWSE_PAGE_SIZE, safeBrowsePage * BROWSE_PAGE_SIZE),
    [filteredCards, safeBrowsePage],
  );

  useEffect(() => {
    if (page !== safeBrowsePage) setPage(safeBrowsePage);
  }, [page, safeBrowsePage]);

  const totalCardsOwned = useMemo(() => collectionEntries.reduce((sum, entry) => sum + entry.quantity, 0), [collectionEntries]);
  const totalCollectionValue = useMemo(
    () =>
      collectionEntries.reduce((sum, entry) => {
        const price = cardPrice(entry.cardId, priceMap, collection) ?? 0;
        return sum + price * entry.quantity;
      }, 0),
    [collection, collectionEntries, priceMap],
  );
  const uniqueCardsOwned = collectionEntries.length;
  const activeSetSummaryMap = useMemo(() => {
    const bySet = new Map<string, { setName: string; sampleCardId: string; slots: Map<string, Card> }>();

    catalogCards.forEach((card) => {
      const existing = bySet.get(card.setCode) || {
        setName: card.set,
        sampleCardId: card.id,
        slots: new Map<string, Card>(),
      };
      if (!existing.slots.has(setSlotKey(card))) existing.slots.set(setSlotKey(card), card);
      bySet.set(card.setCode, existing);
    });

    return bySet;
  }, [catalogCards]);

  const ownedSlotKeys = useMemo(() => {
    const keys = new Set<string>();
    collectionEntries.forEach((entry) => {
      const card = allCardsById.get(entry.cardId);
      if (card) keys.add(setSlotKey(card));
    });
    return keys;
  }, [allCardsById, collectionEntries]);

  const setSummaries = useMemo<SetSummary[]>(
    () =>
      Array.from(activeSetSummaryMap.entries())
        .map(([setCode, value]) => {
          const totalSlots = value.slots.size;
          const ownedCards = Array.from(value.slots.values()).filter((card) => ownedSlotKeys.has(setSlotKey(card)));
          const ownedSlots = ownedCards.length;
          const ownedQuantity = collectionEntries.reduce((sum, entry) => {
            const card = allCardsById.get(entry.cardId);
            return card?.setCode === setCode ? sum + entry.quantity : sum;
          }, 0);
          const setValue = collectionEntries.reduce((sum, entry) => {
            const card = allCardsById.get(entry.cardId);
            if (!card || card.setCode !== setCode) return sum;
            return sum + (cardPrice(entry.cardId, priceMap, collection) ?? 0) * entry.quantity;
          }, 0);

          return {
            setCode,
            setName: value.setName,
            totalSlots,
            ownedSlots,
            ownedQuantity,
            value: setValue,
            sampleCardId: value.sampleCardId,
          };
        })
        .sort((a, b) => a.setCode.localeCompare(b.setCode, undefined, { numeric: true })),
    [activeSetSummaryMap, allCardsById, collection, collectionEntries, ownedSlotKeys, priceMap],
  );

  useEffect(() => {
    if (!selectedSetCode && setSummaries.length) {
      setSelectedSetCode(setSummaries[0].setCode);
      return;
    }
    if (selectedSetCode && setSummaries.some((setSummary) => setSummary.setCode === selectedSetCode)) return;
    if (setSummaries.length) setSelectedSetCode(setSummaries[0].setCode);
  }, [selectedSetCode, setSummaries]);

  const selectedSetCards = useMemo(() => {
    if (!selectedSetCode) return [];
    const setEntry = activeSetSummaryMap.get(selectedSetCode);
    if (!setEntry) return [];
    return Array.from(setEntry.slots.values()).sort(compareCardNumber);
  }, [activeSetSummaryMap, selectedSetCode]);

  const selectedSetSummary = setSummaries.find((item) => item.setCode === selectedSetCode) || null;
  const hoveredSetCard = hoveredSetCardId ? allCardsById.get(hoveredSetCardId) || null : null;

  const portfolioBreakdown = useMemo(() => {
    const setValue = new Map<string, number>();
    const rarityValue = new Map<string, number>();
    const colorValue = new Map<string, number>();

    collectionEntries.forEach((entry) => {
      const card = allCardsById.get(entry.cardId);
      if (!card) return;
      const value = (cardPrice(entry.cardId, priceMap, collection) ?? 0) * entry.quantity;
      setValue.set(card.setCode, (setValue.get(card.setCode) || 0) + value);
      rarityValue.set(card.rarity, (rarityValue.get(card.rarity) || 0) + value);

      const colors = card.color.split("/").map((part) => part.trim()).filter(Boolean);
      const splitValue = colors.length ? value / colors.length : value;
      colors.forEach((color) => {
        colorValue.set(color, (colorValue.get(color) || 0) + splitValue);
      });
    });

    return {
      bySet: Array.from(setValue.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      byRarity: Array.from(rarityValue.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      byColor: Array.from(colorValue.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [allCardsById, collection, collectionEntries, priceMap]);

  const historyIds = useMemo(() => ownedIds.slice(0, 40), [ownedIds]);

  useEffect(() => {
    if (activeTab !== "portfolio" || !historyIds.length) return;

    let cancelled = false;
    setHistoryLoading(true);

    void Promise.all(
      historyIds.map(async (cardId) => {
        try {
          const res = await fetch(`/api/market/history?id=${encodeURIComponent(cardId)}&range=365d`, { cache: "no-store" });
          if (!res.ok) return [cardId, [] as PriceHistoryPoint[]] as const;
          const json = await res.json();
          return [cardId, Array.isArray(json.points) ? (json.points as PriceHistoryPoint[]) : ([] as PriceHistoryPoint[])] as const;
        } catch {
          return [cardId, [] as PriceHistoryPoint[]] as const;
        }
      }),
    )
      .then((pairs) => {
        if (cancelled) return;
        setHistoryMap(
          pairs.reduce<Record<string, PriceHistoryPoint[]>>((acc, [cardId, points]) => {
            acc[cardId] = points;
            return acc;
          }, {}),
        );
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, historyIds]);

  const portfolioValueAtDate = useCallback(
    (date: string) =>
      historyIds.reduce((totalValue, cardId) => {
        const quantity = collection[cardId]?.quantity || 0;
        if (!quantity) return totalValue;

        const points = historyMap[cardId] || [];
        let lastKnown = cardPrice(cardId, priceMap, collection) ?? 0;

        for (const point of points) {
          if (point.date > date) break;
          lastKnown = point.tcgMarket ?? point.ebayAvg ?? lastKnown;
        }

        return totalValue + lastKnown * quantity;
      }, 0),
    [collection, historyIds, historyMap, priceMap],
  );

  const portfolioSeries = useMemo(() => {
    const rangeDays = portfolioRangeDays(portfolioRange);
    const days = Array.from({ length: rangeDays }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (rangeDays - index - 1));
      return date.toISOString().slice(0, 10);
    });

    return days.map((date) => ({
      date,
      label: date.slice(5),
      value: Number(portfolioValueAtDate(date).toFixed(2)),
    }));
  }, [portfolioRange, portfolioValueAtDate]);

  const portfolioChange = useMemo(() => {
    if (portfolioSeries.length < 2) return { absolute: 0, percent: 0 };
    const first = portfolioSeries[0]?.value || 0;
    const last = portfolioSeries[portfolioSeries.length - 1]?.value || 0;
    const absolute = last - first;
    const percent = first > 0 ? (absolute / first) * 100 : 0;
    return {
      absolute,
      percent,
    };
  }, [portfolioSeries]);

  const portfolioChangeWindows = useMemo(() => {
    const current = totalCollectionValue;
    const buildWindow = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() - days);
      const previous = portfolioValueAtDate(date.toISOString().slice(0, 10));
      const absolute = current - previous;
      const percent = previous > 0 ? (absolute / previous) * 100 : 0;
      return { absolute, percent };
    };

    return {
      day1: buildWindow(1),
      day7: buildWindow(7),
      day30: buildWindow(30),
    };
  }, [portfolioValueAtDate, totalCollectionValue]);

  const portfolioMovers = useMemo(() => {
    const rows = historyIds
      .map((cardId) => {
        const card = allCardsById.get(cardId);
        const quantity = collection[cardId]?.quantity || 0;
        const points = historyMap[cardId] || [];
        const latest = cardPrice(cardId, priceMap, collection) ?? 0;
        const sevenDaysAgo = points.find((point) => point.date >= new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
        const prior = sevenDaysAgo ? sevenDaysAgo.tcgMarket ?? sevenDaysAgo.ebayAvg ?? latest : latest;
        const delta = latest - prior;
        const percent = prior > 0 ? (delta / prior) * 100 : 0;

        return card
          ? {
              cardId,
              name: card.name,
              setCode: card.setCode,
              quantity,
              currentPrice: latest,
              delta,
              percent,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      cardId: string;
      name: string;
      setCode: string;
      quantity: number;
      currentPrice: number;
      delta: number;
      percent: number;
    }>;

    return {
      gainers: [...rows].sort((a, b) => b.percent - a.percent).slice(0, 5),
      losers: [...rows].sort((a, b) => a.percent - b.percent).slice(0, 5),
    };
  }, [allCardsById, collection, historyIds, historyMap, priceMap]);

  const cardsNeeded = useMemo<NeededCardRow[]>(() => {
    const rows: NeededCardRow[] = [];

    savedDecks.forEach((deck) => {
      deck.cards.forEach((entry) => {
        const owned = collection[entry.cardId]?.quantity || 0;
        if (owned >= entry.quantity) return;
        const card = allCardsById.get(entry.cardId);
        rows.push({
          deckId: deck.id,
          deckName: deck.name,
          cardId: entry.cardId,
          cardName: card?.name || entry.cardId,
          needed: entry.quantity - owned,
          owned,
        });
      });
    });

    return rows.sort((a, b) => a.deckName.localeCompare(b.deckName) || a.cardName.localeCompare(b.cardName));
  }, [allCardsById, collection, savedDecks]);

  const recentActivity = useMemo(
    () =>
      Object.entries(recentAddedMap)
        .map(([cardId, iso]) => {
          const card = allCardsById.get(cardId);
          if (!card || !collection[cardId]) return null;
          return {
            cardId,
            name: card.name,
            date: iso,
            quantity: collection[cardId].quantity,
          };
        })
        .filter(Boolean)
        .sort((a, b) => Date.parse(b!.date) - Date.parse(a!.date))
        .slice(0, 8) as Array<{ cardId: string; name: string; date: string; quantity: number }>,
    [allCardsById, collection, recentAddedMap],
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedSets([]);
    setSelectedColors([]);
    setSelectedTypes([]);
    setSelectedRarities([]);
    setSelectedCounters([]);
    setSelectedAttributes([]);
    setCostMin("");
    setCostMax("");
    setPowerMin("");
    setPowerMax("");
    setPriceMin("");
    setPriceMax("");
    setOwnershipFilter("all");
    setSortMode("number");
    setPage(1);
  }, []);

  const updateQuantity = useCallback(
    (card: Card, delta: number) => {
      if (requireCollectionAccount(card)) return;
      const next = { ...collection };
      const current = next[card.id];
      const nextQuantity = Math.max(0, (current?.quantity || 0) + delta);

      if (nextQuantity <= 0) {
        delete next[card.id];
      } else {
        next[card.id] = {
          cardId: card.id,
          quantity: nextQuantity,
          price: current?.price ?? (cardPrice(card.id, priceMap, collection) ?? undefined),
          lastUpdated: current?.lastUpdated,
        };
      }

      persistCollection(next);

      if (delta > 0) {
        setRecentAddedMap((prev) => ({ ...prev, [card.id]: new Date().toISOString() }));
        setQuickAddCount((count) => count + delta);
        if (!current?.quantity && user) {
          void logProfileActivity({
            kind: "collection_add",
            title: `Added ${card.name}`,
            detail: `Added ${delta} copy of ${card.name} to the collection.`,
            cardId: card.id,
            publicVisible: true,
            dedupeKey: `collection_add:${card.id}:${new Date().toISOString().slice(0, 10)}`,
          }).catch(() => {
            // ignore profile activity failures
          });
        }
      }
    },
    [collection, persistCollection, priceMap, requireCollectionAccount, user],
  );

  const toggleTrade = useCallback(
    (cardId: string) => {
      if (requireCollectionAccount()) return;
      setTradeIds((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]));
    },
    [requireCollectionAccount],
  );

  const updateCondition = useCallback(
    (cardId: string, value: ConditionLabel) => {
      if (requireCollectionAccount()) return;
      setConditionMap((prev) => ({ ...prev, [cardId]: value }));
    },
    [requireCollectionAccount],
  );

  const toggleWishlist = useCallback(
    async (card: Card) => {
      if (requireCollectionAccount(card)) return;
      if (!user) return;

      const existing = wishlistByCardId.get(card.id);
      const previous = watchlistItems;

      if (existing) {
        setWatchlistItems((items) => items.filter((item) => item.watchId !== existing.watchId));
        const res = await fetchWithClientAuth(`/api/me/watchlist?watchId=${encodeURIComponent(existing.watchId)}`, {
          method: "DELETE",
          cache: "no-store",
        });
        if (!res.ok) {
          setWatchlistItems(previous);
          setActionNotice({ tone: "error", message: `We could not remove ${card.name} from your wishlist.` });
        }
        return;
      }

      const optimistic: WatchlistItem = {
        watchId: `temp-${card.id}`,
        cardId: card.id,
        variantKey: "base",
        targetPrice: null,
        alertPercent: null,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWatchlistItems((items) => [optimistic, ...items]);

      try {
        const res = await fetchWithClientAuth("/api/me/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id }),
        });
        if (!res.ok) throw new Error("Unable to save wishlist item");
        const json = await res.json();
        const nextItem = json.item as WatchlistItem | undefined;
        setWatchlistItems((items) => [nextItem || optimistic, ...items.filter((item) => item.watchId !== optimistic.watchId)]);
        void logProfileActivity({
          kind: "wishlist_add",
          title: `Wishlisted ${card.name}`,
          detail: `Added ${card.name} to the wishlist.`,
          cardId: card.id,
          publicVisible: true,
          dedupeKey: `wishlist:${card.id}`,
        }).catch(() => {
          // ignore profile activity failures
        });
      } catch {
        setWatchlistItems(previous);
        setActionNotice({ tone: "error", message: `We could not add ${card.name} to your wishlist.` });
      }
    },
    [requireCollectionAccount, user, watchlistItems, wishlistByCardId],
  );

  const refreshCollectionPrices = useCallback(async () => {
    if (!collectionEntries.length) return;

    setRefreshingCollectionPrices(true);
    const ids = collectionEntries.map((entry) => entry.cardId.toUpperCase());
    const nextCollection = { ...collection };

    for (let index = 0; index < ids.length; index += PRICE_BATCH_SIZE) {
      const batch = ids.slice(index, index + PRICE_BATCH_SIZE);
      try {
        const res = await fetch(`/api/cards/prices?ids=${encodeURIComponent(batch.join(","))}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to refresh collection prices");
        const json = await res.json();
        const results = Array.isArray(json.results) ? (json.results as PriceEntry[]) : [];

        results.forEach((entry) => {
          if (!nextCollection[entry.cardId]) return;
          nextCollection[entry.cardId] = {
            ...nextCollection[entry.cardId],
            price: entry.estimatedPrice,
            lastUpdated: entry.updatedAt || new Date().toISOString(),
          };
        });
      } catch {
        // ignore transient refresh failures
      }
    }

    persistCollection(nextCollection);
    setRefreshingCollectionPrices(false);
  }, [collection, collectionEntries, persistCollection]);

  const handleBulkImport = useCallback(() => {
    if (requireCollectionAccount()) return;
    const lines = bulkText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const next = { ...collection };
    const unmatched: string[] = [];
    let addedLines = 0;

    lines.forEach((line) => {
      const match = /^(\d+)\s*x?\s+([A-Za-z0-9-]+)$/i.exec(line.replace(/\s+/g, " "));
      if (!match) {
        unmatched.push(line);
        return;
      }

      const quantity = Math.max(1, Number(match[1]));
      const cardId = match[2].toUpperCase();
      const card = allCardsById.get(cardId);
      if (!card) {
        unmatched.push(line);
        return;
      }

      const existing = next[cardId];
      next[cardId] = {
        cardId,
        quantity: (existing?.quantity || 0) + quantity,
        price: existing?.price ?? (cardPrice(cardId, priceMap, collection) ?? undefined),
        lastUpdated: existing?.lastUpdated,
      };
      addedLines += 1;
      setRecentAddedMap((prev) => ({ ...prev, [cardId]: new Date().toISOString() }));
    });

    persistCollection(next);
    const result: BulkImportResult = { addedLines, unmatched };
    setBulkMessage({
      tone: result.unmatched.length ? "error" : "success",
      message: result.unmatched.length
        ? `Imported ${result.addedLines} lines. ${result.unmatched.length} lines could not be matched.`
        : `Imported ${result.addedLines} lines into your collection.`,
    });
  }, [allCardsById, bulkText, collection, persistCollection, priceMap, requireCollectionAccount]);

  const handleCsvUpload = useCallback(
    async (file: File) => {
      if (requireCollectionAccount()) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;

      const next = { ...collection };
      let imported = 0;

      lines.slice(1).forEach((line) => {
        const columns = line.split(",").map((value) => value.trim());
        const cardId = (columns[0] || columns[1] || "").toUpperCase();
        const quantity = Math.max(1, Number(columns[2] || columns[1] || 1));
        if (!cardId || !allCardsById.has(cardId)) return;

        const existing = next[cardId];
        next[cardId] = {
          cardId,
          quantity: (existing?.quantity || 0) + quantity,
          price: existing?.price ?? (cardPrice(cardId, priceMap, collection) ?? undefined),
          lastUpdated: existing?.lastUpdated,
        };
        imported += 1;
      });

      persistCollection(next);
      setBulkMessage({
        tone: "success",
        message: `Imported ${imported} rows from ${file.name}.`,
      });
    },
    [allCardsById, collection, persistCollection, priceMap, requireCollectionAccount],
  );

  const exportCollectionCsv = useCallback(() => {
    const rows = [
      ["cardId", "name", "set", "quantity", "condition", "currentPrice", "wishlist", "forTrade"].join(","),
      ...collectionEntries.map((entry) => {
        const card = allCardsById.get(entry.cardId);
        const currentPrice = cardPrice(entry.cardId, priceMap, collection) ?? 0;
        return [
          entry.cardId,
          `"${card?.name || entry.cardId}"`,
          `"${card?.setCode || ""}"`,
          entry.quantity,
          conditionMap[entry.cardId] || "NM",
          currentPrice.toFixed(2),
          wishlistByCardId.has(entry.cardId) ? "yes" : "no",
          tradeIds.includes(entry.cardId) ? "yes" : "no",
        ].join(",");
      }),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devilfruit-collection.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [allCardsById, collection, collectionEntries, conditionMap, priceMap, tradeIds, wishlistByCardId]);

  const renderFilters = (mobile = false) => {
    const wrapClass = mobile ? "space-y-4" : "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
    const sectionClass = mobile ? "rounded-2xl border border-white/10 bg-black/20 p-3" : "rounded-2xl border border-white/10 bg-black/20 p-3";

    return (
      <div className={wrapClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white">Filters</p>
            <p className="text-xs text-white/45">{activeFilterCount} active</p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70"
          >
            Clear All
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Set / Booster</p>
            <input
              value={setFilterQuery}
              onChange={(event) => setSetFilterQuery(event.target.value)}
              placeholder="Search sets"
              className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {visibleSetOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(option.value)}
                    onChange={() => {
                      setPage(1);
                      setSelectedSets((prev) =>
                        prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                      );
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              {!visibleSetOptions.length ? <p className="text-sm text-white/45">No sets match that search.</p> : null}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedColors((prev) => (prev.includes(color) ? prev.filter((value) => value !== color) : [...prev, color]));
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    selectedColors.includes(color)
                      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    selectedTypes.includes(type)
                      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Rarity / Special Print</p>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {rarityOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={selectedRarities.includes(option.value)}
                    onChange={() => {
                      setPage(1);
                      setSelectedRarities((prev) =>
                        prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                      );
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Counter</p>
            <div className="flex flex-wrap gap-2">
              {counterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedCounters((prev) =>
                      prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                    );
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    selectedCounters.includes(option.value)
                      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Attribute</p>
            <div className="flex flex-wrap gap-2">
              {attributeOptions.map((attribute) => (
                <button
                  key={attribute}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSelectedAttributes((prev) =>
                      prev.includes(attribute) ? prev.filter((value) => value !== attribute) : [...prev, attribute],
                    );
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    selectedAttributes.includes(attribute)
                      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                      : "border-white/10 bg-white/5 text-white/65"
                  }`}
                >
                  {attribute}
                </button>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Cost / Power</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={costMin}
                onChange={(event) => {
                  setPage(1);
                  setCostMin(clampNumberInput(event.target.value));
                }}
                placeholder="Min Cost"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                value={costMax}
                onChange={(event) => {
                  setPage(1);
                  setCostMax(clampNumberInput(event.target.value));
                }}
                placeholder="Max Cost"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                value={powerMin}
                onChange={(event) => {
                  setPage(1);
                  setPowerMin(clampNumberInput(event.target.value));
                }}
                placeholder="Min Power"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                value={powerMax}
                onChange={(event) => {
                  setPage(1);
                  setPowerMax(clampNumberInput(event.target.value));
                }}
                placeholder="Max Power"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className={sectionClass}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">Price / Ownership</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={priceMin}
                onChange={(event) => {
                  setPage(1);
                  setPriceMin(clampNumberInput(event.target.value));
                }}
                placeholder="Min Price"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                value={priceMax}
                onChange={(event) => {
                  setPage(1);
                  setPriceMax(clampNumberInput(event.target.value));
                }}
                placeholder="Max Price"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <select
                value={ownershipFilter}
                onChange={(event) => {
                  setPage(1);
                  setOwnershipFilter(event.target.value as OwnershipStatus);
                }}
                className="col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Cards</option>
                <option value="owned">Owned</option>
                <option value="not_owned">Not Owned</option>
                <option value="wishlist">Wishlist</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabBar = () => (
    <section className="flex flex-wrap gap-2">
      {TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black"
              : "border border-white/10 bg-white/[0.03] text-white/65 hover:text-white"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </section>
  );

  const renderDesktopFilterSection = ({
    id,
    label,
    count,
    children,
  }: {
    id: DesktopFilterKey;
    label: string;
    count?: number;
    children: ReactNode;
  }) => {
    const isOpen = desktopExpandedFilter === id;
    const isActive = Boolean(count);

    return (
      <div className="rounded-2xl border border-white/10 bg-black/20">
        <button
          type="button"
          onClick={() => setDesktopExpandedFilter((current) => (current === id ? null : id))}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
            isActive ? "bg-[var(--theme-accent)]/12 text-[var(--theme-accent-2)]" : "text-white/80"
          }`}
          aria-expanded={isOpen}
          aria-controls={`collection-filter-${id}`}
        >
          <span className="truncate text-sm font-bold">{label}</span>
          <div className="flex items-center gap-2">
            {count ? (
              <span className="rounded-full border border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/15 px-2 py-0.5 text-[10px] font-black text-[var(--theme-accent-2)]">
                {count}
              </span>
            ) : null}
            <ChevronRight className={`h-4 w-4 text-white/45 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              id={`collection-filter-${id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/10 px-4 py-3">{children}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  };

  const renderDesktopSidebar = () => (
    <aside className="hidden md:block md:w-[250px]">
      <div className="md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">
              {activeTab === "my_cards" ? "My Cards Filters" : "Browse Filters"}
            </p>
            <p className="mt-1 text-xs text-white/50">{activeFilterCount} active filters</p>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search cards..."
              className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
            />
          </div>

          <div className="space-y-2">
            {renderDesktopFilterSection({
              id: "set",
              label: "Set / Booster",
              count: desktopFilterCounts.set,
              children: (
                <div className="space-y-3">
                  <input
                    value={setFilterQuery}
                    onChange={(event) => setSetFilterQuery(event.target.value)}
                    placeholder="Search sets"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                    {visibleSetOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-white/75">
                        <input
                          type="checkbox"
                          checked={selectedSets.includes(option.value)}
                          onChange={() => {
                            setPage(1);
                            setSelectedSets((prev) =>
                              prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                            );
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                    {!visibleSetOptions.length ? <p className="text-sm text-white/45">No sets match that search.</p> : null}
                  </div>
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "color",
              label: "Color",
              count: desktopFilterCounts.color,
              children: (
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setSelectedColors((prev) => (prev.includes(color) ? prev.filter((value) => value !== color) : [...prev, color]));
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        selectedColors.includes(color)
                          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "type",
              label: "Type",
              count: desktopFilterCounts.type,
              children: (
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]));
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        selectedTypes.includes(type)
                          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "rarity",
              label: "Rarity / Special Print",
              count: desktopFilterCounts.rarity,
              children: (
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {rarityOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-white/75">
                      <input
                        type="checkbox"
                        checked={selectedRarities.includes(option.value)}
                        onChange={() => {
                          setPage(1);
                          setSelectedRarities((prev) =>
                            prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                          );
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "counter",
              label: "Counter",
              count: desktopFilterCounts.counter,
              children: (
                <div className="flex flex-wrap gap-2">
                  {counterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setSelectedCounters((prev) =>
                          prev.includes(option.value) ? prev.filter((value) => value !== option.value) : [...prev, option.value],
                        );
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        selectedCounters.includes(option.value)
                          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "attribute",
              label: "Attribute",
              count: desktopFilterCounts.attribute,
              children: (
                <div className="flex flex-wrap gap-2">
                  {attributeOptions.map((attribute) => (
                    <button
                      key={attribute}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setSelectedAttributes((prev) =>
                          prev.includes(attribute) ? prev.filter((value) => value !== attribute) : [...prev, attribute],
                        );
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        selectedAttributes.includes(attribute)
                          ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {attribute}
                    </button>
                  ))}
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "costPower",
              label: "Cost / Power",
              count: desktopFilterCounts.costPower,
              children: (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={costMin}
                    onChange={(event) => {
                      setPage(1);
                      setCostMin(clampNumberInput(event.target.value));
                    }}
                    placeholder="Min Cost"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={costMax}
                    onChange={(event) => {
                      setPage(1);
                      setCostMax(clampNumberInput(event.target.value));
                    }}
                    placeholder="Max Cost"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={powerMin}
                    onChange={(event) => {
                      setPage(1);
                      setPowerMin(clampNumberInput(event.target.value));
                    }}
                    placeholder="Min Power"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={powerMax}
                    onChange={(event) => {
                      setPage(1);
                      setPowerMax(clampNumberInput(event.target.value));
                    }}
                    placeholder="Max Power"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>
              ),
            })}

            {renderDesktopFilterSection({
              id: "priceOwnership",
              label: "Price / Ownership",
              count: desktopFilterCounts.priceOwnership,
              children: (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={priceMin}
                      onChange={(event) => {
                        setPage(1);
                        setPriceMin(clampNumberInput(event.target.value));
                      }}
                      placeholder="Min Price"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={priceMax}
                      onChange={(event) => {
                        setPage(1);
                        setPriceMax(clampNumberInput(event.target.value));
                      }}
                      placeholder="Max Price"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <select
                    value={ownershipFilter}
                    onChange={(event) => {
                      setPage(1);
                      setOwnershipFilter(event.target.value as OwnershipStatus);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    <option value="all">All Cards</option>
                    <option value="owned">Owned</option>
                    <option value="not_owned">Not Owned</option>
                    <option value="wishlist">Wishlist</option>
                  </select>
                </div>
              ),
            })}

            {activeTab === "browse"
              ? renderDesktopFilterSection({
                  id: "sort",
                  label: "Sort",
                  count: desktopFilterCounts.sort,
                  children: (
                    <select
                      value={sortMode}
                      onChange={(event) => {
                        setPage(1);
                        setSortMode(event.target.value as BrowseSort);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    >
                      <option value="number">Card Number</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="name_asc">Name: A–Z</option>
                      <option value="name_desc">Name: Z–A</option>
                      <option value="rarity">Rarity</option>
                      <option value="recent">Recently Added</option>
                    </select>
                  ),
                })
              : null}
          </div>

          {activeFilterCount ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/75"
            >
              Clear All Filters
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );

  const usesSidebarLayout = activeTab === "browse" || activeTab === "my_cards";

  const renderMyCardsSection = () => (
    <AnimatePresence mode="wait">
      <motion.section
        key="my-cards"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="space-y-4"
      >
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-white">Owned Cards List</p>
              <p className="mt-1 text-sm text-white/45">Compact, value-first view of every card currently tracked in your collection.</p>
            </div>
            <div className="w-full max-w-xs">
              <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">
                Sort
                <select
                  value={myCardsSort}
                  onChange={(event) => setMyCardsSort(event.target.value as MyCardsSort)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"
                >
                  {MY_CARDS_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Unique Cards</p>
              <p className="mt-1 text-2xl font-black text-white">{uniqueCardsOwned.toLocaleString()}</p>
              <p className="text-xs text-white/45">{myCardsRows.length.toLocaleString()} currently match your filters</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Total Cards</p>
              <p className="mt-1 text-2xl font-black text-white">{totalCardsOwned.toLocaleString()}</p>
              <p className="text-xs text-white/45">Counted with quantities included</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Collection Value</p>
              <p className="mt-1 text-2xl font-black text-[#F0C040]">{formatCurrency(totalCollectionValue)}</p>
              <p className="text-xs text-white/45">Estimated from current card pricing</p>
            </div>
          </div>
        </section>

        {!user ? (
          <section className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
            <p className="text-xl font-black text-white">Log in to see your collection.</p>
            <p className="mt-2 text-sm text-white/50">Your owned-card list is account-backed and only appears once you are signed in.</p>
            <button
              type="button"
              onClick={() => router.push(buildLoginUrl("/collection?tab=my_cards"))}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 px-5 text-sm font-bold text-[var(--theme-accent-2)]"
            >
              Log In / Sign Up
            </button>
          </section>
        ) : !collectionEntries.length ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
            <p className="text-xl font-black text-white">Your collection is empty. Start adding cards from the Browse tab!</p>
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white/75"
            >
              Open Browse
            </button>
          </section>
        ) : !myCardsRows.length ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
            <p className="text-xl font-black text-white">No owned cards match the current filters.</p>
            <p className="mt-2 text-sm text-white/50">Adjust the search or clear the active filters to bring cards back into view.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white/75"
            >
              Clear Filters
            </button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="hidden grid-cols-[48px_minmax(0,2.1fr)_92px_72px_100px_70px_156px_92px_110px] items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/40 md:grid">
              <span>Card</span>
              <span>Name</span>
              <span>Number</span>
              <span>Set</span>
              <span>Type</span>
              <span>Rarity</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            <div className="divide-y divide-white/6">
              {myCardsRows.map((row, index) => (
                <div
                  key={row.card.id}
                  className={`transition-colors hover:bg-white/[0.05] ${
                    index % 2 === 0 ? "bg-white/[0.025]" : "bg-black/10"
                  }`}
                >
                  <div className="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 md:hidden">
                    <button
                      type="button"
                      onClick={() => openModal(row.card)}
                      aria-label={`Open ${row.card.name} details`}
                      className="overflow-hidden rounded-lg border border-white/10"
                    >
                      <CatalogCardArt cardId={row.card.id} alt={row.card.name} className="aspect-[63/88] w-[46px]" />
                    </button>

                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight text-white">{row.card.name}</p>
                      <p className="mt-1 text-[11px] text-white/45">
                        {row.card.id} · {row.card.setCode} · {row.card.type} · {row.card.rarity}
                      </p>
                      <p className="mt-1 text-[11px] text-white/55">
                        {typeof row.price === "number" ? `${formatCurrency(row.price)} each` : "Price unavailable"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-black text-[#F0C040]">
                        {typeof row.totalValue === "number" ? formatCurrency(row.totalValue) : "—"}
                      </p>
                      <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/25 p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(row.card, -1)}
                          aria-label={`Remove one ${row.card.name}`}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 text-center text-sm font-black text-white">×{row.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(row.card, 1)}
                          aria-label={`Add one ${row.card.name}`}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[48px_minmax(0,2.1fr)_92px_72px_100px_70px_156px_92px_110px] items-center gap-3 px-4 py-3 md:grid">
                    <button
                      type="button"
                      onClick={() => openModal(row.card)}
                      aria-label={`Open ${row.card.name} details`}
                      className="overflow-hidden rounded-lg border border-white/10"
                    >
                      <CatalogCardArt cardId={row.card.id} alt={row.card.name} className="aspect-[63/88] w-12" />
                    </button>

                    <p className="pr-3 text-sm font-black leading-tight text-white">{row.card.name}</p>
                    <p className="text-xs text-white/60">{row.card.id}</p>
                    <p className="text-xs text-white/60">{row.card.setCode}</p>
                    <p className="text-xs text-white/60">{row.card.type}</p>
                    <div>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/75">
                        {row.card.rarity}
                      </span>
                    </div>
                    <div className="justify-self-end">
                      <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/25 p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(row.card, -1)}
                          aria-label={`Remove one ${row.card.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-10 text-center text-sm font-black text-white">×{row.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(row.card, 1)}
                          aria-label={`Add one ${row.card.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-right text-sm font-bold text-white/75">
                      {typeof row.price === "number" ? formatCurrency(row.price) : "—"}
                    </p>
                    <p className="text-right text-sm font-black text-[#F0C040]">
                      {typeof row.totalValue === "number" ? formatCurrency(row.totalValue) : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </motion.section>
    </AnimatePresence>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      <CardModal card={modalCard} onClose={() => setModalCard(null)} />

      <section className="rounded-3xl border border-[var(--color-parchment-dark)] bg-[var(--color-parchment)] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
              <Package className="h-3.5 w-3.5" /> Personal Collection
            </div>
            <h1 className="mt-3 text-4xl font-black text-[var(--color-navy)] md:text-5xl">
              Collection <span className="text-[var(--color-gold-dark)]">Command Center</span>
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[var(--color-text-mid)] md:text-base">
              Browse the full catalog, track what you own, map set completion, monitor value, and spot the cards your decks still need.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-light)]">
              {user ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Loader2 className={`h-3.5 w-3.5 ${storageReady ? "text-[var(--color-text-light)]" : "animate-spin text-[var(--color-text-light)]"}`} />}
              {storageReady ? storageLabel : "Checking collection storage"}
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Collection Value</p>
              <p className="mt-1 text-3xl font-black text-[var(--color-gold-dark)]">{totalCollectionValue > 0 ? formatCurrency(totalCollectionValue) : "—"}</p>
              <p className="text-xs text-[var(--color-text-light)]">{priceMap.size ? "Live estimate from cached prices + placeholders" : "Loading price coverage"}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Owned Cards</p>
              <p className="mt-1 text-3xl font-black text-[var(--color-navy)]">{totalCardsOwned}</p>
              <p className="text-xs text-[var(--color-text-light)]">{uniqueCardsOwned} unique cards</p>
            </div>
          </div>
        </div>

        {actionNotice ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              actionNotice.tone === "success"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/20 bg-red-500/10 text-red-200"
            }`}
          >
            {actionNotice.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Browse Coverage</p>
            <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{catalogCards.length.toLocaleString()}</p>
            <p className="text-xs text-[var(--color-text-light)]">Official prints in the catalog</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Wishlist</p>
            <p className="mt-1 text-2xl font-black text-pink-300">{watchlistItems.length}</p>
            <p className="text-xs text-white/45">{watchlistLoading ? "Loading watchlist" : "Tracked wanted cards"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Price Cache</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{priceProgress.done}/{priceProgress.total || catalogCards.length}</p>
            <p className="text-xs text-white/45">{priceLoading ? "Loading price estimates" : "Price map ready"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Deck Shortages</p>
            <p className="mt-1 text-2xl font-black text-white">{cardsNeeded.length}</p>
            <p className="text-xs text-white/45">Collection gaps across saved decks</p>
          </div>
        </div>
      </section>

      {usesSidebarLayout ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search by card name, set, effect text, or card ID..."
                className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-9 pr-3 text-sm text-white placeholder:text-white/35"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white md:hidden"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount ? <span className="rounded-full bg-[var(--theme-accent)] px-2 py-0.5 text-[10px] font-black text-black">{activeFilterCount}</span> : null}
              </button>
              <select
                value={activeTab === "my_cards" ? myCardsSort : sortMode}
                onChange={(event) => {
                  if (activeTab === "my_cards") {
                    setMyCardsSort(event.target.value as MyCardsSort);
                  } else {
                    setPage(1);
                    setSortMode(event.target.value as BrowseSort);
                  }
                }}
                className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white"
              >
                {(activeTab === "my_cards"
                  ? MY_CARDS_SORT_OPTIONS
                  : [
                      { value: "number", label: "Card Number" },
                      { value: "price_desc", label: "Price: High to Low" },
                      { value: "price_asc", label: "Price: Low to High" },
                      { value: "name_asc", label: "Name: A–Z" },
                      { value: "name_desc", label: "Name: Z–A" },
                      { value: "rarity", label: "Rarity" },
                      { value: "recent", label: "Recently Added" },
                    ]
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {activeTab === "browse" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setQuickAddMode((value) => !value)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${
                      quickAddMode ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]" : "border-white/10 bg-black/25 text-white/70"
                    }`}
                  >
                    <WandSparkles className="h-4 w-4" />
                    Quick Add
                    {quickAddCount ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{quickAddCount}</span> : null}
                  </button>
                  <button
                    type="button"
                    onClick={refreshCollectionPrices}
                    disabled={!collectionEntries.length || refreshingCollectionPrices}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white/70 disabled:opacity-40"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingCollectionPrices ? "animate-spin" : ""}`} />
                    Refresh Prices
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {usesSidebarLayout ? (
        <section className="md:grid md:grid-cols-[250px_minmax(0,1fr)] md:items-start md:gap-6">
          {renderDesktopSidebar()}
          <div className="space-y-4">
            {renderTabBar()}

            {activeTab === "browse" ? (
              <>
                <section className="hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:block">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{filteredCards.length.toLocaleString()} cards match the current view</p>
                      <p className="text-sm text-white/45">Filters stay pinned on the left while you browse.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickAddMode((value) => !value)}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${
                          quickAddMode ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 text-[var(--theme-accent-2)]" : "border-white/10 bg-black/25 text-white/70"
                        }`}
                      >
                        <WandSparkles className="h-4 w-4" />
                        Quick Add
                        {quickAddCount ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{quickAddCount}</span> : null}
                      </button>
                      <button
                        type="button"
                        onClick={refreshCollectionPrices}
                        disabled={!collectionEntries.length || refreshingCollectionPrices}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-bold text-white/70 disabled:opacity-40"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingCollectionPrices ? "animate-spin" : ""}`} />
                        Refresh Prices
                      </button>
                    </div>
                  </div>
                </section>

                <AnimatePresence mode="wait">
                  <motion.section
                    key="browse"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                <div className="flex items-center justify-between gap-3 md:hidden">
                  <div>
                    <p className="text-sm font-black text-white">{filteredCards.length.toLocaleString()} cards match the current view</p>
                    <p className="text-sm text-white/50">
                      {ownershipFilter === "all" ? "Full catalog browse" : ownershipFilter === "owned" ? "Owned-card view" : ownershipFilter === "wishlist" ? "Wishlist view" : "Unowned cards only"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/45">
                    <p>Page {safeBrowsePage} / {totalBrowsePages}</p>
                    <p>{priceLoading ? "Pricing still loading in the background" : "Pricing ready"}</p>
                  </div>
                </div>

                <div className="hidden items-center justify-between gap-3 md:flex">
                  <div>
                    <p className="text-sm font-black text-white">{filteredCards.length.toLocaleString()} cards match the current view</p>
                    <p className="text-sm text-white/50">
                      {ownershipFilter === "all" ? "Full catalog browse" : ownershipFilter === "owned" ? "Owned-card view" : ownershipFilter === "wishlist" ? "Wishlist view" : "Unowned cards only"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/45">
                    <p>Page {safeBrowsePage} / {totalBrowsePages}</p>
                    <p>{priceLoading ? "Pricing still loading in the background" : "Pricing ready"}</p>
                  </div>
                </div>

                {catalogLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-14 text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-white/20" />
                    <p className="mt-4 text-sm text-white/55">Loading the card catalog...</p>
                  </div>
                ) : catalogError ? (
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-10 text-center text-red-200">
                    {catalogError}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                    {browseCards.map((card) => {
                      const owned = collection[card.id]?.quantity || 0;
                      const condition = conditionMap[card.id] || "NM";
                      const isWishlisted = wishlistByCardId.has(card.id);
                      const isTradeCard = tradeIds.includes(card.id);
                      const livePrice = cardPrice(card.id, priceMap, collection);

                      return (
                        <motion.article
                          key={card.id}
                          layout
                          className={`group relative overflow-hidden rounded-2xl border p-2 transition-all ${
                            owned > 0
                              ? "border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/5"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (quickAddMode) {
                                  updateQuantity(card, 1);
                                  return;
                                }
                                openModal(card);
                              }}
                              aria-label={quickAddMode ? `Quick add ${card.name}` : `Open ${card.name} details`}
                              className="block w-full"
                            >
                              <CatalogCardArt cardId={card.id} alt={card.name} className="aspect-[63/88] w-full rounded-xl border border-white/10" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void toggleWishlist(card)}
                              aria-label={isWishlisted ? `Remove ${card.name} from wishlist` : `Add ${card.name} to wishlist`}
                              className={`absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                                isWishlisted ? "border-pink-400/40 bg-pink-500/15 text-pink-300" : "border-white/10 bg-black/45 text-white/60"
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
                            </button>

                            {owned > 0 ? (
                              <div className="absolute left-2 top-2 rounded-full bg-[var(--theme-accent)] px-2 py-0.5 text-[10px] font-black text-black">
                                Owned {owned}
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-2 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-white">{card.name}</p>
                                <p className="truncate text-[11px] text-white/45">
                                  {card.id} · {card.setCode} · {card.type}
                                </p>
                              </div>
                              {isTradeCard ? <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-300">Trade</span> : null}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/75">{card.rarity}</span>
                              <span className="font-bold text-[#F0C040]">{typeof livePrice === "number" ? formatCurrency(livePrice) : "—"}</span>
                            </div>

                            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                              <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(card, -1)}
                                  aria-label={`Remove one ${card.name}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-10 text-center text-sm font-black text-white">{owned}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(card, 1)}
                                  aria-label={`Add one ${card.name}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleTrade(card.id)}
                                disabled={owned <= 0}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70 disabled:opacity-30"
                              >
                                Trade
                              </button>
                            </div>

                            {owned > 0 ? (
                              <select
                                value={condition}
                                onChange={(event) => updateCondition(card.id, event.target.value as ConditionLabel)}
                                className="mt-2 min-h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white"
                                aria-label={`Condition for ${card.name}`}
                              >
                                {CONDITION_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}

                {!catalogLoading && !browseCards.length ? (
                  <div className="rounded-3xl border border-dashed border-white/15 px-5 py-12 text-center">
                    <p className="text-lg font-black text-white">No cards match this filter set</p>
                    <p className="mt-2 text-sm text-white/50">Adjust the filters or clear the current view.</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={safeBrowsePage <= 1}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalBrowsePages, value + 1))}
                    disabled={safeBrowsePage >= totalBrowsePages}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
                  </motion.section>
                </AnimatePresence>
              </>
            ) : (
              renderMyCardsSection()
            )}
          </div>
        </section>
      ) : (
        <>
          {renderTabBar()}
          <AnimatePresence mode="wait">
            {activeTab === "completion" ? (
              <motion.section
                key="completion"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Overall Completion</p>
                    <p className="mt-1 text-3xl font-black text-[#F0C040]">
                      {setSummaries.length ? Math.round((ownedSlotKeys.size / setSummaries.reduce((sum, row) => sum + row.totalSlots, 0)) * 100) : 0}%
                    </p>
                    <p className="text-xs text-white/45">{ownedSlotKeys.size} unique numbered slots owned</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Unique Owned</p>
                    <p className="mt-1 text-3xl font-black text-white">{uniqueCardsOwned}</p>
                    <p className="text-xs text-white/45">{totalCardsOwned} total cards tracked</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Set Value</p>
                    <p className="mt-1 text-3xl font-black text-emerald-300">{formatCurrency(totalCollectionValue)}</p>
                    <p className="text-xs text-white/45">Across all owned sets</p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {setSummaries.map((setSummary) => {
                      const percent = setSummary.totalSlots ? Math.round((setSummary.ownedSlots / setSummary.totalSlots) * 100) : 0;
                      return (
                        <button
                          key={setSummary.setCode}
                          type="button"
                          onClick={() => setSelectedSetCode(setSummary.setCode)}
                          className={`overflow-hidden rounded-2xl border text-left ${
                            selectedSetCode === setSummary.setCode
                              ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/8"
                              : "border-white/10 bg-black/20"
                          }`}
                        >
                          <div className="relative h-28">
                            <CatalogCardArt cardId={setSummary.sampleCardId} alt={setSummary.setName} className="h-full w-full" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-3">
                              <p className="text-sm font-black text-white">{setSummary.setCode}</p>
                              <p className="text-[11px] text-white/55">{setSummary.setName}</p>
                            </div>
                          </div>
                          <div className="space-y-2 p-3">
                            <div className="h-2 rounded-full bg-white/10">
                              <div className="h-2 rounded-full bg-[var(--theme-accent)]" style={{ width: `${percent}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-xs text-white/60">
                              <span>{setSummary.ownedSlots}/{setSummary.totalSlots}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-white/45">
                              <span>{setSummary.ownedQuantity} owned</span>
                              <span>{formatCurrency(setSummary.value)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-white">{selectedSetSummary?.setCode || "Set detail"}</p>
                        <p className="text-sm text-white/45">{selectedSetSummary?.setName || "Pick a set to inspect completion."}</p>
                      </div>
                      {selectedSetSummary ? (
                        <div className="text-right text-sm">
                          <p className="font-black text-[#F0C040]">{selectedSetSummary.ownedSlots}/{selectedSetSummary.totalSlots}</p>
                          <p className="text-white/45">{selectedSetSummary.totalSlots ? Math.round((selectedSetSummary.ownedSlots / selectedSetSummary.totalSlots) * 100) : 0}% complete</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                      {selectedSetCards.map((card) => {
                        const owned = ownedSlotKeys.has(setSlotKey(card));
                        return (
                          <button
                            key={setSlotKey(card)}
                            type="button"
                            onMouseEnter={() => setHoveredSetCardId(card.id)}
                            onFocus={() => setHoveredSetCardId(card.id)}
                            onClick={() => openModal(card)}
                            className={`aspect-square rounded-xl border text-center text-[10px] font-bold ${
                              owned ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/20 text-[var(--theme-accent-2)]" : "border-white/10 bg-black/30 text-white/45"
                            }`}
                            title={`${card.number} · ${card.name}`}
                          >
                            <span className="block truncate px-1 pt-2">{card.number}</span>
                          </button>
                        );
                      })}
                    </div>

                    {hoveredSetCard ? (
                      <div className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <CatalogCardArt cardId={hoveredSetCard.id} alt={hoveredSetCard.name} className="aspect-[63/88] w-[72px] rounded-xl" />
                        <div>
                          <p className="text-sm font-black text-white">{hoveredSetCard.name}</p>
                          <p className="text-xs text-white/45">{hoveredSetCard.id} · {hoveredSetCard.rarity}</p>
                          <p className="mt-2 text-xs text-white/55">
                            {ownedSlotKeys.has(setSlotKey(hoveredSetCard)) ? "Owned" : "Missing"} · {hoveredSetCard.type}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-white/45">Hover a heatmap slot to preview the card.</p>
                    )}
                  </div>
                </div>
              </motion.section>
            ) : null}

        {activeTab === "portfolio" ? (
          <motion.section
            key="portfolio"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Total Value</p>
                <p className="mt-1 text-3xl font-black text-[#F0C040]">{totalCollectionValue > 0 ? formatCurrency(totalCollectionValue) : "—"}</p>
                <p className="text-xs text-white/45">Current mark across tracked cards</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Value Change</p>
                <p className={`mt-1 text-3xl font-black ${portfolioChange.absolute >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {portfolioChange.absolute >= 0 ? "+" : ""}{formatCurrency(portfolioChange.absolute)}
                </p>
                <p className="text-xs text-white/45">{portfolioRange} range · {portfolioChange.percent.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Cards Owned</p>
                <p className="mt-1 text-3xl font-black text-white">{totalCardsOwned}</p>
                <p className="text-xs text-white/45">{uniqueCardsOwned} unique cards</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Historical Coverage</p>
                <p className="mt-1 text-3xl font-black text-white">{historyIds.length}</p>
                <p className="text-xs text-white/45">Top holdings sampled for price history</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "24H", value: portfolioChangeWindows.day1 },
                { label: "7D", value: portfolioChangeWindows.day7 },
                { label: "30D", value: portfolioChangeWindows.day30 },
              ].map((window) => (
                <div key={window.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{window.label} Change</p>
                  <p className={`mt-1 text-2xl font-black ${window.value.absolute >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {window.value.absolute >= 0 ? "+" : ""}
                    {formatCurrency(window.value.absolute)}
                  </p>
                  <p className="text-xs text-white/45">{window.value.percent.toFixed(1)}%</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">Collection Value Chart</p>
                  <p className="text-sm text-white/45">Aggregated from cached card price history. Sparse historical data will flatten older dates.</p>
                </div>
                <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["7d", "30d", "90d", "365d"] as PortfolioRange[]).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setPortfolioRange(range)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
                        portfolioRange === range ? "bg-[var(--theme-accent)] text-black" : "text-white/60"
                      }`}
                    >
                      {range === "365d" ? "1Y" : range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72">
                {historyLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/45">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building portfolio history...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioSeries}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value)}`} />
                      <RechartsTooltip
                        contentStyle={{
                          background: "#07111d",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "14px",
                          color: "#fff",
                        }}
                        formatter={(value) => formatTooltipCurrency(value)}
                      />
                      <Line type="monotone" dataKey="value" stroke="#f0c040" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-lg font-black text-white">Top Gainers</p>
                <div className="mt-3 space-y-2">
                  {portfolioMovers.gainers.length ? portfolioMovers.gainers.map((row) => (
                    <div key={row.cardId} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <CatalogCardArt cardId={row.cardId} alt={row.name} className="aspect-[63/88] w-11 rounded-lg" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{row.name}</p>
                        <p className="text-xs text-white/45">{row.setCode} · {formatCurrency(row.currentPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-300">+{row.percent.toFixed(1)}%</p>
                        <p className="text-xs text-white/45">+{formatCurrency(row.delta)}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/45">No gainers yet. Price history needs more snapshots.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-lg font-black text-white">Top Losers</p>
                <div className="mt-3 space-y-2">
                  {portfolioMovers.losers.length ? portfolioMovers.losers.map((row) => (
                    <div key={row.cardId} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <CatalogCardArt cardId={row.cardId} alt={row.name} className="aspect-[63/88] w-11 rounded-lg" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{row.name}</p>
                        <p className="text-xs text-white/45">{row.setCode} · {formatCurrency(row.currentPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-red-300">{row.percent.toFixed(1)}%</p>
                        <p className="text-xs text-white/45">{formatCurrency(row.delta)}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/45">No losers yet. Price history needs more snapshots.</p>}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {[
                { title: "Value by Set", data: portfolioBreakdown.bySet },
                { title: "Value by Rarity", data: portfolioBreakdown.byRarity },
                { title: "Value by Color", data: portfolioBreakdown.byColor },
              ].map((chart) => (
                <div key={chart.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-lg font-black text-white">{chart.title}</p>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {chart.title === "Value by Rarity" ? (
                        <PieChart>
                          <Pie data={chart.data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={82}>
                            {chart.data.map((entry, index) => (
                              <Cell key={`${entry.label}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatTooltipCurrency(value)} />
                          <Legend />
                        </PieChart>
                      ) : (
                        <BarChart data={chart.data}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="label" stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.35)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value)}`} />
                          <RechartsTooltip
                            formatter={(value) => formatTooltipCurrency(value)}
                            contentStyle={{
                              background: "#07111d",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "14px",
                            }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#f0c040" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}

        {activeTab === "wishlist" ? (
          <motion.section
            key="wishlist"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Wanted Cards</p>
                <p className="mt-1 text-3xl font-black text-pink-300">{watchlistItems.length}</p>
                <p className="text-xs text-white/45">Tracked through your watchlist</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Wishlist Value</p>
                <p className="mt-1 text-3xl font-black text-[#F0C040]">
                  {formatCurrency(
                    watchlistItems.reduce((sum, item) => sum + (cardPrice(item.cardId, priceMap, collection) ?? 0), 0),
                  )}
                </p>
                <p className="text-xs text-white/45">Current estimated buy-in</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Quick Browse Filter</p>
                <button
                  type="button"
                  onClick={() => {
                    setOwnershipFilter("wishlist");
                    setActiveTab("browse");
                  }}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70"
                >
                  Open Wishlist View <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!user ? (
              <PlaceholderCard
                title="Wishlist requires an account"
                body="The watchlist API already exists, but it is authenticated. Sign in to save and manage wanted cards."
              />
            ) : watchlistItems.length === 0 ? (
              <PlaceholderCard
                title="Your wishlist is empty"
                body="Tap the heart on any browse card to add it here and track its current price."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {watchlistItems.map((item) => {
                  const card = allCardsById.get(item.cardId);
                  if (!card) return null;
                  const owned = collection[item.cardId]?.quantity || 0;
                  const price = cardPrice(item.cardId, priceMap, collection);

                  return (
                    <div key={item.watchId} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="grid grid-cols-[72px_1fr] gap-3">
                        <button type="button" onClick={() => openModal(card)}>
                          <CatalogCardArt cardId={card.id} alt={card.name} className="aspect-[63/88] w-[72px] rounded-xl" />
                        </button>
                        <div>
                          <p className="text-sm font-black text-white">{card.name}</p>
                          <p className="text-xs text-white/45">{card.id} · {card.setCode}</p>
                          <p className="mt-2 text-sm font-bold text-[#F0C040]">{typeof price === "number" ? formatCurrency(price) : "—"}</p>
                          <p className="text-xs text-white/45">{owned > 0 ? `Owned ${owned}` : "Not owned yet"}</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(card, 1)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/70"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleWishlist(card)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink-400/25 bg-pink-500/10 px-3 text-xs font-bold text-pink-300"
                            >
                              <Heart className="h-3.5 w-3.5 fill-current" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        ) : null}

        {activeTab === "needed" ? (
          <motion.section
            key="needed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Cards Needed</p>
                <p className="mt-1 text-3xl font-black text-white">{cardsNeeded.reduce((sum, row) => sum + row.needed, 0)}</p>
                <p className="text-xs text-white/45">Missing copies across saved decks</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Affected Decks</p>
                <p className="mt-1 text-3xl font-black text-[#F0C040]">{new Set(cardsNeeded.map((row) => row.deckId)).size}</p>
                <p className="text-xs text-white/45">Saved decks with shortages</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Shopping Shortcut</p>
                <button
                  type="button"
                  onClick={() => {
                    const text = cardsNeeded.map((row) => `${row.needed}x ${row.cardId} ${row.cardName}`).join("\n");
                    void navigator.clipboard.writeText(text);
                    setActionNotice({ tone: "success", message: "Copied the cards-needed list to your clipboard." });
                    window.setTimeout(() => setActionNotice(null), 1800);
                  }}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70"
                >
                  <ClipboardList className="h-4 w-4" />
                  Copy List
                </button>
              </div>
            </div>

            {!cardsNeeded.length ? (
              <PlaceholderCard
                title="Your decks are fully covered"
                body="No shortages detected across the decks loaded from your current account/local deck storage."
              />
            ) : (
              <div className="space-y-3">
                {cardsNeeded.map((row) => (
                  <div key={`${row.deckId}-${row.cardId}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{row.cardName}</p>
                        <p className="text-xs text-white/45">{row.deckName} · {row.cardId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-red-300">Need {row.needed}</p>
                        <p className="text-xs text-white/45">Owned {row.owned}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        ) : null}

        {activeTab === "tools" ? (
          <motion.section
            key="tools"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-[#F0C040]" />
                  <p className="text-lg font-black text-white">Quick Add / Bulk Text Import</p>
                </div>
                <p className="mt-2 text-sm text-white/50">Paste lines like `4x OP01-025` or `1 ST01-001` and import them directly.</p>
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  className="mt-3 min-h-44 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white"
                  placeholder={"4x OP01-025\n2 ST01-001"}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--theme-accent)] bg-[var(--theme-accent)]/15 px-4 text-sm font-bold text-[var(--theme-accent-2)]"
                  >
                    <Upload className="h-4 w-4" />
                    Import Text
                  </button>
                  <button
                    type="button"
                    onClick={exportCollectionCsv}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70">
                    <Upload className="h-4 w-4" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleCsvUpload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                {bulkMessage ? (
                  <div
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                      bulkMessage.tone === "success"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    {bulkMessage.message}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-300" />
                    <p className="text-lg font-black text-white">Trade Binder</p>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    Cards marked `Trade` in browse appear here. Public trade URLs are not wired yet because username + profile privacy infrastructure does not exist yet.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {tradeIds.length ? tradeIds.map((cardId) => {
                      const card = allCardsById.get(cardId);
                      if (!card) return null;
                      return (
                        <div key={cardId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white">
                          {card.name}
                        </div>
                      );
                    }) : <p className="text-sm text-white/45">No trade cards marked yet.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <BadgeDollarSign className="h-4 w-4 text-emerald-300" />
                    <p className="text-lg font-black text-white">Recent Activity</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recentActivity.length ? recentActivity.map((row) => (
                      <div key={row.cardId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75">
                        Added {row.name} · {row.quantity} copies · {formatAge(row.date)}
                      </div>
                    )) : <p className="text-sm text-white/45">Add cards to start your activity feed.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <PlaceholderCard
                title="Public Collection Profiles"
                body="Not fully wired. This needs persisted public usernames plus a collection visibility setting before `/collection/[username]` can be real."
              />
              <PlaceholderCard
                title="Collection Comparison"
                body="Not fully wired. This depends on public profile identity and visibility controls so users can safely compare collections."
              />
              <PlaceholderCard
                title="Share Stats Image"
                body="Not fully wired. The page has the necessary current stats, but client-side image export still needs a dedicated renderer/template."
              />
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
        </>
      )}

      <MobileDrawer open={mobileFiltersOpen} title="Collection Filters" onClose={() => setMobileFiltersOpen(false)}>
        {renderFilters(true)}
      </MobileDrawer>
    </div>
  );
}

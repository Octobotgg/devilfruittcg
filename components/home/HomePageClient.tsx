"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Coins, Compass, Crown, ScrollText, Sparkles, TrendingUp } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";
import DonButton from "@/components/ui/DonButton";
import TiltCard from "@/components/ui/TiltCard";
import BrandMark from "@/components/BrandMark";
import type { Card } from "@/lib/cards";
import { displayCardId } from "@/lib/cards";
import type { CardPriceQuote } from "@/lib/card-price-quotes";
import { isSpecialPrintVariant, specialPrintPriority } from "@/lib/card-variants";
import { normalizePricingLookupId } from "@/lib/deck-pricing";
import {
  HOME_META_FORMAT,
  HOME_META_RANGE,
  HOME_META_REGION,
  MATCHUPS_DEFAULT_FORMAT,
  MATCHUPS_DEFAULT_LIMIT,
  MATCHUPS_DEFAULT_PERIOD,
  MATCHUPS_PAGE_RANGE,
} from "@/lib/constants/page-defaults";
import {
  buildHomeBountyStateFromMarketWatch,
  formatHomeBountyDelta,
  formatHomeBountyPct,
  formatHomeBountyPrice,
  type HomeBountyCard,
  type HomeBountyMeta,
  type HomeBountyWatchPayload,
} from "@/lib/home-bounty";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import type { MetaDeck as MatchupDeck } from "@/lib/meta-decks";

export type HomeMatchupPayload = {
  source?: string | null;
  updatedAt?: string | null;
  sampleGames?: number | null;
  sampleLabel?: string | null;
  sampleDescription?: string | null;
  comparableSample?: boolean | null;
  decks?: MatchupDeck[];
};

export type HomePageClientProps = {
  initialMeta: MetaSnapshot | null;
  initialMatchups: HomeMatchupPayload | null;
  initialBountyCards: HomeBountyCard[];
  initialBountyMeta: HomeBountyMeta | null;
  initialPricingPulseUpdatedAt: string | null;
  initialMetaIsLive: boolean;
  initialMatchupsAreLive: boolean;
  initialBountyIsLive: boolean;
};

const HOME_LIVE_REFRESH_MS = 2 * 60 * 1000;

type FeaturedSpotlight = {
  imageId: string;
  displayId: string;
  variantLabel: string | null;
  price: number | null;
  updatedAt: string | null;
  priced: boolean;
  usingSpecialPrint: boolean;
};

function priceQuoteForId(quotes: Map<string, CardPriceQuote>, cardId: string) {
  return quotes.get(normalizePricingLookupId(cardId).toUpperCase()) || null;
}

function compareFeaturedCandidates(
  left: { card: Card; quote: CardPriceQuote | null },
  right: { card: Card; quote: CardPriceQuote | null },
) {
  const leftPrice = left.quote?.priced && typeof left.quote.marketPrice === "number" ? left.quote.marketPrice : -1;
  const rightPrice = right.quote?.priced && typeof right.quote.marketPrice === "number" ? right.quote.marketPrice : -1;
  if (leftPrice !== rightPrice) return rightPrice - leftPrice;

  const specialPriority = specialPrintPriority(right.card) - specialPrintPriority(left.card);
  if (specialPriority !== 0) return specialPriority;

  const orderLeft = typeof left.card.variantOrder === "number" ? left.card.variantOrder : 999;
  const orderRight = typeof right.card.variantOrder === "number" ? right.card.variantOrder : 999;
  if (orderLeft !== orderRight) return orderLeft - orderRight;

  return left.card.id.localeCompare(right.card.id);
}

function resolveFeaturedSpotlight(
  featuredId: string,
  variants: Card[],
  quotes: Map<string, CardPriceQuote>,
): FeaturedSpotlight {
  const baseCard = variants.find((card) => card.id.toUpperCase() === featuredId.toUpperCase()) || variants[0] || null;
  const specialVariants = variants.filter((card) => isSpecialPrintVariant(card));

  const pricedSpecials = specialVariants
    .map((card) => ({ card, quote: priceQuoteForId(quotes, card.id) }))
    .filter((item) => item.quote?.priced && typeof item.quote.marketPrice === "number")
    .sort(compareFeaturedCandidates);

  const pricedAny = variants
    .map((card) => ({ card, quote: priceQuoteForId(quotes, card.id) }))
    .filter((item) => item.quote?.priced && typeof item.quote.marketPrice === "number")
    .sort(compareFeaturedCandidates);

  const chosen =
    pricedSpecials[0] ||
    pricedAny.find((item) => item.card.id.toUpperCase() === featuredId.toUpperCase()) ||
    pricedAny[0] ||
    [...specialVariants]
      .sort((left, right) => specialPrintPriority(right) - specialPrintPriority(left))
      .map((card) => ({ card, quote: priceQuoteForId(quotes, card.id) }))[0] ||
    { card: baseCard, quote: baseCard ? priceQuoteForId(quotes, baseCard.id) : null };

  const chosenCard = chosen.card || baseCard;
  const chosenQuote = chosen.quote || (chosenCard ? priceQuoteForId(quotes, chosenCard.id) : null);

  if (!chosenCard) {
    return {
      imageId: featuredId,
      displayId: featuredId,
      variantLabel: null,
      price: null,
      updatedAt: null,
      priced: false,
      usingSpecialPrint: false,
    };
  }

  return {
    imageId: chosenCard.id,
    displayId: displayCardId(chosenCard),
    variantLabel: chosenCard.variantLabel || null,
    price: chosenQuote?.priced ? chosenQuote.marketPrice ?? chosenQuote.estimatedPrice : null,
    updatedAt: chosenQuote?.updatedAt || null,
    priced: Boolean(chosenQuote?.priced && typeof (chosenQuote.marketPrice ?? chosenQuote.estimatedPrice) === "number"),
    usingSpecialPrint: isSpecialPrintVariant(chosenCard),
  };
}

function ago(iso?: string | null) {
  if (!iso) return "—";

  const normalized = iso.startsWith("$D") ? iso.slice(2) : iso;
  const parsedMs = Date.parse(normalized);
  if (!Number.isFinite(parsedMs)) return "—";

  const diff = Math.max(0, Date.now() - parsedMs);
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBeli(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFreshnessLabel(meta: HomeBountyMeta | null) {
  if (!meta) return "source syncing";
  if (!meta.updatedAt) return `${meta.provider} · pending`;
  const age = ago(meta.updatedAt);
  return `${meta.provider} · ${age}${meta.stale ? " · stale" : ""}`;
}

function heatClass(rate: number) {
  if (rate >= 60) return "border-emerald-600/30 bg-emerald-500/12 text-emerald-800";
  if (rate >= 55) return "border-emerald-500/25 bg-emerald-500/8 text-emerald-800";
  if (rate >= 45) return "border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[var(--color-text-dark)]";
  if (rate >= 40) return "border-orange-400/30 bg-orange-500/10 text-orange-800";
  return "border-red-400/25 bg-red-500/10 text-red-800";
}

export default function HomePageClient({
  initialMeta,
  initialMatchups,
  initialBountyCards,
  initialBountyMeta,
  initialPricingPulseUpdatedAt,
  initialMetaIsLive,
  initialMatchupsAreLive,
  initialBountyIsLive,
}: HomePageClientProps) {
  const [meta, setMeta] = useState<MetaSnapshot | null>(initialMeta);
  const [matchups, setMatchups] = useState<HomeMatchupPayload | null>(initialMatchups);
  const [scrollY, setScrollY] = useState(0);
  const [heroHover, setHeroHover] = useState(false);
  const [liveBountyCards, setLiveBountyCards] = useState<HomeBountyCard[]>(initialBountyCards);
  const [liveBountyMeta, setLiveBountyMeta] = useState<HomeBountyMeta | null>(initialBountyMeta);
  const [pricingPulseUpdatedAt, setPricingPulseUpdatedAt] = useState<string | null>(initialPricingPulseUpdatedAt);
  const [featuredSpotlight, setFeaturedSpotlight] = useState<FeaturedSpotlight | null>(null);

  useEffect(() => {
    if (initialMetaIsLive) return;
    let alive = true;

    const run = async () => {
      try {
        const params = new URLSearchParams({
          format: HOME_META_FORMAT,
          range: HOME_META_RANGE,
          region: HOME_META_REGION,
        });
        const r = await fetch(`/api/meta?${params.toString()}`, { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as MetaSnapshot;
        if (!alive) return;
        if (String(json?.source || "").toLowerCase().includes("seeded")) {
          setMeta(null);
          return;
        }
        setMeta(json);
      } catch {
        if (alive) setMeta(null);
      }
    };
    run();

    return () => {
      alive = false;
    };
  }, [initialMetaIsLive]);

  useEffect(() => {
    let alive = true;
    let intervalId: number | null = null;

    const run = async () => {
      try {
        const params = new URLSearchParams({
          format: MATCHUPS_DEFAULT_FORMAT,
          range: MATCHUPS_PAGE_RANGE,
          period: MATCHUPS_DEFAULT_PERIOD,
          limit: String(MATCHUPS_DEFAULT_LIMIT),
          ranking: "relevance",
        });
        const r = await fetch(`/api/matchups?${params.toString()}`, { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as HomeMatchupPayload;
        if (!alive) return;
        if (String(json?.source || "").toLowerCase().includes("seeded")) {
          setMatchups(null);
          return;
        }
        setMatchups(json);
      } catch {
        if (alive) setMatchups(null);
      }
    };
    run();
    intervalId = window.setInterval(run, HOME_LIVE_REFRESH_MS);

    return () => {
      alive = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let intervalId: number | null = null;

    const run = async () => {
      try {
        const res = await fetch("/api/market/watch", { cache: "no-store" });
        if (!res.ok) return;

        const json = (await res.json()) as HomeBountyWatchPayload;
        const next = buildHomeBountyStateFromMarketWatch(json);
        const nextPricingPulseUpdatedAt =
          typeof json?.pricingPulseUpdatedAt === "string" && json.pricingPulseUpdatedAt.trim()
            ? json.pricingPulseUpdatedAt
            : null;

        if (!alive) return;
        setLiveBountyMeta(next.meta);
        setLiveBountyCards(next.cards);
        setPricingPulseUpdatedAt(nextPricingPulseUpdatedAt);
      } catch {
        // noop
      }
    };

    run();
    intervalId = window.setInterval(run, HOME_LIVE_REFRESH_MS);

    return () => {
      alive = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY || 0));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const usingLiveMeta = Boolean(meta?.metaDecks?.length && !String(meta?.source || "").toLowerCase().includes("seeded"));
  const usingLiveMatchups = Boolean(matchups?.decks?.length && !String(matchups?.source || "").toLowerCase().includes("seeded"));
  const usingLiveBounty = Boolean(liveBountyCards.length && liveBountyMeta?.updatedAt);
  const topDeck = useMemo(() => meta?.metaDecks?.[0] || null, [meta]);
  const topDecks = useMemo(() => meta?.metaDecks?.slice(0, 4) || [], [meta]);
  const telemetryUpdatedAt =
    (usingLiveMeta ? meta?.updatedAt || null : null) ||
    (usingLiveMatchups ? matchups?.updatedAt || null : null) ||
    pricingPulseUpdatedAt ||
    (usingLiveBounty ? liveBountyMeta?.updatedAt || null : null) ||
    null;
  const marketPulseText = pricingPulseUpdatedAt ? ago(pricingPulseUpdatedAt) : "Live sync pending";
  const matchSampleText =
    matchups?.sampleLabel ||
    (typeof matchups?.sampleGames === "number" && matchups.sampleGames > 0
      ? `${matchups.sampleGames.toLocaleString()} weighted matchup samples`
      : null) ||
    "Live sync pending";
  const bountyCards = useMemo<HomeBountyCard[]>(() => liveBountyCards, [liveBountyCards]);
  const homepageFeedsUnavailable = !usingLiveMeta && !usingLiveMatchups && !usingLiveBounty;
  const featuredBountyCard = bountyCards[0] || null;
  const supportingBountyCards = useMemo(() => bountyCards.slice(1, 5), [bountyCards]);
  const meaningfulBountyMoverCount = useMemo(
    () => bountyCards.filter((card) => Math.abs(card.delta) >= 0.01).length,
    [bountyCards],
  );
  const quietBountyBoard = Boolean(featuredBountyCard && meaningfulBountyMoverCount < 4);
  const bountyCountLabel = meaningfulBountyMoverCount > 0
    ? meaningfulBountyMoverCount === 1
      ? "1 live mover"
      : `${meaningfulBountyMoverCount} live movers`
    : bountyCards.length === 1
      ? "1 live card"
      : `${bountyCards.length} live cards`;

  useEffect(() => {
    const [topColor] = parseLeaderColors(topDeck?.color);
    setThemeByLeaderColor(topColor);
  }, [topDeck]);

  const featuredId = topDeck?.cardId || null;
  const featuredName = topDeck?.name || "Live data unavailable";
  const featuredRank = topDeck?.rank || null;
  const featuredWinRate = topDeck?.winRate ?? null;
  const featuredImageId = featuredSpotlight?.imageId || featuredId;
  const featuredDisplayId = featuredSpotlight?.displayId || featuredId;
  const featuredPrice = featuredSpotlight?.priced ? featuredSpotlight.price : null;

  useEffect(() => {
    if (!featuredId) {
      setFeaturedSpotlight(null);
      return;
    }

    let cancelled = false;
    setFeaturedSpotlight({
      imageId: featuredId,
      displayId: featuredId,
      variantLabel: null,
      price: null,
      updatedAt: null,
      priced: false,
      usingSpecialPrint: false,
    });

    (async () => {
      try {
        const variantsRes = await fetch(`/api/cards/variants?id=${encodeURIComponent(featuredId)}`, { cache: "no-store" });
        if (!variantsRes.ok) throw new Error("Unable to load featured variants");
        const variantsJson = await variantsRes.json() as { variants?: Card[] };
        const variants = Array.isArray(variantsJson.variants) && variantsJson.variants.length
          ? variantsJson.variants
          : [{
              id: featuredId,
              name: featuredName,
              set: "",
              setCode: "",
              number: "",
              type: "Leader",
              color: "",
              rarity: "",
            } satisfies Card];

        const pricingIds = Array.from(new Set(variants.map((card) => normalizePricingLookupId(card.id)).filter(Boolean)));
        const pricesRes = await fetch(`/api/cards/prices?ids=${pricingIds.map(encodeURIComponent).join(",")}`, { cache: "no-store" });
        if (!pricesRes.ok) throw new Error("Unable to load featured prices");
        const pricesJson = await pricesRes.json() as { results?: CardPriceQuote[] };
        const quotes = new Map(
          (pricesJson.results || []).map((quote) => [String(quote.cardId || "").trim().toUpperCase(), quote]),
        );

        if (!cancelled) {
          setFeaturedSpotlight(resolveFeaturedSpotlight(featuredId, variants, quotes));
        }
      } catch {
        if (!cancelled) {
          setFeaturedSpotlight({
            imageId: featuredId,
            displayId: featuredId,
            variantLabel: null,
            price: null,
            updatedAt: null,
            priced: false,
            usingSpecialPrint: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [featuredId, featuredName]);

  const matrixTeaser = useMemo(() => {
    if (usingLiveMatchups && matchups?.decks?.length) {
      const anchor = matchups.decks[0];
      const opponents = matchups.decks
        .filter((deck) => deck.id !== anchor.id)
        .map((deck) => ({ deck, rate: anchor.matchups[deck.id] ?? 50 }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 6);
      return { anchor, opponents };
    }
    return null;
  }, [matchups, usingLiveMatchups]);

  const fanCardIds = useMemo(() => {
    const liveIds = topDecks.map((deck) => deck.cardId).filter((value): value is string => Boolean(value));
    return liveIds.slice(0, 3);
  }, [topDecks]);

  return (
    <div className="relative pb-14 md:pb-20">
      {/* Background effects removed — cream body provides the base */}

      <div className="relative z-10 space-y-8">
        {homepageFeedsUnavailable ? (
          <div className="rounded-2xl border border-[var(--color-gold)] bg-[rgba(212,160,84,0.1)] px-4 py-3 text-sm text-[var(--color-text-dark)]">
            <span className="font-bold">Live data unavailable.</span> Some homepage sections are showing loading placeholders until the live meta, matchup, and market feeds recover.
          </div>
        ) : null}

        <section className="captains-hero-grid items-stretch">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="journal-surface treasure-chart-surface rounded-[2rem] p-6 md:p-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
              <ScrollText className="h-3.5 w-3.5" /> Captain&apos;s Log
            </div>

            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <BrandMark className="brand-lockup-large" subtitle="ONE PIECE TCG PRICES + META" />
              <div className="brand-proof-chip">
                <span className="brand-proof-label">Fresh from the line</span>
                <span className="brand-proof-value">{telemetryUpdatedAt ? ago(telemetryUpdatedAt) : "Live sync pending"}</span>
              </div>
            </div>

            <h1 className="manga-title mt-7 max-w-2xl text-4xl font-black leading-[0.92] text-[var(--color-navy)] md:text-6xl">
              Chart the Grand Line before the market turns.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-text-mid)] md:text-base">
              Track bounty spikes, matchup pressure, and the crews making noise right now in one place that feels lived-in, clear, and easy to trust.
            </p>

            <div className="brand-route-strip mt-5">
              <span className="brand-route-chip">
                <Compass className="h-3.5 w-3.5" />
                Current route
              </span>
              <span className="brand-route-chip">
                <Coins className="h-3.5 w-3.5" />
                Beli scans live
              </span>
              <span className="brand-route-chip">
                <Crown className="h-3.5 w-3.5" />
                Top sea: {topDeck?.name || "live sync pending"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <DonButton href="/market" className="px-6 py-3 text-[11px]">
                Open Market
              </DonButton>
              <Link
                href="/meta"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-navy)]"
              >
                See the Meta
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <Coins className="h-3.5 w-3.5" />
                  Market Pulse
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-navy)]">{marketPulseText}</p>
              </div>
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <ScrollText className="h-3.5 w-3.5" />
                  Match Sample
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-navy)]">
                  {matchSampleText}
                </p>
              </div>
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <Compass className="h-3.5 w-3.5" />
                  Lead Deck
                </p>
                <p className="mt-1 truncate text-sm font-black text-[var(--color-navy)]">{topDeck?.name || "Live data unavailable"}</p>
              </div>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="captains-feature-shell rounded-[2rem] p-5 md:p-7"
            onMouseEnter={() => setHeroHover(true)}
            onMouseLeave={() => setHeroHover(false)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
                <Crown className="h-3.5 w-3.5" /> Featured Card
              </div>
              <BrandMark variant="monogram" className="brand-mark-hero" />
            </div>

            <div className="brand-macro-stage mt-4">
              {featuredImageId ? (
                <div className="brand-macro-backdrop">
                  <img
                    src={`/api/card-image?id=${encodeURIComponent(featuredImageId)}`}
                    alt=""
                    className="brand-macro-backdrop-image"
                  />
                </div>
              ) : (
                <div className="brand-macro-backdrop bg-[radial-gradient(circle_at_center,rgba(240,192,64,0.12),transparent_48%)]" />
              )}
              <div className="brand-macro-sheen" />

              <div className="relative mx-auto w-[min(76vw,340px)]">
                <TiltCard className="relative rounded-[1.6rem]">
                  <div className="captains-feature-card relative overflow-hidden rounded-[1.6rem] border border-[var(--color-parchment-dark)] p-2.5">
                    <div className="brand-card-rim rounded-[1.3rem] p-1.5">
                      {featuredImageId ? (
                        <img
                          src={`/api/card-image?id=${encodeURIComponent(featuredImageId)}`}
                          alt={featuredName}
                          className="aspect-[5/7] w-full rounded-[1.1rem] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                        />
                      ) : (
                        <div className="flex aspect-[5/7] w-full items-center justify-center rounded-[1.1rem] border border-dashed border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-6 text-center text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                          Live showcase unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </TiltCard>

                <motion.div
                  animate={{ opacity: heroHover ? 1 : 0.82, x: heroHover ? 0 : -8 }}
                  className="captains-aura captains-aura-left"
                >
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Price Check</p>
                  {featuredImageId ? (
                    <>
                      <p className="text-sm font-black text-[var(--color-gold-dark)]">
                        {featuredPrice != null ? formatBeli(featuredPrice) : "Market syncing"}
                      </p>
                      <p className="text-[10px] font-bold text-[var(--color-text-light)]">
                        {featuredSpotlight?.updatedAt
                          ? `Updated ${ago(featuredSpotlight.updatedAt)}`
                          : featuredSpotlight?.usingSpecialPrint
                            ? "Showcase print"
                            : "Live market"}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] font-bold text-[var(--color-text-light)]">Waiting for live market data</p>
                  )}
                </motion.div>

                <motion.div
                  animate={{ opacity: heroHover ? 1 : 0.82, x: heroHover ? 0 : 8 }}
                  className="captains-aura captains-aura-right"
                >
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-light)]">Meta Signal</p>
                  {featuredRank && featuredWinRate != null ? (
                    <>
                      <p className="text-sm font-black text-[var(--color-navy)]">#{featuredRank} deck</p>
                      <p className="text-[10px] font-bold text-emerald-700">{featuredWinRate.toFixed(1)}% WR</p>
                    </>
                  ) : (
                    <p className="text-[10px] font-bold text-[var(--color-text-light)]">Waiting for live meta data</p>
                  )}
                </motion.div>

                <motion.div
                  animate={{ opacity: heroHover ? 1 : 0.84, y: heroHover ? 0 : 6 }}
                  className="captains-aura captains-aura-bottom"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--color-gold-dark)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-mid)]">Card spotlight</span>
                </motion.div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-xl font-black text-[var(--color-navy)]">{featuredName}</p>
              <p className="text-xs text-[var(--color-text-light)]">
                {featuredDisplayId
                  ? `${featuredDisplayId} · ${featuredSpotlight?.variantLabel || "featured print"} · top-table signal`
                  : "Load the latest live leader spotlight once the homepage feeds recover."}
              </p>
            </div>
          </motion.article>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Grand Line Signal</p>
              <h2 className="manga-section-header mt-1 text-2xl font-black text-[var(--color-navy)] md:text-3xl">Live reads for the market, the meta, and the matchups.</h2>
              <p className="mt-1 text-sm text-[var(--color-text-mid)]">Current signal for the cards climbing, the crews winning, and the pairings that matter right now.</p>
            </div>
            <Link href="/matchups" className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-light)] hover:text-[var(--color-navy)] md:inline-flex">
              Open Full Matrix <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="captains-bento-grid">
            <motion.article
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38 }}
              className="captains-bento-card col-span-12 md:col-span-8"
            >
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-lg font-black text-[var(--color-navy)]">The Yonko</p>
                  <p className="text-xs text-[var(--color-text-light)]">
                    {telemetryUpdatedAt ? `Top crews · refreshed ${ago(telemetryUpdatedAt)}` : "Top crews · live sync pending"}
                  </p>
                </div>
                <Link href="/meta" className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-gold-dark)] hover:text-[var(--color-navy)]">View all</Link>
              </div>

              <div className="space-y-2.5">
                {topDecks.length ? topDecks.map((deck, i) => (
                  <Link
                    key={deck.name}
                    href={deck.deckId ? `/meta?deck=${deck.deckId}` : "/meta"}
                    className="captains-yonko-strip group"
                  >
                    <img
                      src={`/api/card-image?id=${deck.cardId || "OP01-001"}&variant=p1`}
                      alt={deck.name}
                      className="h-16 w-12 rounded-lg border border-[var(--color-parchment-dark)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-[var(--color-navy)]">{deck.name}</p>
                        <p className="text-xs font-black text-emerald-700">{(deck.winRate ?? 50).toFixed(1)}%</p>
                      </div>

                      <div className="captains-winrate-track mt-1.5">
                        <div
                          className="captains-winrate-fill"
                          style={{ width: `${Math.max(12, Math.min(100, (deck.winRate ?? 50) + 8))}%` }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-text-light)]">
                        <span>#{deck.rank} · {deck.color || "Mixed"}</span>
                        <span>{deck.popularity.toFixed(1)}% field</span>
                      </div>
                    </div>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${i === 0 ? "bg-[rgba(212,160,84,0.2)] text-[var(--color-gold-dark)]" : "bg-[var(--color-parchment-dark)]/40 text-[var(--color-text-mid)]"}`}>
                      #{deck.rank}
                    </span>
                  </Link>
                )) : (
                  <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4 text-sm text-[var(--color-text-light)]">
                    Live meta leaders are unavailable right now. Reload once the live feed recovers.
                  </div>
                )}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.04 }}
              className="captains-bento-card captains-bounty-board col-span-12 md:col-span-4 md:row-span-2"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-[var(--color-navy)]">Bounty Board</p>
                  <p className="text-xs text-[var(--color-text-light)]">Marine issue board · biggest 24h card moves</p>
                </div>
                <span className="rounded-full border border-[var(--color-parchment-dark)] bg-[rgba(255,248,235,0.92)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">
                  {bountyCountLabel}
                </span>
              </div>

              <p className={`mb-3 text-[10px] ${liveBountyMeta?.stale ? "text-amber-700" : "text-[var(--color-text-light)]"}`}>
                  {formatFreshnessLabel(liveBountyMeta)}
              </p>

              <div className="space-y-3">
                {featuredBountyCard ? (
                  <>
                    <Link
                      href={featuredBountyCard.href}
                      className="group block rounded-2xl border border-[rgba(97,64,34,0.25)] bg-[linear-gradient(180deg,rgba(255,248,235,0.97),rgba(246,231,205,0.98))] p-3 shadow-[0_14px_24px_rgba(59,35,14,0.12)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-gold)]"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[rgba(212,160,84,0.16)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">
                          Most Wanted
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${
                            featuredBountyCard.delta > 0
                              ? "bg-emerald-500/12 text-emerald-800"
                            : featuredBountyCard.delta < 0
                                ? "bg-red-500/12 text-red-800"
                                : "bg-[var(--color-parchment-dark)]/50 text-[var(--color-text-mid)]"
                          }`}
                        >
                          {featuredBountyCard.delta > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : featuredBountyCard.delta < 0 ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {featuredBountyCard.delta === 0 ? "Flat tape" : formatHomeBountyPct(featuredBountyCard.dailyChangePct)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <img
                          src={featuredBountyCard.imageUrl || (featuredBountyCard.cardId ? `/api/card-image?id=${encodeURIComponent(featuredBountyCard.cardId)}` : "/api/card-image?id=OP01-001")}
                          alt={featuredBountyCard.name}
                          className="h-24 w-[4.25rem] shrink-0 rounded-xl border border-black/25 object-cover shadow-[0_10px_20px_rgba(0,0,0,0.18)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[var(--color-navy)]">{featuredBountyCard.name}</p>
                          <p className="mt-1 truncate text-[11px] text-[var(--color-text-mid)]" title={featuredBountyCard.displayId}>
                            {featuredBountyCard.displayId}
                          </p>

                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-light)]">Current price</p>
                              <p className="text-2xl font-black leading-none text-[var(--color-navy)]">
                                {formatHomeBountyPrice(featuredBountyCard.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${featuredBountyCard.delta > 0 ? "text-emerald-700" : featuredBountyCard.delta < 0 ? "text-red-700" : "text-[var(--color-text-mid)]"}`}>
                                {formatHomeBountyDelta(featuredBountyCard.delta)}
                              </p>
                              <p className="text-[11px] text-[var(--color-text-light)]">
                                {featuredBountyCard.delta === 0
                                  ? `holding at ${formatHomeBountyPrice(featuredBountyCard.previousPrice)}`
                                  : `from ${formatHomeBountyPrice(featuredBountyCard.previousPrice)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {supportingBountyCards.length ? (
                      <div className="space-y-2">
                        {supportingBountyCards.map((card, index) => (
                          <Link
                            key={card.key}
                            href={card.href}
                            className="group flex items-center gap-3 rounded-xl border border-[var(--color-parchment-dark)] bg-[rgba(255,249,239,0.9)] px-3 py-2 transition-colors hover:border-[var(--color-gold)] hover:bg-[var(--color-cream)]"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(27,40,56,0.08)] text-[10px] font-black text-[var(--color-text-mid)]">
                              {index + 2}
                            </span>
                            <img
                              src={card.imageUrl || (card.cardId ? `/api/card-image?id=${encodeURIComponent(card.cardId)}` : "/api/card-image?id=OP01-001")}
                              alt={card.name}
                              className="h-12 w-9 rounded border border-black/20 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-[#2c1c0d]">{card.name}</p>
                              <p className="truncate text-[10px] text-[#614022]" title={card.displayId}>
                                {card.displayId}
                              </p>
                            </div>
                            <div className="text-right tabular-nums">
                              <p className="text-xs font-black text-[#2c1c0d]">{formatHomeBountyPrice(card.price)}</p>
                              <p className={`text-[10px] font-bold ${card.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                {formatHomeBountyDelta(card.delta)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {quietBountyBoard ? (
                      <div className="rounded-xl border border-dashed border-[var(--color-parchment-dark)] bg-[rgba(255,248,235,0.72)] px-3 py-2 text-[11px] text-[var(--color-text-mid)]">
                        {meaningfulBountyMoverCount > 0
                          ? `Quiet tape right now: only ${meaningfulBountyMoverCount} exact-print ${meaningfulBountyMoverCount === 1 ? "card has" : "cards have"} posted a verified 24h move.`
                          : "Quiet tape right now: no exact-print cards have posted a verified 24h move yet."}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4 text-sm text-[var(--color-text-light)]">
                    Live market movers are unavailable right now.
                  </div>
                )}
              </div>

              <div className="mt-3">
                <DonButton href="/market" className="w-full justify-center px-3 py-2 text-[10px]">
                  Open Market
                </DonButton>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="captains-bento-card col-span-12 md:col-span-5"
            >
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-lg font-black text-[var(--color-navy)]">Tournament Radar</p>
                  <p className="text-xs text-[var(--color-text-light)]">
                    {usingLiveMeta ? "Weekly live leaders · jump into current deck detail" : "Live tournament decklists unavailable right now"}
                  </p>
                </div>
                <CalendarDays className="h-4 w-4 text-[var(--color-gold-dark)]" />
              </div>

              <div className="space-y-2">
                {usingLiveMeta ? topDecks.slice(0, 3).map((deck) => (
                  <Link
                    key={`${deck.name}-${deck.rank}`}
                    href={deck.deckId ? `/meta?deck=${deck.deckId}` : "/meta"}
                    className="block rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-3 transition-colors hover:border-[var(--color-gold)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--color-navy)]">{deck.name}</p>
                        <p className="text-[11px] text-[var(--color-text-light)]">
                          Weekly OP15 meta · #{deck.rank} · {deck.color || "Mixed"}
                        </p>
                      </div>
                      <span className="rounded-md border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-mid)]">
                        Open
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--color-gold-dark)]">
                      {(deck.winRate ?? 0).toFixed(1)}% WR · {deck.popularity.toFixed(1)}% field
                    </p>
                  </Link>
                )) : (
                  <div className="rounded-xl border border-[var(--color-parchment-dark)] bg-[var(--color-cream)] p-4 text-sm text-[var(--color-text-light)]">
                    Live tournament radar is unavailable right now.
                  </div>
                )}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className="captains-bento-card col-span-12 md:col-span-3"
            >
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-base font-black text-[var(--color-navy)]">Matchup Teaser</p>
                  <p className="text-[11px] text-[var(--color-text-light)]">Worst pairings for current #1</p>
                </div>
                <TrendingUp className="h-4 w-4 text-[var(--color-gold-dark)]" />
              </div>

              {matrixTeaser ? (
                <>
                  <p className="mb-2 text-xs text-[var(--color-text-mid)]">#{1} {matrixTeaser.anchor.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {matrixTeaser.opponents.map((m) => (
                      <div key={m.deck.id} className={`rounded-lg border px-2 py-1.5 text-xs ${heatClass(m.rate)}`}>
                        <p className="truncate text-[10px] font-bold opacity-85">{m.deck.name}</p>
                        <p className="text-sm font-black">{m.rate}%</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/matchups" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-gold-dark)] hover:text-[var(--color-navy)]">
                    See full matrix <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-light)]">Matchup telemetry syncing...</p>
              )}
            </motion.article>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="captains-tool-teaser"
        >
          <div className="captains-tool-copy">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d4a054]">Deck Lab</p>
            <h2
              className="mt-2 max-w-3xl text-[2.15rem] font-semibold leading-[1.02] text-[var(--color-navy)] md:text-[2.85rem]"
              style={{ fontFamily: "var(--font-crimson), 'Crimson Pro', Georgia, serif" }}
            >
              Theorycraft your next crew with the fastest deck lab on the seas.
            </h2>
            <p className="mt-3 max-w-2xl font-serif text-[15px] leading-[1.7] text-[var(--color-text-mid)] md:text-base">
              Drag cards. Test ratios. Refine on matchup pressure. Then launch straight into ranked play with a tighter list.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <DonButton href="/deckbuilder" className="px-6 py-3 text-[11px]">
                Open Deck Builder
              </DonButton>
              <Link
                href="/decks"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4a054] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#d4a054] hover:text-[#f5efe3]"
              >
                Explore Top Decklists <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="captains-card-fan" aria-hidden>
            {fanCardIds.length ? fanCardIds.map((id, i) => (
              <div key={`${id}-${i}`} className={`captains-fan-card captains-fan-${i + 1}`}>
                <img src={`/api/card-image?id=${id}&variant=p1`} alt="" className="h-full w-full rounded-xl object-cover" />
              </div>
            )) : [1, 2, 3].map((slot, i) => (
              <div key={`placeholder-${slot}`} className={`captains-fan-card captains-fan-${i + 1}`}>
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[var(--color-parchment-dark)] bg-[var(--color-cream)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">
                  Live sync pending
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Coins, Compass, Crown, ScrollText, Sparkles, TrendingUp } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";
import DonButton from "@/components/ui/DonButton";
import TiltCard from "@/components/ui/TiltCard";
import BrandMark from "@/components/BrandMark";
import {
  HOME_MATCHUP_PERIOD,
  HOME_MATCHUP_RANGE,
  HOME_MATCHUP_SET,
  HOME_META_FORMAT,
  HOME_META_RANGE,
  HOME_META_REGION,
} from "@/lib/constants/page-defaults";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import { parseLeaderColors } from "@/lib/theme/color-utils";
import type { MetaDeck as MatchupDeck } from "@/lib/meta-decks";

const BOUNTY_QUOTES: Record<string, { price: number; delta: number }> = {
  "OP01-120": { price: 1429, delta: 5.2 },
  "OP01-001": { price: 879, delta: 1.8 },
  "OP09-118": { price: 899, delta: -1.7 },
  "OP02-001": { price: 542, delta: 2.3 },
  "OP01-061": { price: 208, delta: 1.2 },
  "OP06-007": { price: 312, delta: 0.9 },
};

export type HomeBountyCard = {
  key: string;
  name: string;
  displayId: string;
  cardId?: string;
  imageUrl?: string;
  price: number;
  delta: number;
  href: string;
  external?: boolean;
};

export type HomeBountyMeta = {
  provider: string;
  updatedAt: string | null;
  stale: boolean;
  staleAgeMs: number | null;
};

export type HomeBountyFeedItem = {
  productId?: string | number | null;
  cardId?: string | number | null;
  name?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  percent?: number | string | null;
};

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
  initialMetaIsLive: boolean;
  initialMatchupsAreLive: boolean;
  initialBountyIsLive: boolean;
};

type BountyStamp = {
  label: string;
  tone: string;
};

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

function getBountyStamp(card: HomeBountyCard): BountyStamp {
  if (card.delta >= 4) return { label: "High Demand", tone: "bounty-stamp-hot" };
  if (card.price >= 850) return { label: "Collector", tone: "bounty-stamp-collector" };
  if (card.delta > 0) return { label: "Rising", tone: "bounty-stamp-rising" };
  return { label: "Watchlist", tone: "bounty-stamp-watch" };
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
    if (initialMatchupsAreLive) return;
    let alive = true;

    const run = async () => {
      try {
        const params = new URLSearchParams({
          set: HOME_MATCHUP_SET,
          range: HOME_MATCHUP_RANGE,
          period: HOME_MATCHUP_PERIOD,
          limit: "12",
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

    return () => {
      alive = false;
    };
  }, [initialMatchupsAreLive]);

  useEffect(() => {
    if (initialBountyIsLive) return;
    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/market-movers?limit=12", { cache: "no-store" });
        if (!res.ok) return;

        const json = await res.json();
        const board = Array.isArray(json?.board) ? (json.board as HomeBountyFeedItem[]) : [];

        if (alive) {
          setLiveBountyMeta({
            provider: String(json?.source?.provider || "GumGum"),
            updatedAt: typeof json?.freshness?.updatedAt === "string" ? json.freshness.updatedAt : null,
            stale: Boolean(json?.freshness?.stale),
            staleAgeMs: typeof json?.freshness?.staleAgeMs === "number" ? json.freshness.staleAgeMs : null,
          });
        }

        if (!alive || !board.length) return;

        const mapped = board.slice(0, 6).map((item) => {
          const productId = String(item?.productId ?? "").trim();
          const cardId = item?.cardId ? String(item.cardId) : undefined;
          const name = String(item?.name || "Unknown Card");
          const displayId = cardId || (productId ? `TCG #${productId}` : "Unknown");
          const href = cardId
            ? `/cards/${encodeURIComponent(cardId)}`
            : productId
              ? `https://www.tcgplayer.com/product/${encodeURIComponent(productId)}`
              : "/market";

          return {
            key: productId || cardId || name,
            name,
            displayId,
            cardId,
            imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
            price: Number(item?.price) || 0,
            delta: Number(item?.percent) || 0,
            href,
            external: !cardId && Boolean(productId),
          } satisfies HomeBountyCard;
        });

        const genericNameRx = /^TCG Product\s+\d+$/i;
        const genericRatio = mapped.length
          ? mapped.filter((item) => genericNameRx.test(item.name)).length / mapped.length
          : 1;

        if (genericRatio >= 0.5) {
          setLiveBountyCards([]);
          return;
        }

        setLiveBountyCards(mapped);
      } catch {
        // noop
      }
    };

    run();

    return () => {
      alive = false;
    };
  }, [initialBountyIsLive]);

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
    (usingLiveBounty ? liveBountyMeta?.updatedAt || null : null) ||
    null;
  const telemetrySampleText =
    matchups?.sampleLabel ||
    (typeof matchups?.sampleGames === "number" && matchups.sampleGames > 0 ? `${matchups.sampleGames.toLocaleString()} games` : null) ||
    meta?.sampleLabel ||
    (meta?.sampleGames ? `${meta.sampleGames.toLocaleString()} games` : null) ||
    "Live sync pending";
  const homepageFeedsUnavailable = !usingLiveMeta && !usingLiveMatchups && !usingLiveBounty;

  useEffect(() => {
    const [topColor] = parseLeaderColors(topDeck?.color);
    setThemeByLeaderColor(topColor);
  }, [topDeck]);

  const featuredId = topDeck?.cardId || null;
  const featuredName = topDeck?.name || "Live data unavailable";
  const featuredRank = topDeck?.rank || null;
  const featuredWinRate = topDeck?.winRate ?? null;
  const featuredQuote =
    (featuredId ? BOUNTY_QUOTES[featuredId] : null) ||
    {
      price: Math.round(720 + (featuredRank || 1) * 34),
      delta: Number((((featuredWinRate ?? 50) - 50) / 3.2).toFixed(1)),
    };

  const bountyCards = useMemo<HomeBountyCard[]>(() => liveBountyCards, [liveBountyCards]);

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
              <ScrollText className="h-3.5 w-3.5" /> Captain's Log
            </div>

            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <BrandMark className="brand-lockup-large" subtitle="ONE PIECE TCG MARKET + META INTELLIGENCE" />
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
                <p className="mt-1 text-sm font-black text-[var(--color-navy)]">{usingLiveBounty && liveBountyMeta?.updatedAt ? ago(liveBountyMeta.updatedAt) : "Live sync pending"}</p>
              </div>
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <ScrollText className="h-3.5 w-3.5" />
                  Match Sample
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-navy)]">
                  {telemetrySampleText}
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
                <Crown className="h-3.5 w-3.5" /> Wanted holo
              </div>
              <BrandMark variant="monogram" className="brand-mark-hero" />
            </div>

            <div className="brand-macro-stage mt-4">
              {featuredId ? (
                <div className="brand-macro-backdrop">
                  <img
                    src={`/api/card-image?id=${featuredId}&variant=p1`}
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
                      {featuredId ? (
                        <img
                          src={`/api/card-image?id=${featuredId}&variant=p1`}
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
                  {featuredId ? (
                    <>
                      <p className="text-sm font-black text-[var(--color-gold-dark)]">{formatBeli(featuredQuote.price)}</p>
                      <p className={`text-[10px] font-bold ${featuredQuote.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {featuredQuote.delta >= 0 ? "+" : ""}
                        {featuredQuote.delta.toFixed(1)}% 24h
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
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-mid)]">Foil-grade visual focus</span>
                </motion.div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-xl font-black text-[var(--color-navy)]">{featuredName}</p>
              <p className="text-xs text-[var(--color-text-light)]">
                {featuredId ? `${featuredId} · live bounty, holo finish, and top-table signal` : "Load the latest live leader spotlight once the homepage feeds recover."}
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
              <div className="mb-3">
                <p className="text-lg font-black text-[var(--color-navy)]">Bounty Board</p>
                <p className="text-xs text-[var(--color-text-light)]">Marine issue board · 24h pulse</p>
                <p className={`text-[10px] ${liveBountyMeta?.stale ? "text-amber-700" : "text-[var(--color-text-light)]"}`}>
                  {formatFreshnessLabel(liveBountyMeta)}
                </p>
              </div>

              <div className="space-y-2">
                {bountyCards.length ? bountyCards.map((card, i) => {
                  const stamp = getBountyStamp(card);
                  const row = (
                    <>
                      <span className={`bounty-stamp ${stamp.tone}`}>{stamp.label}</span>
                      <img
                        src={card.imageUrl || (card.cardId ? `/api/card-image?id=${encodeURIComponent(card.cardId)}` : "/api/card-image?id=OP01-001")}
                        alt={card.name}
                        className="h-12 w-9 rounded border border-black/30 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-[#2c1c0d]">{card.name}</p>
                        <p className="text-[10px] text-[#614022]">{card.displayId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-[#2c1c0d]">{formatBeli(card.price)}</p>
                        <p className={`text-[10px] font-bold ${card.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {card.delta >= 0 ? "+" : ""}{card.delta.toFixed(1)}%
                        </p>
                      </div>
                    </>
                  );

                  const style = { transform: `rotate(${[-1.1, 0.8, -0.5, 1.1, -0.4, 0.6][i] ?? 0}deg)` };

                  if (card.external) {
                    return (
                      <a
                        key={card.key}
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="captains-bounty-row group"
                        style={style}
                      >
                        {row}
                      </a>
                    );
                  }

                  return (
                    <Link key={card.key} href={card.href} className="captains-bounty-row group" style={style}>
                      {row}
                    </Link>
                  );
                }) : (
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
              className="mt-2 max-w-3xl text-[2.15rem] font-semibold leading-[1.02] text-[#f5efe3] md:text-[2.85rem]"
              style={{ fontFamily: "var(--font-crimson), 'Crimson Pro', Georgia, serif" }}
            >
              Theorycraft your next crew with the fastest deck lab on the seas.
            </h2>
            <p className="mt-3 max-w-2xl font-serif text-[15px] leading-[1.7] text-[rgba(245,239,227,0.75)] md:text-base">
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
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-white/25 bg-[rgba(27,40,56,0.6)] text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
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

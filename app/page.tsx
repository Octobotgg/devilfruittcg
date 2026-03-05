"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Crown, ScrollText, Sparkles, TrendingUp } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";
import TickerRow from "@/components/ui/TickerRow";
import DonButton from "@/components/ui/DonButton";
import TiltCard from "@/components/ui/TiltCard";
import { setThemeByLeaderColor } from "@/lib/theme/leader-theme";
import { parseLeaderColors } from "@/lib/theme/color-utils";

const BOUNTY_QUOTES: Record<string, { price: number; delta: number }> = {
  "OP01-120": { price: 1429, delta: 5.2 },
  "OP01-001": { price: 879, delta: 1.8 },
  "OP09-118": { price: 899, delta: -1.7 },
  "OP02-001": { price: 542, delta: 2.3 },
  "OP01-061": { price: 208, delta: 1.2 },
  "OP06-007": { price: 312, delta: 0.9 },
};

const TOURNAMENT_LOG = [
  { event: "Treasure Cup · Newark", winner: "Imu Control", code: "TC-NWK-IMU-7L8H", when: "Last weekend" },
  { event: "Regionals · Dallas", winner: "Luffy Gear 5", code: "RG-DAL-LFY-2Q1P", when: "5 days ago" },
  { event: "Online Major", winner: "Blackbeard Midrange", code: "ONL-BBD-5M9R", when: "3 days ago" },
];

function ago(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBeli(value: number) {
  return `฿${value.toLocaleString()}`;
}

function heatClass(rate: number) {
  if (rate >= 60) return "border-emerald-400/35 bg-emerald-500/18 text-emerald-100";
  if (rate >= 55) return "border-emerald-300/30 bg-emerald-500/12 text-emerald-100";
  if (rate >= 45) return "border-white/15 bg-white/8 text-white";
  if (rate >= 40) return "border-orange-300/30 bg-orange-500/14 text-orange-100";
  return "border-red-300/28 bg-red-500/15 text-red-100";
}

export default function HomePageGroundZeroPhase2() {
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [heroHover, setHeroHover] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch("/api/meta");
        if (!r.ok) return;
        setMeta(await r.json());
      } catch {
        // noop
      }
    };
    run();
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

  const topDeck = useMemo(() => meta?.metaDecks?.[0] || null, [meta]);
  const topDecks = useMemo(() => meta?.metaDecks?.slice(0, 4) || [], [meta]);

  useEffect(() => {
    const [topColor] = parseLeaderColors(topDeck?.color);
    setThemeByLeaderColor(topColor);
  }, [topDeck]);

  const featuredId = topDeck?.cardId || MARKET_HOT_CARDS[0]?.id || "OP01-120";
  const featuredName = topDeck?.name || "Shanks";
  const featuredRank = topDeck?.rank || 1;
  const featuredWinRate = topDeck?.winRate ?? 57.2;
  const featuredQuote =
    BOUNTY_QUOTES[featuredId] ||
    {
      price: Math.round(720 + featuredRank * 34),
      delta: Number((((featuredWinRate ?? 50) - 50) / 3.2).toFixed(1)),
    };

  const tickerItems = useMemo(
    () =>
      MARKET_HOT_CARDS.slice(0, 5).map((card) => {
        const q = BOUNTY_QUOTES[card.id] || { price: 299, delta: 0.4 };
        return {
          label: `Wanted: ${card.name}`,
          value: formatBeli(q.price),
          delta: q.delta,
        };
      }),
    []
  );

  const bountyCards = useMemo(
    () =>
      MARKET_HOT_CARDS.slice(0, 6).map((card) => {
        const q = BOUNTY_QUOTES[card.id] || { price: 320, delta: 0.5 };
        return { ...card, ...q };
      }),
    []
  );

  const matrixTeaser = useMemo(() => {
    const anchor = meta?.decks?.[0];
    if (!anchor || !meta?.matchups?.[anchor.id]) return null;
    const opponents = (meta.decks || [])
      .filter((d) => d.id !== anchor.id)
      .map((d) => ({ deck: d, rate: meta.matchups?.[anchor.id]?.[d.id] ?? 50 }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 6);
    return { anchor, opponents };
  }, [meta]);

  async function copyDeckCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1400);
    } catch {
      // noop
    }
  }

  return (
    <div className="relative pb-14 md:pb-20">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="captains-parallax-map absolute inset-[-12%]"
          style={{ transform: `translate3d(0, ${Math.round(scrollY * 0.18)}px, 0)` }}
        />
        <div className="captains-lantern captains-lantern-left" />
        <div className="captains-lantern captains-lantern-right" />
        <div className="captains-dust" />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="sticky top-16 z-40 -mx-1 md:mx-0">
          <TickerRow className="captains-ticker" items={tickerItems} />
        </div>

        <section className="captains-hero-grid items-stretch">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="journal-surface rounded-3xl p-6 md:p-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f8d479]/30 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8d479]">
              <ScrollText className="h-3.5 w-3.5" /> Captain&apos;s Log
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[0.95] text-white md:text-6xl">
              The Meta is shifting,
              <span className="block text-[var(--theme-accent-2)]">Captain.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
              Welcome to the Grand Line&apos;s command desk. Track live bounties, read the current sea-state,
              and steer your next crew with confidence.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <DonButton href="/deckbuilder" className="px-6 py-3 text-[11px]">
                Set Sail · Build a Deck
              </DonButton>
              <Link
                href="/meta"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white/80 transition-colors hover:text-white"
              >
                Open Meta Command
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Last Update</p>
                <p className="mt-1 text-sm font-black text-white">{ago(meta?.updatedAt)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Sample Size</p>
                <p className="mt-1 text-sm font-black text-white">
                  {meta?.sampleGames ? `${meta.sampleGames.toLocaleString()} games` : "Live aggregate"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Top Crew</p>
                <p className="mt-1 truncate text-sm font-black text-white">{topDeck?.name || "Syncing Live Meta"}</p>
              </div>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="captains-feature-shell rounded-3xl p-5 md:p-7"
            onMouseEnter={() => setHeroHover(true)}
            onMouseLeave={() => setHeroHover(false)}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f8d479]/30 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8d479]">
              <Crown className="h-3.5 w-3.5" /> Meta King Spotlight
            </div>

            <div className="relative mx-auto mt-4 w-[min(78vw,350px)]">
              <TiltCard className="relative rounded-[1.35rem]">
                <div className="captains-feature-card relative overflow-hidden rounded-[1.35rem] border border-white/20 p-2.5">
                  <img
                    src={`/api/card-image?id=${featuredId}&variant=p1`}
                    alt={featuredName}
                    className="aspect-[5/7] w-full rounded-xl border border-white/20 object-cover shadow-2xl"
                  />
                </div>
              </TiltCard>

              <motion.div
                animate={{ opacity: heroHover ? 1 : 0.78, x: heroHover ? 0 : -8 }}
                className="captains-aura captains-aura-left"
              >
                <p className="text-[9px] uppercase tracking-[0.12em] text-white/55">Bounty</p>
                <p className="text-sm font-black text-[#f8d479]">{formatBeli(featuredQuote.price)}</p>
                <p className={`text-[10px] font-bold ${featuredQuote.delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {featuredQuote.delta >= 0 ? "+" : ""}
                  {featuredQuote.delta.toFixed(1)}% 24h
                </p>
              </motion.div>

              <motion.div
                animate={{ opacity: heroHover ? 1 : 0.78, x: heroHover ? 0 : 8 }}
                className="captains-aura captains-aura-right"
              >
                <p className="text-[9px] uppercase tracking-[0.12em] text-white/55">Power Level</p>
                <p className="text-sm font-black text-white">#{featuredRank} Meta</p>
                <p className="text-[10px] font-bold text-emerald-300">{featuredWinRate.toFixed(1)}% WR</p>
              </motion.div>

              <motion.div
                animate={{ opacity: heroHover ? 1 : 0.82, y: heroHover ? 0 : 6 }}
                className="captains-aura captains-aura-bottom"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#f8d479]" />
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">Card of the Day</span>
              </motion.div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xl font-black text-white">{featuredName}</p>
              <p className="text-xs text-white/50">{featuredId} · Live spotlight from current meta stream</p>
            </div>
          </motion.article>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">Bento Engine</p>
              <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">From Vibe to Value</h2>
              <p className="mt-1 text-sm text-white/60">Clean signal tiles for meta reads, market checks, and matchup decisions.</p>
            </div>
            <Link href="/matchups" className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white/65 hover:text-white md:inline-flex">
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
                  <p className="text-lg font-black text-white">The Yonko</p>
                  <p className="text-xs text-white/50">Top crews · refreshed {ago(meta?.updatedAt)}</p>
                </div>
                <Link href="/meta" className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--theme-accent-2)] hover:text-white">View all</Link>
              </div>

              <div className="space-y-2.5">
                {topDecks.map((deck, i) => (
                  <Link
                    key={deck.name}
                    href={deck.deckId ? `/meta?deck=${deck.deckId}` : "/meta"}
                    className="captains-yonko-strip group"
                  >
                    <img
                      src={`/api/card-image?id=${deck.cardId || "OP01-001"}&variant=p1`}
                      alt={deck.name}
                      className="h-16 w-12 rounded-lg border border-white/20 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-white">{deck.name}</p>
                        <p className="text-xs font-black text-emerald-300">{(deck.winRate ?? 50).toFixed(1)}%</p>
                      </div>

                      <div className="captains-winrate-track mt-1.5">
                        <div
                          className="captains-winrate-fill"
                          style={{ width: `${Math.max(12, Math.min(100, (deck.winRate ?? 50) + 8))}%` }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
                        <span>#{deck.rank} · {deck.color || "Mixed"}</span>
                        <span>{deck.popularity.toFixed(1)}% field</span>
                      </div>
                    </div>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${i === 0 ? "bg-[#f8d479]/20 text-[#f8d479]" : "bg-white/10 text-white/75"}`}>
                      #{deck.rank}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.04 }}
              className="captains-bento-card col-span-12 md:col-span-4 md:row-span-2"
            >
              <div className="mb-3">
                <p className="text-lg font-black text-white">Bounty Board</p>
                <p className="text-xs text-white/50">Premium watchlist · 24h pulse</p>
              </div>

              <div className="space-y-2">
                {bountyCards.map((card, i) => (
                  <Link
                    key={card.id}
                    href={`/market?card=${encodeURIComponent(card.id)}`}
                    className="captains-bounty-row"
                    style={{ transform: `rotate(${[-1.1, 0.8, -0.5, 1.1, -0.4, 0.6][i] ?? 0}deg)` }}
                  >
                    <img src={`/api/card-image?id=${card.id}`} alt={card.name} className="h-12 w-9 rounded border border-black/30" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-[#2c1c0d]">{card.name}</p>
                      <p className="text-[10px] text-[#614022]">{card.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#2c1c0d]">{formatBeli(card.price)}</p>
                      <p className={`text-[10px] font-bold ${card.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {card.delta >= 0 ? "+" : ""}{card.delta.toFixed(1)}%
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-3">
                <DonButton href="/market" className="w-full justify-center px-3 py-2 text-[10px]">
                  Open Full Bounty Board
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
                  <p className="text-lg font-black text-white">Tournament Radar</p>
                  <p className="text-xs text-white/50">Recent winning lists · click to copy deck code</p>
                </div>
                <CalendarDays className="h-4 w-4 text-[var(--theme-accent-2)]" />
              </div>

              <div className="space-y-2">
                {TOURNAMENT_LOG.map((entry) => (
                  <div key={entry.code} className="rounded-xl border border-white/10 bg-black/25 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{entry.winner}</p>
                        <p className="text-[11px] text-white/55">{entry.event} · {entry.when}</p>
                      </div>
                      <button
                        onClick={() => copyDeckCode(entry.code)}
                        className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/70 hover:text-white"
                      >
                        {copiedCode === entry.code ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-[var(--theme-accent-2)]">{entry.code}</p>
                  </div>
                ))}
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
                  <p className="text-base font-black text-white">Matchup Teaser</p>
                  <p className="text-[11px] text-white/50">Worst pairings for current #1</p>
                </div>
                <TrendingUp className="h-4 w-4 text-[var(--theme-accent-2)]" />
              </div>

              {matrixTeaser ? (
                <>
                  <p className="mb-2 text-xs text-white/70">#{1} {matrixTeaser.anchor.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {matrixTeaser.opponents.map((m) => (
                      <div key={m.deck.id} className={`rounded-lg border px-2 py-1.5 text-xs ${heatClass(m.rate)}`}>
                        <p className="truncate text-[10px] font-bold opacity-85">{m.deck.name}</p>
                        <p className="text-sm font-black">{m.rate}%</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/matchups" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--theme-accent-2)] hover:text-white">
                    See full matrix <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <p className="text-sm text-white/55">Matchup telemetry syncing...</p>
              )}
            </motion.article>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Crown, ScrollText, Sparkles } from "lucide-react";
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

export default function HomePageGroundZeroPhase1() {
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [heroHover, setHeroHover] = useState(false);

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

  useEffect(() => {
    const [topColor] = parseLeaderColors(topDeck?.color);
    setThemeByLeaderColor(topColor);
  }, [topDeck]);

  const featuredId = topDeck?.cardId || MARKET_HOT_CARDS[0]?.id || "OP01-120";
  const featuredName = topDeck?.name || "Shanks";
  const featuredRank = topDeck?.rank || 1;
  const featuredWinRate = topDeck?.winRate ?? 57.2;
  const featuredQuote = BOUNTY_QUOTES[featuredId] || { price: 420, delta: 0.6 };

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
                <p className="mt-1 text-sm font-black text-white">{meta?.sampleGames?.toLocaleString() || "—"} games</p>
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

        <section className="grid gap-3 md:grid-cols-3">
          {[
            {
              href: "/market",
              icon: Crown,
              title: "Bounty Board",
              subtitle: "High-signal market movement and premium targets.",
            },
            {
              href: "/matchups",
              icon: Compass,
              title: "Matchup Matrix",
              subtitle: "From vibe to value: full heatmap and threat reads.",
            },
            {
              href: "/deckbuilder",
              icon: ArrowRight,
              title: "Deck Lab",
              subtitle: "Launch your crew with drag-and-drop deckbuilding.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.07, duration: 0.35 }}
            >
              <Link href={item.href} className="captains-link-tile block rounded-2xl p-4">
                <item.icon className="h-4 w-4 text-[var(--theme-accent-2)]" />
                <p className="mt-2 text-sm font-black text-white">{item.title}</p>
                <p className="mt-1 text-xs text-white/55">{item.subtitle}</p>
              </Link>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}

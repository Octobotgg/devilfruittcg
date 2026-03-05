"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Compass, ScrollText, Swords, TrendingUp, Users, Wallet } from "lucide-react";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";
import type { MetaSnapshot } from "@/lib/data/meta";

type LiveIntelModel = {
  latestSet: string;
  hotMovers: string;
  topDeck: string;
  updatedAt: string;
  sourceLabels: string;
};

function toTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(ms / 60000));
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 md:pt-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,203,82,0.22),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(193,39,45,0.24),transparent_45%),linear-gradient(180deg,#050813_0%,#0a1020_46%,#0a1322_100%)]" />
      <div className="absolute inset-0 opacity-[0.24]" style={{ backgroundImage: "url('/images/grandline-map.svg')", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "url('/images/manga-bg.svg')", backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "screen" }} />

      <div className="pointer-events-none absolute inset-0 opacity-55">
        <svg className="h-full w-full" viewBox="0 0 1440 860" fill="none" preserveAspectRatio="none">
          <path d="M-20 580C234 488 348 698 620 636C854 583 1016 397 1460 482" stroke="rgba(255,203,82,0.44)" strokeWidth="1.6" strokeDasharray="8 11" />
          <path d="M-40 450C180 452 326 348 548 368C824 392 1052 570 1450 522" stroke="rgba(137,183,255,0.26)" strokeWidth="1.3" strokeDasharray="5 9" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-12 md:px-6 md:pb-16">
        <motion.img
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          src="/images/logo-wordmark.svg"
          alt="DevilFruitTCG"
          className="h-10 w-auto opacity-95 md:h-12"
        />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ffcb52]/40 bg-[#20152c]/70 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#ffcb52]"
        >
          <Compass className="h-4 w-4" /> Built by the Crew, for the Crew
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-5 max-w-4xl text-4xl font-black leading-[0.94] text-white md:text-7xl"
        >
          From the One Piece community.
          <span className="mt-2 block bg-gradient-to-r from-[#ffcb52] via-[#fff2b8] to-[#e94057] bg-clip-text text-transparent">
            Back to the community.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="mt-5 max-w-2xl text-base text-white/75 md:text-lg"
        >
          Built by real players to help nakama track prices, find decks, and prep matchups faster.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45 }}
          className="mt-8 grid gap-3 sm:grid-cols-2"
        >
          <Link href="/market" className="rounded-2xl bg-gradient-to-r from-[#ffcb52] to-[#e94057] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.08em] text-black sm:text-base">
            Bounty Board Prices
          </Link>
          <Link href="/matchups" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
            Nakama Meta / Matchups
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33, duration: 0.45 }}
          className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#ffcb52]/30 bg-black/30 px-3 py-2 text-xs text-white/85"
        >
          <span className="rounded-full border border-[#ffcb52]/40 bg-[#2a1d10]/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ffcb52]">Format Watch</span>
          <span>Extra Regulation + Block Icon starts Apr 1, 2026</span>
          <span className="text-white/55">Source: Official OPCG Team Letter</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.45 }}
          className="mt-5 grid gap-2 text-xs md:max-w-2xl md:grid-cols-3"
        >
          <div className="rounded-xl border border-[#ffcb52]/25 bg-black/20 px-3 py-2 text-white/80">2,400+ decks shared</div>
          <div className="rounded-xl border border-[#ffcb52]/25 bg-black/20 px-3 py-2 text-white/80">18k cards tracked this week</div>
          <div className="rounded-xl border border-[#ffcb52]/25 bg-black/20 px-3 py-2 text-white/80">Community-powered updates</div>
        </motion.div>
      </div>
    </section>
  );
}

function ActionTiles() {
  const items = [
    {
      title: "Bounty Board Prices",
      desc: "eBay sold data, player-first filters",
      href: "/market",
      icon: TrendingUp,
      accent: "from-[#ffcb52]/25 to-[#e94057]/15",
    },
    {
      title: "Crew Matchups",
      desc: "What locals and tourneys are actually playing",
      href: "/matchups",
      icon: Swords,
      accent: "from-[#73a7ff]/20 to-[#ffcb52]/10",
    },
    {
      title: "Build with the Crew",
      desc: "Deckbuilder + collection in one place",
      href: "/deckbuilder",
      icon: Wallet,
      accent: "from-[#e94057]/22 to-[#ffcb52]/14",
    },
  ];

  return (
    <section className="pb-8 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                href={item.href}
                className="group relative block overflow-hidden rounded-3xl border border-[#ffcb52]/20 bg-[#0e1629]/90 p-6"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-80`} />
                <div className="absolute right-4 top-4 rounded-full border border-[#ffcb52]/45 bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffcb52]">
                  Wanted
                </div>
                <div className="relative">
                  <item.icon className="h-6 w-6 text-[#ffcb52]" />
                  <h3 className="mt-3 text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/72">{item.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#ffcb52]">
                    Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


function CrewDeckyard() {
  const items = [
    {
      title: "Crew Picks of the Week",
      note: "3 decklists from locals with quick matchup notes",
      stamp: "Crew Pick",
    },
    {
      title: "Budget Upgrade Routes",
      note: "Under-$20 swaps recommended by community grinders",
      stamp: "Budget Route",
    },
    {
      title: "Captain's Notes",
      note: "Short format updates and banlist watch from players",
      stamp: "Logbook",
    },
  ];

  return (
    <section className="pb-8 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#ffcb52]/25 bg-gradient-to-br from-[#1a1a1d]/90 via-[#161a28]/80 to-[#121528]/70 p-6 md:p-7">
          <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "url('/images/manga-bg.svg')", backgroundSize: 'cover', mixBlendMode: 'screen' }} />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#ffcb52]">From the Community Deckyard</p>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Real players. Real lists. Real upgrades.</h2>
            </div>
            <Link
              href="/decks"
              className="inline-flex items-center gap-2 rounded-full border border-[#ffcb52]/40 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffcb52]"
            >
              <Users className="h-4 w-4" /> Submit your deck
            </Link>
          </div>

          <div className="relative mt-5 grid gap-3 md:grid-cols-3">
            {items.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-[#f7d37a]/30 bg-gradient-to-br from-[#2a1f13]/40 to-[#151922]/45 p-4"
              >
                <div className="inline-flex rounded-full border border-[#f7d37a]/50 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#ffd772]">
                  {item.stamp}
                </div>
                <p className="mt-3 text-lg font-black text-white">{item.title}</p>
                <p className="mt-2 text-sm text-white/75">{item.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunityRoutes() {
  const routes = [
    { icon: ScrollText, title: "New Nakama?", note: "Starter route to your first playable deck", href: "/decks" },
    { icon: TrendingUp, title: "Collector Route", note: "Track bounty movers and long holds", href: "/market" },
    { icon: Swords, title: "Tournament Route", note: "Fast matchup prep for next locals", href: "/matchups" },
  ];

  return (
    <section className="pb-8 md:pb-10">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-3">
          {routes.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={r.href} className="group block rounded-2xl border border-[#ffcb52]/20 bg-[#0e1628]/55 p-4 backdrop-blur-sm">
                <r.icon className="h-5 w-5 text-[#ffcb52]" />
                <p className="mt-2 text-lg font-black text-white">{r.title}</p>
                <p className="mt-1 text-sm text-white/70">{r.note}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#ffcb52]">
                  Open Route <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
function LiveIntel({ live }: { live: LiveIntelModel }) {
  return (
    <section className="pb-10 md:pb-14">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="rounded-3xl border border-[#ffcb52]/20 bg-gradient-to-br from-[#0a1630]/70 via-[#0a1227]/55 to-[#0a1220]/45 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-white md:text-3xl">Captain's Log (Live)</h2>
            <div className="rounded-full border border-[#ffcb52]/35 bg-[#2a1d10]/40 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffcb52]">
              Updated {toTimeAgo(live.updatedAt)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Set on Deck</p>
              <p className="mt-2 text-xl font-black text-white">{live.latestSet}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Bounty Movers</p>
              <p className="mt-2 text-xl font-black text-white">{live.hotMovers}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Crew Top Deck This Week</p>
              <p className="mt-2 text-xl font-black text-white">{live.topDeck}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/55">Sources: {live.sourceLabels}</p>
        </div>
      </div>
    </section>
  );
}

function TrustAndFinalCta() {
  return (
    <section className="pb-20 md:pb-24">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="rounded-3xl border border-[#ffcb52]/20 bg-gradient-to-br from-[#0a1630]/68 to-[#081325]/40 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm md:p-6">
            <h3 className="text-2xl font-black text-white">Why the community uses DevilFruitTCG</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/75">
              <li>• Built by One Piece TCG players, not outsiders</li>
              <li>• Prices from real eBay sold listings</li>
              <li>• Meta shaped by tournament + locals results</li>
            </ul>
          </div>

          <Link
            href="/deckbuilder"
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#ffcb52] to-[#e94057] px-8 text-sm font-black uppercase tracking-[0.08em] text-black"
          >
            Share or Build My Deck
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [live, setLive] = useState<LiveIntelModel>({
    latestSet: "OP11 + EB03 Spotlight",
    hotMovers: "Loading…",
    topDeck: "Loading…",
    updatedAt: new Date().toISOString(),
    sourceLabels: "eBay sold data · tournament results",
  });

  const hotCards = useMemo(() => MARKET_HOT_CARDS.slice(0, 3), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [metaRes, ...marketRes] = await Promise.all([
          fetch('/api/meta', { cache: 'no-store' }),
          ...hotCards.map((c) => fetch(`/api/market?id=${encodeURIComponent(c.id)}`, { cache: 'no-store' })),
        ]);

        const meta = (await metaRes.json()) as MetaSnapshot;
        const marketJson = await Promise.all(marketRes.map((r) => r.json()));

        const topDeck = meta?.metaDecks?.[0]
          ? `${meta.metaDecks[0].name} — ${meta.metaDecks[0].winRate != null ? `${meta.metaDecks[0].winRate.toFixed(1)}% WR` : `${meta.metaDecks[0].popularity.toFixed(1)}% share`}`
          : 'Meta data syncing';

        const movers = marketJson
          .slice(0, 3)
          .map((m, i) => {
            const id = hotCards[i]?.id ?? 'OP';
            const avg = typeof m?.ebay?.averagePrice === 'number' ? `$${m.ebay.averagePrice.toFixed(0)}` : '—';
            return `${id} ${avg}`;
          })
          .join(' • ');

        const latestSet = `${hotCards[0]?.set ?? 'OP'} + ${hotCards[1]?.set ?? 'EB'} spotlight`;

        const times = [meta?.updatedAt, ...marketJson.map((m) => m?.lastUpdated)].filter(Boolean) as string[];
        const newest = times.sort((a, b) => +new Date(b) - +new Date(a))[0] ?? new Date().toISOString();

        if (!cancelled) {
          setLive({
            latestSet,
            hotMovers: movers || 'Market syncing',
            topDeck,
            updatedAt: newest,
            sourceLabels: `eBay sold data · ${meta?.source ?? 'seeded'} tournament results`,
          });
        }
      } catch {
        if (!cancelled) {
          setLive((prev) => ({ ...prev, hotMovers: 'Market syncing', topDeck: 'Meta syncing' }));
        }
      }
    };

    run();
    const timer = setInterval(run, 120000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hotCards]);

  return (
    <div className="-mx-4 min-h-screen overflow-x-hidden bg-transparent text-white sm:-mx-6">
      <Hero />
      <ActionTiles />
      <CrewDeckyard />
      <CommunityRoutes />
      <LiveIntel live={live} />
      <TrustAndFinalCta />
    </div>
  );
}


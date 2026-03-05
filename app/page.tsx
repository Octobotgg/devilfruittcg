"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Crown, TrendingUp } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";
import DashboardCard from "@/components/ui/DashboardCard";
import GlowTag from "@/components/ui/GlowTag";
import DonButton from "@/components/ui/DonButton";
import TickerRow from "@/components/ui/TickerRow";
import { setThemeByLeaderColor, type LeaderColor } from "@/lib/theme/leader-theme";

function ago(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toLeaderColor(raw?: string): LeaderColor {
  const v = (raw || "").toLowerCase();
  if (v.includes("red")) return "red";
  if (v.includes("green")) return "green";
  if (v.includes("blue")) return "blue";
  if (v.includes("purple")) return "purple";
  if (v.includes("black")) return "black";
  if (v.includes("yellow")) return "yellow";
  return "red";
}

export default function HomePagePhase1() {
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);

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

  const topDecks = useMemo(() => meta?.metaDecks?.slice(0, 3) || [], [meta]);

  useEffect(() => {
    const topColor = toLeaderColor(topDecks[0]?.color);
    setThemeByLeaderColor(topColor);
  }, [topDecks]);

  const nav = [
    { href: "/collection", label: "Cards" },
    { href: "/meta", label: "Meta" },
    { href: "/matchups", label: "Matchups" },
    { href: "/decks", label: "Decklists" },
    { href: "/market", label: "Bounty Board" },
  ];

  const movers = MARKET_HOT_CARDS.slice(0, 5).map((c, i) => ({
    ...c,
    delta: [6.4, 3.2, -1.1, 2.7, -0.8][i] ?? 0,
  }));

  const tournaments = [
    { name: "Treasure Cup", date: "Mar 14", place: "New York" },
    { name: "Regionals S1", date: "Mar 28", place: "Dallas" },
    { name: "Store Finals", date: "Apr 05", place: "Online" },
  ];

  return (
    <div className="space-y-4 pb-12 md:space-y-5 md:pb-16">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="sticky top-3 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 backdrop-blur-md md:px-5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo-wordmark.svg" alt="DevilFruitTCG" className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.label} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-primary)]/90 hover:bg-white/10">
                {n.label}
              </Link>
            ))}
          </nav>

          <DonButton href="/deckbuilder">Build Deck</DonButton>
        </div>
      </motion.header>

      <TickerRow
        items={[
          { label: "OP01-120", value: "$1,429", delta: 5.2 },
          { label: "OP09-118", value: "$899", delta: -1.7 },
          { label: "Manga Ace", value: "$2,750", delta: 3.1 },
          { label: "SP Nami", value: "$620", delta: 2.3 },
          { label: "OP12-020", value: "$208", delta: 1.2 },
        ]}
      />

      <section className="bento-grid">
        <DashboardCard title="The Yonko" subtitle={`Top meta decks · Updated ${ago(meta?.updatedAt)}`} className="col-span-12 md:col-span-8">
          <div className="grid gap-4 md:grid-cols-3">
            {topDecks.map((deck, i) => (
              <Link key={deck.name} href={deck.deckId ? `/meta?deck=${deck.deckId}` : "/meta"} className="group">
                <div className={`relative rounded-xl border border-white/15 bg-black/20 p-3 ${i === 1 ? "md:-mt-2" : ""}`}>
                  <div className="relative mx-auto h-44 w-32">
                    <img
                      src={`/api/card-image?id=${deck.cardId || "OP14-001"}&variant=p1`}
                      alt={deck.name}
                      className="h-44 w-32 rounded-xl border border-white/20 object-cover shadow-2xl"
                    />
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm font-black text-white">{deck.name}</p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <GlowTag>#{deck.rank}</GlowTag>
                    <span className="font-bold text-[var(--theme-accent-2)]">{(deck.winRate ?? 50).toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                    <span>{deck.color}</span>
                    <span>{deck.popularity.toFixed(1)}% field</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Bounty Movers" subtitle="24h market movement" className="col-span-12 md:col-span-4">
          <div className="space-y-2.5">
            {movers.map((c) => (
              <Link key={c.id} href={`/market?search=${encodeURIComponent(c.id)}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2 hover:bg-black/30">
                <img src={`/api/card-image?id=${c.id}`} alt={c.name} className="h-11 w-8 rounded border border-white/15" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-[11px] text-white/50">{c.id}</p>
                </div>
                <span className={`text-xs font-black ${c.delta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                  {c.delta >= 0 ? "+" : ""}{c.delta.toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-3">
            <DonButton href="/market">Open Bounty Board</DonButton>
          </div>
        </DashboardCard>

        <DashboardCard title="Tournament Radar" subtitle="Upcoming major play" className="col-span-12 md:col-span-4">
          <div className="space-y-2.5">
            {tournaments.map((t) => (
              <div key={t.name} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <CalendarDays className="h-4 w-4 text-[var(--theme-accent-2)]" />
                </div>
                <p className="text-xs text-white/60">{t.date} · {t.place}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Command Links" subtitle="Fast paths" className="col-span-12 md:col-span-8">
          <div className="grid gap-2 md:grid-cols-4">
            {[
              { href: "/collection", title: "Card Search", icon: Crown },
              { href: "/matchups", title: "Winrate Matrix", icon: TrendingUp },
              { href: "/meta", title: "Top Leaders", icon: Crown },
              { href: "/deckbuilder", title: "Deck Lab", icon: ArrowRight },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="rounded-xl border border-white/10 bg-black/25 p-3 hover:border-[var(--theme-ring)]">
                <item.icon className="h-4 w-4 text-[var(--theme-accent-2)]" />
                <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
              </Link>
            ))}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}

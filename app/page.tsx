"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Compass, Swords, BarChart3, Search, LayoutGrid, ArrowRight } from "lucide-react";
import type { MetaSnapshot } from "@/lib/data/meta";

function ago(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const WATCHLIST = [
  { id: "OP01-120", name: "Shanks", tag: "High Demand" },
  { id: "OP09-118", name: "Gol D. Roger", tag: "Premium" },
  { id: "OP12-020", name: "Trafalgar Law", tag: "Meta Staple" },
  { id: "OP13-119", name: "Marshall.D.Teach", tag: "Top Meta" },
  { id: "P-001", name: "Monkey.D.Luffy", tag: "Collector" },
  { id: "PRB01-001", name: "Roronoa Zoro", tag: "Reprint Hit" },
];

export default function HomePageV31() {
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch("/api/meta");
        if (!r.ok) return;
        setMeta(await r.json());
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  const topDeck = useMemo(() => meta?.metaDecks?.[0], [meta]);

  const nav = [
    { href: "/collection", label: "Cards" },
    { href: "/meta", label: "Meta" },
    { href: "/matchups", label: "Matchups" },
    { href: "/decks", label: "Decklists" },
    { href: "/market", label: "Market" },
  ];

  const modules = [
    { href: "/collection", title: "Card Database", note: "All sets and variants", icon: Search },
    { href: "/meta", title: "Meta Snapshot", note: "Leaders and trends", icon: BarChart3 },
    { href: "/matchups", title: "Leader Matchups", note: "Compare any leaders", icon: Swords },
    { href: "/deckbuilder", title: "Deck Builder", note: "Build and test lists", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-7 pb-12 md:space-y-8 md:pb-16">
      {/* Top Nav */}
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="sticky top-3 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-[#c9b286] bg-[#fff7e6]/95 px-4 py-2 backdrop-blur-md md:px-5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo-wordmark.svg" alt="DevilFruitTCG" className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.label} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1f2430] hover:bg-[#f3e3be]">
                {n.label}
              </Link>
            ))}
          </nav>

          <Link href="/matchups" className="rounded-lg bg-[#b3262d] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white">
            Leader Compare
          </Link>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#d6c19a] bg-gradient-to-b from-[#fff8ea] via-[#f6eddc] to-[#efe2cc] p-6 md:p-9">
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "url('/images/grandline-map.svg')", backgroundSize: "cover" }} />

        <div className="grid items-center gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#b68a3d] bg-[#fff3d8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b5a1f]">
              <Compass className="h-3.5 w-3.5" /> One Piece TCG Hub
            </p>

            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-[#1f2430] md:text-5xl">
              Explore cards, prep matchups, and track the meta.
            </h1>

            <p className="mt-3 max-w-xl text-sm text-[#384355] md:text-base">
              A player-first home for One Piece TCG data with a cleaner experience and faster navigation.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Updated {ago(meta?.updatedAt)}</span>
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Top deck: {topDeck?.name || "Loading..."}</span>
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Sample: {meta?.sampleGames ? meta.sampleGames.toLocaleString() : "—"} games</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative h-[220px] md:h-[270px]">
            <img src="/api/card-image?id=OP01-120&variant=p1" alt="Shanks" className="absolute left-4 top-12 h-40 w-28 rotate-[-10deg] rounded-xl border border-[#c2b08a] shadow-xl md:h-48 md:w-32" />
            <img src="/api/card-image?id=OP09-118&variant=p1" alt="Roger" className="absolute left-24 top-4 h-44 w-30 rotate-[2deg] rounded-xl border border-[#c2b08a] shadow-2xl md:left-28 md:h-52 md:w-36" />
            <img src="/api/card-image?id=OP13-119&variant=p1" alt="Teach" className="absolute right-2 top-14 h-40 w-28 rotate-[12deg] rounded-xl border border-[#c2b08a] shadow-xl md:h-48 md:w-32" />
          </motion.div>
        </div>
      </section>

      {/* Watchlist strip */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Popular / Expensive Watchlist</h2>
          <Link href="/market" className="text-xs font-bold uppercase tracking-[0.08em] text-[#f0c040]">Open market</Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {WATCHLIST.map((c) => (
            <Link
              key={c.id}
              href={`/market?search=${encodeURIComponent(c.id)}`}
              className="min-w-[180px] rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-black/30"
            >
              <div className="flex items-center gap-3">
                <img src={`/api/card-image?id=${c.id}&variant=p1`} alt={c.name} className="h-16 w-11 rounded border border-white/10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-white/50">{c.id}</p>
                  <span className="mt-1 inline-block rounded-full bg-[#f0c040]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#f0c040]">
                    {c.tag}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Core modules */}
      <section>
        <div className="grid gap-3 md:grid-cols-4">
          {modules.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <Link href={m.href} className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-[#f0c040]/45">
                <m.icon className="h-5 w-5 text-[#f0c040]" />
                <h3 className="mt-2 text-lg font-black text-white">{m.title}</h3>
                <p className="mt-1 text-xs text-white/65">{m.note}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#f0c040]">
                  Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

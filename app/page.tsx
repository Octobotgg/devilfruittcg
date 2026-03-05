"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Compass, Swords, BarChart3, Search, LayoutGrid, ArrowRight } from "lucide-react";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";
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

export default function HomePageV3() {
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
    {
      href: "/collection",
      title: "Card Database",
      note: "Official card data across OP/EB/ST/PRB/P",
      icon: Search,
      preview: ["OP14-001", "OP13-001"],
    },
    {
      href: "/meta",
      title: "Meta Snapshot",
      note: "Current leaders, field share, and deck trends",
      icon: BarChart3,
      preview: [topDeck?.cardId || "OP14-001", "OP12-001"],
    },
    {
      href: "/matchups",
      title: "Leader Matchups",
      note: "Leader vs Leader matrix and direct compare",
      icon: Swords,
      preview: ["OP13-001", "OP14-001"],
    },
    {
      href: "/deckbuilder",
      title: "Deck Builder",
      note: "Build, test, and iterate your list quickly",
      icon: LayoutGrid,
      preview: ["OP09-078", "OP12-020"],
    },
  ];

  return (
    <div className="space-y-8 pb-14 md:space-y-10 md:pb-20">
      {/* Homepage Top Nav */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-3 z-40"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-[#c9b286] bg-[#fff7e6]/95 px-4 py-2 backdrop-blur-md md:px-5">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo-wordmark.svg" alt="DevilFruitTCG" className="h-8 w-auto" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.href + n.label}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1f2430] hover:bg-[#f3e3be]"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/matchups"
            className="rounded-lg bg-[#b3262d] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white"
          >
            Leader Compare
          </Link>
        </div>
      </motion.header>

      {/* Hero / Artwork */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#d6c19a] bg-gradient-to-b from-[#fff8ea] via-[#f6eddc] to-[#efe2cc] p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "url('/images/grandline-map.svg')", backgroundSize: "cover" }} />

        <div className="grid items-center gap-6 md:grid-cols-[1.15fr_0.85fr]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#b68a3d] bg-[#fff3d8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b5a1f]">
              <Compass className="h-3.5 w-3.5" /> One Piece TCG Hub
            </p>

            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-[#1f2430] md:text-5xl">
              A cleaner way to explore cards, meta, and matchups.
            </h1>

            <p className="mt-3 max-w-xl text-sm text-[#384355] md:text-base">
              Built for players who want real information fast — while keeping the One Piece card-game spirit on every page.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Updated {ago(meta?.updatedAt)}</span>
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Top deck: {topDeck?.name || "Loading..."}</span>
              <span className="rounded-full border border-[#cdb48e] bg-white/70 px-2.5 py-1 text-[#2d3445]">Sample: {meta?.sampleGames ? meta.sampleGames.toLocaleString() : "—"} games</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative h-[220px] md:h-[280px]">
            <img src="/images/straw-hat.png" alt="Straw Hat" className="absolute -right-3 -top-7 h-24 w-24 rotate-12 opacity-80 md:h-28 md:w-28" />

            <img src="/api/card-image?id=OP14-001&variant=p1" alt="Leader card" className="absolute left-2 top-8 h-40 w-28 rotate-[-12deg] rounded-xl border border-[#c2b08a] shadow-xl md:h-48 md:w-32" />
            <img src="/api/card-image?id=OP13-001&variant=p1" alt="Leader card" className="absolute left-24 top-3 h-44 w-30 rotate-[2deg] rounded-xl border border-[#c2b08a] shadow-2xl md:left-28 md:h-52 md:w-36" />
            <img src="/api/card-image?id=OP12-001&variant=p1" alt="Leader card" className="absolute right-1 top-10 h-40 w-28 rotate-[13deg] rounded-xl border border-[#c2b08a] shadow-xl md:h-48 md:w-32" />
          </motion.div>
        </div>
      </section>

      {/* Core modules */}
      <section>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Link href={m.href} className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#f0c040]/45">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <m.icon className="h-5 w-5 text-[#f0c040]" />
                    <h3 className="mt-3 text-xl font-black text-white">{m.title}</h3>
                    <p className="mt-1 text-sm text-white/65">{m.note}</p>
                  </div>
                  <div className="relative h-16 w-20 shrink-0">
                    <img src={`/api/card-image?id=${m.preview[0]}`} alt={m.title} className="absolute left-0 top-2 h-14 w-10 -rotate-6 rounded border border-white/20" />
                    <img src={`/api/card-image?id=${m.preview[1]}`} alt={m.title} className="absolute right-0 top-0 h-14 w-10 rotate-6 rounded border border-white/20" />
                  </div>
                </div>

                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#f0c040]">
                  Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Artwork + pulse */}
      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black text-white">Featured Card Pulse</h2>
          <p className="mt-1 text-sm text-white/60">What players are watching right now.</p>

          <div className="mt-4 grid gap-2">
            {MARKET_HOT_CARDS.slice(0, 5).map((c) => (
              <Link key={c.id} href={`/market?search=${encodeURIComponent(c.id)}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2 hover:bg-black/30">
                <img src={`/api/card-image?id=${c.id}`} alt={c.name} className="h-12 w-9 rounded border border-white/10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-white/50">{c.id} · {c.set || "Set"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#132342]/70 to-[#0f1628]/70 p-5">
          <h2 className="text-xl font-black text-white">Why people stay</h2>
          <div className="mt-4 space-y-3 text-sm text-white/75">
            <p>• Real card coverage from official set releases</p>
            <p>• Leader matchup compare built for practical prep</p>
            <p>• Decklist drilldown with tournament context</p>
            <p>• Fast navigation between cards, meta, and matchups</p>
          </div>
        </div>
      </section>
    </div>
  );
}

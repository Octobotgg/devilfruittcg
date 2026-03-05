"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Search, Swords, Layers3 } from "lucide-react";
import { MARKET_HOT_CARDS } from "@/lib/featured-cards";
import type { MetaSnapshot } from "@/lib/data/meta";

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HomePageV2() {
  const [meta, setMeta] = useState<MetaSnapshot | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch("/api/meta");
        if (!r.ok) return;
        setMeta(await r.json());
      } catch {
        // silent fallback
      }
    };
    run();
  }, []);

  const topDeck = useMemo(() => meta?.metaDecks?.[0], [meta]);
  const hot = useMemo(() => MARKET_HOT_CARDS.slice(0, 3), []);

  const modules = [
    {
      title: "Card Database",
      note: "Browse all official sets and variants",
      href: "/market",
      icon: Search,
    },
    {
      title: "Meta Snapshot",
      note: "See top leaders and trends now",
      href: "/meta",
      icon: BarChart3,
    },
    {
      title: "Leader Matchups",
      note: "Compare leader vs leader instantly",
      href: "/matchups",
      icon: Swords,
    },
    {
      title: "Deck Builder",
      note: "Build and test your list quickly",
      href: "/deckbuilder",
      icon: Layers3,
    },
  ];

  return (
    <div className="space-y-8 pb-16 md:space-y-10 md:pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[#c7b18a] bg-gradient-to-b from-[#f7f1e4] to-[#efe5d1] p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url('/images/grandline-map.svg')", backgroundSize: "cover", backgroundPosition: "center" }} />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="inline-flex rounded-full border border-[#b68a3d] bg-[#fff7e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a5a1f]">
            One Piece TCG Intel Hub
          </p>

          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-[#1f2430] md:text-5xl">
            One place for cards, meta, and matchup prep.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-[#3a4456] md:text-base">
            Built for fast decisions: search cards, compare leaders, and check real tournament trends without the clutter.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 max-w-xl">
            <Link href="/market" className="rounded-xl bg-[#b3252b] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-white hover:opacity-95">
              Search Cards
            </Link>
            <Link href="/matchups" className="rounded-xl border border-[#2b3a5a] bg-white px-5 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] text-[#1f2430] hover:bg-[#f4f7ff]">
              Compare Leaders
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Trust strip */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-white/40">Data update</p>
            <p className="font-bold text-white">{timeAgo(meta?.updatedAt)}</p>
          </div>
          <div>
            <p className="text-white/40">Top deck now</p>
            <p className="font-bold text-white truncate">{topDeck?.name || "Loading…"}</p>
          </div>
          <div>
            <p className="text-white/40">Sample games</p>
            <p className="font-bold text-white">{meta?.sampleGames ? meta.sampleGames.toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-white/40">Current format</p>
            <p className="font-bold text-white">OP14</p>
          </div>
        </div>
      </section>

      {/* Start here */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-black text-white">Start here</h2>
        <div className="mt-3 grid gap-2 text-sm text-white/80 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">1) Pick your format</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">2) Search your leader</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">3) Check matchups</div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">4) Open top decklists</div>
        </div>
      </section>

      {/* Module cards */}
      <section>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <Link href={m.href} className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#f0c040]/40">
                <m.icon className="h-5 w-5 text-[#f0c040]" />
                <h3 className="mt-3 text-xl font-black text-white">{m.title}</h3>
                <p className="mt-1 text-sm text-white/65">{m.note}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#f0c040]">
                  Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick market pulse */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Quick market pulse</h2>
          <Link href="/market" className="text-xs font-bold uppercase tracking-[0.08em] text-[#f0c040]">Open market</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {hot.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-bold text-white truncate">{c.name}</p>
              <p className="text-xs text-white/50">{c.id}</p>
              <p className="mt-1 text-sm font-bold text-[#f0c040]">Set {c.set || "—"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

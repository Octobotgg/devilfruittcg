"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Anchor,
  ArrowRight,
  Compass,
  Crown,
  Database,
  Radar,
  ShieldCheck,
  Swords,
  TrendingUp,
} from "lucide-react";

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 750);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070b16]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,192,64,0.20),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(220,38,38,0.2),transparent_42%)]" />
      <div className="absolute inset-0 bg-[url('/images/manga-bg.svg')] bg-cover bg-center opacity-[0.16]" />

      <div className="relative text-center">
        <img
          src="/images/logo-concept-crest.svg?v=2"
          alt="DevilFruitTCG crest logo"
          className="mx-auto h-24 w-24 object-contain drop-shadow-[0_0_36px_rgba(240,192,64,0.3)]"
        />
        <p className="mt-4 text-white text-sm tracking-[0.35em] uppercase">Command deck loading</p>
      </div>
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(240,192,64,0.18),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(220,38,38,0.2),transparent_45%),linear-gradient(180deg,#050913_0%,#090f1d_48%,#0b111f_100%)]" />

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <svg className="h-full w-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <path d="M-30 620C210 530 312 705 574 642C842 578 958 430 1230 470C1340 486 1410 515 1480 565" stroke="rgba(240,192,64,0.42)" strokeWidth="1.5" strokeDasharray="7 11" />
          <path d="M-40 490C250 470 418 315 698 358C930 394 1068 562 1480 508" stroke="rgba(155,189,255,0.25)" strokeWidth="1.2" strokeDasharray="5 9" />
          <path d="M210 140L295 200L268 292L175 318L104 255L126 172Z" stroke="rgba(255,255,255,0.16)" />
          <path d="M1050 145L1132 215L1092 305L985 322L923 238L958 159Z" stroke="rgba(255,255,255,0.14)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-14 md:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#F0C040]/40 bg-[#1a1325]/70 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#F0C040]"
        >
          <Compass className="h-4 w-4" />
          Grand Line Intelligence Network
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.7 }}
          className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] text-white md:text-7xl"
        >
          Stop guessing card value.
          <span className="mt-2 block bg-gradient-to-r from-[#F0C040] via-[#f8e7a5] to-[#DC2626] bg-clip-text text-transparent">
            Command the entire catalog.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-6 max-w-2xl text-lg text-white/70"
        >
          DevilFruitTCG is your flagship console for One Piece TCG: full card discovery, live market tracking, matchup intelligence, and collection command in one continuous flow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link href="/market" className="group">
            <button className="rounded-2xl bg-gradient-to-r from-[#F0C040] to-[#DC2626] px-8 py-4 font-black text-black transition-transform group-hover:scale-[1.02]">
              <span className="flex items-center gap-2">
                Open Market Command
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </Link>
          <Link href="/matchups">
            <button className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white hover:border-[#F0C040]/50 hover:bg-white/10">
              Open Tactical Matrix
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function IntelligenceStrip() {
  const items = [
    {
      icon: Database,
      title: "Catalog Coverage",
      value: "OP01–OP15 + EB",
      note: "Searchable card index, not a limited featured subset",
    },
    {
      icon: TrendingUp,
      title: "Market Signal",
      value: "Live price rails",
      note: "eBay and TCG data lines aligned for decisions",
    },
    {
      icon: ShieldCheck,
      title: "Data Integrity",
      value: "Consistency sweep",
      note: "Identity checks across home, market, and card paths",
    },
    {
      icon: Radar,
      title: "Matchup Intel",
      value: "eBay-aligned intel",
      note: "Production matchup data path is wired and live",
    },
  ];

  return (
    <section className="relative pb-16 md:pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12172a] via-[#12162b] to-[#17111f] p-6"
            >
              <item.icon className="h-6 w-6 text-[#F0C040]" />
              <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/45">{item.title}</p>
              <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
              <p className="mt-2 text-sm text-white/60">{item.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperationsGrid() {
  const ops = [
    {
      icon: TrendingUp,
      title: "Market Watch",
      desc: "Scan every set, filter by rarity/cost/color, inspect price history instantly.",
      href: "/market",
    },
    {
      icon: Swords,
      title: "Matchup Matrix",
      desc: "Read the lanes that matter before tournament rounds and side decisions.",
      href: "/matchups",
    },
    {
      icon: Crown,
      title: "Meta Theater",
      desc: "Track top decks and pressure shifts with the command-brief format.",
      href: "/meta",
    },
    {
      icon: Anchor,
      title: "Collection Command",
      desc: "Know what to hold, sell, and chase with one portfolio-style view.",
      href: "/collection",
    },
  ];

  return (
    <section className="pb-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F0C040]/90">Operations</p>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">Everything in one war-room flow.</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {ops.map((op, i) => (
            <motion.div
              key={op.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={op.href}>
                <div className="group h-full rounded-3xl border border-white/10 bg-[#0f1528]/70 p-7 transition-all hover:-translate-y-1 hover:border-[#F0C040]/40 hover:bg-[#121a31]">
                  <op.icon className="h-7 w-7 text-[#F0C040]" />
                  <h3 className="mt-4 text-2xl font-black text-white">{op.title}</h3>
                  <p className="mt-3 text-white/65">{op.desc}</p>
                  <p className="mt-5 inline-flex items-center gap-2 font-semibold text-[#F0C040]">
                    Enter module <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070b16] text-white">
      <AnimatePresence>{loading && <LoadingScreen onComplete={() => setLoading(false)} />}</AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: loading ? 0 : 1 }} transition={{ duration: 0.45 }}>
        <HeroSection />
        <IntelligenceStrip />
        <OperationsGrid />
      </motion.div>
    </div>
  );
}

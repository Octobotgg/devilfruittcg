"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Swords, BarChart3, Package } from "lucide-react";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/market?card=${encodeURIComponent(query.trim())}`);
    }
  }

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6 text-[#f0c040]" />,
      title: "Market Watch",
      desc: "Live prices from eBay last 5 sold + TCGPlayer. Know the real value before you buy or sell.",
      href: "/market",
    },
    {
      icon: <Swords className="w-6 h-6 text-[#f0c040]" />,
      title: "Matchup Matrix",
      desc: "Win rates by deck matchup powered by OPTCG Sim logs. Know your odds before you sit down.",
      href: "/matchups",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-[#f0c040]" />,
      title: "Meta Snapshot",
      desc: "Top decks from recent tournaments. See what's winning regionals right now.",
      href: "/meta",
    },
    {
      icon: <Package className="w-6 h-6 text-[#f0c040]" />,
      title: "Collection Tracker",
      desc: "Track what you own. See your collection value live. Know what to sell, hold, or hunt.",
      href: "/collection",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="text-center pt-16 pb-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full px-4 py-1.5 text-sm text-[#f0c040] mb-6">
          🏴‍☠️ One Piece TCG Command Center
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="text-white">DevilFruit</span>
          <span className="text-[#f0c040]">TCG</span>
          <span className="text-white/40">.gg</span>
        </h1>
        <p className="text-xl text-white/60 mb-10">
          Market prices, matchup data, meta tracking — everything you need to play smarter and buy better.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any card — Luffy, Zoro, Shanks, OP01-001..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f0c040]/50 focus:bg-white/8 transition-all"
            />
          </div>
          <button
            type="submit"
            className="bg-[#f0c040] hover:bg-[#f0c040]/90 text-black font-semibold px-6 py-4 rounded-xl transition-colors"
          >
            Search
          </button>
        </form>
      </section>

      {/* Stats Bar */}
      <section className="w-full max-w-3xl mb-16">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Cards Tracked", value: "24+" },
            { label: "Price Updates", value: "Hourly" },
            { label: "Sets Covered", value: "OP01–OP08 + ST" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-[#f0c040]">{stat.value}</div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">What&apos;s Inside</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f) => (
            <a
              key={f.href}
              href={f.href}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#f0c040]/30 hover:bg-white/8 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                {f.icon}
                <h3 className="font-semibold text-white">{f.title}</h3>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

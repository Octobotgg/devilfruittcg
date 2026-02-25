"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Swords, BarChart3, Package, ArrowRight, Zap, MapPin, Bell } from "lucide-react";

// Real OPTCG card images from the official CDN
const FEATURED_CARDS = [
  { id: "OP07-001", name: "Luffy Gear 5", img: "/api/card-image?id=OP07-001" },
  { id: "OP05-002", name: "Shanks", img: "/api/card-image?id=OP05-002" },
  { id: "OP08-001", name: "Blackbeard", img: "/api/card-image?id=OP08-001" },
  { id: "OP05-001", name: "Enel", img: "/api/card-image?id=OP05-001" },
  { id: "OP04-001", name: "Kaido", img: "/api/card-image?id=OP04-001" },
];

const FEATURES = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Market Watch",
    desc: "eBay last 5 sold + TCGPlayer prices. Know the real value before you buy or sell.",
    href: "/market",
    color: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: <Swords className="w-5 h-5" />,
    title: "Matchup Matrix",
    desc: "Win rates powered by OPTCG Sim logs. Know your odds before you sit down.",
    href: "/matchups",
    color: "from-red-500/20 to-orange-500/10",
    border: "border-red-500/20",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Meta Snapshot",
    desc: "Top decks from recent tournaments. See what's winning regionals right now.",
    href: "/meta",
    color: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: <Package className="w-5 h-5" />,
    title: "Collection Tracker",
    desc: "Track what you own. See your live collection value. Know what to sell or hold.",
    href: "/collection",
    color: "from-purple-500/20 to-violet-500/10",
    border: "border-purple-500/20",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Local Drop Alerts",
    desc: "Get notified when Fayetteville stores restock booster boxes and singles.",
    href: "/drops",
    color: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
    soon: true,
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Price Alerts",
    desc: "Set a target price on any card. We'll ping you when it hits.",
    href: "/alerts",
    color: "from-pink-500/20 to-rose-500/10",
    border: "border-pink-500/20",
    soon: true,
  },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/market?card=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="ocean-bg min-h-screen -mt-8 -mx-4 px-4 pt-8">
      {/* Scan line effect */}
      <div className="scan-line" />

      {/* Hero Section */}
      <section className="relative text-center pt-20 pb-16 max-w-5xl mx-auto">
        {/* Floating card art background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {FEATURED_CARDS.map((card, i) => (
            <div
              key={card.id}
              className="absolute opacity-10 hover:opacity-20 transition-opacity"
              style={{
                top: `${10 + (i * 15)}%`,
                left: i % 2 === 0 ? `${2 + i * 3}%` : `${75 - i * 3}%`,
                transform: `rotate(${i % 2 === 0 ? -8 + i : 8 - i}deg)`,
                animationDelay: `${i * 0.8}s`,
              }}
            >
              {!imgErrors[card.id] ? (
                <img
                  src={card.img}
                  alt={card.name}
                  width={80}
                  height={112}
                  className="rounded-lg shadow-2xl float"
                  onError={() => setImgErrors(prev => ({ ...prev, [card.id]: true }))}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-full px-4 py-1.5 text-sm text-[#f0c040] mb-6">
          <Zap className="w-3.5 h-3.5" />
          One Piece TCG Command Center
        </div>

        {/* Title */}
        <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4 leading-none">
          <span className="text-white">Devil</span>
          <span className="text-[#f0c040] text-glow">Fruit</span>
          <span className="text-white">TCG</span>
          <span className="text-white/20">.gg</span>
        </h1>

        <p className="text-xl text-white/50 mb-3 max-w-2xl mx-auto">
          Market prices. Matchup data. Meta tracking.
        </p>
        <p className="text-lg text-white/30 mb-10 max-w-xl mx-auto">
          Everything you need to play smarter and buy better — all free, always.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any card — Luffy, OP07-001, Shanks, Kaido..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/25 focus:outline-none focus:border-[#f0c040]/40 focus:bg-white/8 transition-all text-base"
            />
          </div>
          <button
            type="submit"
            className="bg-[#f0c040] hover:bg-[#f0c040]/90 active:scale-95 text-black font-bold px-6 py-4 rounded-2xl transition-all flex items-center gap-2 pulse-glow"
          >
            Search
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-white/20">
          Try: &quot;Monkey D. Luffy&quot; · &quot;Shanks&quot; · &quot;OP07-001&quot; · &quot;Kaido&quot;
        </p>
      </section>

      {/* Stats Bar */}
      <section className="max-w-3xl mx-auto mb-16">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cards Tracked", value: "24+", icon: "🃏" },
            { label: "Sets Covered", value: "OP01–OP08", icon: "📦" },
            { label: "Always Free", value: "Forever", icon: "🏴‍☠️" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="gradient-border bg-white/3 p-4 text-center"
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-[#f0c040]">{stat.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Cards Strip */}
      <section className="max-w-5xl mx-auto mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white/70">Featured Cards</h2>
          <a href="/market" className="text-sm text-[#f0c040]/70 hover:text-[#f0c040] flex items-center gap-1 transition-colors">
            View market <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {FEATURED_CARDS.map((card, i) => (
            <a
              key={card.id}
              href={`/market?card=${encodeURIComponent(card.name)}`}
              className="flex-shrink-0 group cursor-pointer"
            >
              <div className="relative w-28 card-shine">
                {!imgErrors[card.id] ? (
                  <img
                    src={card.img}
                    alt={card.name}
                    className="w-28 rounded-xl shadow-2xl border border-white/10 group-hover:border-[#f0c040]/40 group-hover:scale-105 transition-all duration-300"
                    style={{ animationDelay: `${i * 0.3}s` }}
                    onError={() => setImgErrors(prev => ({ ...prev, [card.id]: true }))}
                  />
                ) : (
                  <div className="w-28 h-40 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-3xl">🃏</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white font-medium text-center truncate">{card.name}</p>
                </div>
              </div>
            </a>
          ))}
          <a
            href="/market"
            className="flex-shrink-0 w-28 h-40 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/60 hover:border-white/40 transition-all"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs">More</span>
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-5xl mx-auto mb-20">
        <h2 className="text-2xl font-bold text-white mb-2">Everything in One Place</h2>
        <p className="text-white/40 mb-8">Built for One Piece TCG players by players. No paywalls. No BS.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <a
              key={f.href}
              href={f.href}
              className={`relative bg-gradient-to-br ${f.color} border ${f.border} rounded-2xl p-5 hover:scale-[1.02] transition-all duration-200 card-shine group`}
            >
              {f.soon && (
                <span className="absolute top-3 right-3 text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              <div className={`inline-flex p-2 rounded-lg bg-white/10 text-[#f0c040] mb-3`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              <div className="flex items-center gap-1 text-xs text-[#f0c040]/60 mt-3 group-hover:text-[#f0c040] transition-colors">
                Explore <ArrowRight className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-5xl mx-auto mb-20">
        <div className="relative overflow-hidden rounded-3xl border border-[#f0c040]/20 bg-gradient-to-r from-[#f0c040]/5 via-[#f0c040]/10 to-[#f0c040]/5 p-10 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMGMwNDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02em0xMiAwaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <h2 className="text-3xl font-bold text-white mb-3 relative">
            Ready to play smarter? 🏴‍☠️
          </h2>
          <p className="text-white/50 mb-6 relative max-w-md mx-auto">
            Search any card and see real market data in seconds. No signup, no credit card.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a card..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f0c040]/50 transition-all"
            />
            <button
              type="submit"
              className="bg-[#f0c040] text-black font-bold px-5 py-3 rounded-xl hover:bg-[#f0c040]/90 transition-colors"
            >
              Go
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

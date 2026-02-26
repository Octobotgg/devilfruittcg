"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, Swords, BarChart3, Package, ChevronRight, Anchor, Compass, Map, Scroll } from "lucide-react";

// One Piece color palette
const COLORS = {
  strawHat: "#DC2626",      // Luffy's hat red
  gold: "#F0C040",          // Treasure gold
  navy: "#0F172A",          // Deep navy
  royalBlue: "#1E3A8A",     // Grand Line blue
  parchment: "#FEF3C7",     // Old map parchment
  ink: "#1A1A2E",           // Manga ink
  berry: "#F59E0B",         // Berry gold
  seaFoam: "#0EA5E9",       // Ocean blue
};

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#0a0f1e]">
      {/* Animated Background Layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Parallax Ocean */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 50% ${100 + scrollY * 0.1}%, #1e3a8a 0%, transparent 70%)`,
          }}
        />
        {/* Floating Clouds */}
        <div 
          className="absolute w-[800px] h-[400px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl"
          style={{
            top: `${10 + scrollY * 0.05}%`,
            left: `${-10 + (mousePos.x * 0.02)}%`,
            transform: `translateX(${scrollY * 0.2}px)`,
          }}
        />
        <div 
          className="absolute w-[600px] h-[300px] bg-gradient-to-l from-amber-500/5 to-transparent rounded-full blur-3xl"
          style={{
            top: `${30 + scrollY * 0.03}%`,
            right: `${-5 - (mousePos.x * 0.01)}%`,
            transform: `translateX(${-scrollY * 0.15}px)`,
          }}
        />
        {/* Grand Line Map Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20,20 Q40,5 60,20 T100,20 M20,50 Q40,35 60,50 T100,50 M20,80 Q40,65 60,80 T100,80' stroke='%23f0c040' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0a0f1e] via-[#0a0f1e]/90 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#991B1B] rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all">
                  <span className="text-xl">👒</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F0C040] rounded-full animate-pulse" />
              </div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-white">Devil</span>
                <span className="text-[#F0C040]">Fruit</span>
                <span className="text-white/60 text-sm font-normal">TCG.gg</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {[
                { href: "/market", label: "Market", icon: TrendingUp },
                { href: "/matchups", label: "Matchups", icon: Swords },
                { href: "/meta", label: "Meta", icon: BarChart3 },
                { href: "/collection", label: "Collection", icon: Package },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-white/60 hover:text-white text-sm font-medium transition-all hover:bg-white/5 rounded-lg flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Animated Sun */}
        <div 
          className="absolute top-20 right-20 w-40 h-40 rounded-full bg-gradient-to-br from-[#F0C040] to-[#DC2626] opacity-20 blur-3xl animate-pulse"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          {/* Pre-title */}
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#F0C040]/20 rounded-full">
            <Compass className="w-4 h-4 text-[#F0C040] animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-[#F0C040] text-sm font-medium tracking-wider uppercase">The Grand Line Awaits</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 leading-none">
            <span 
              className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F0C040] to-white"
              style={{
                textShadow: '0 0 80px rgba(240,192,64,0.3)',
              }}
            >
              DEVIL
            </span>
            <span 
              className="block text-transparent bg-clip-text bg-gradient-to-r from-[#DC2626] via-[#F0C040] to-[#DC2626]"
              style={{
                textShadow: '0 0 100px rgba(220,38,38,0.4)',
              }}
            >
              FRUIT
            </span>
          </h1>

          {/* Subtitle with typewriter effect */}
          <p className="text-xl md:text-2xl text-white/60 mb-8 max-w-2xl mx-auto font-light">
            The ultimate <span className="text-[#F0C040] font-semibold">One Piece TCG</span> command center.
            <br />
            <span className="text-white/40">Market prices. Matchup data. Meta dominance.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/market"
              className="group relative px-8 py-4 bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white font-bold rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-500/25"
            >
              <span className="relative z-10 flex items-center gap-2">
                Set Sail
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#F0C040] to-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/collection"
              className="px-8 py-4 bg-white/5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-[#F0C040]/50 transition-all"
            >
              Build Your Collection
            </Link>
          </div>

          {/* Featured Cards Carousel */}
          <div className="relative">
            <div className="flex items-center justify-center gap-4 md:gap-8 perspective-1000">
              {[
                { id: "OP07-001", name: "Luffy Gear 5", rotate: -15, z: -50 },
                { id: "OP05-002", name: "Shanks", rotate: -8, z: -25 },
                { id: "OP08-001", name: "Blackbeard", rotate: 0, z: 0 },
                { id: "OP05-001", name: "Enel", rotate: 8, z: -25 },
                { id: "OP04-001", name: "Kaido", rotate: 15, z: -50 },
              ].map((card, i) => (
                <div
                  key={card.id}
                  className="relative group cursor-pointer"
                  style={{
                    transform: `rotateY(${card.rotate}deg) translateZ(${card.z}px)`,
                    transition: 'transform 0.5s ease',
                  }}
                >
                  <div className="relative w-24 md:w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl group-hover:shadow-[#F0C040]/20 group-hover:scale-110 transition-all duration-500">
                    <img
                      src={`/api/card-image?id=${card.id}`}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Holographic Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                      style={{ transform: 'translateX(-100%) rotate(45deg)', animation: 'shine 2s infinite' }}
                    />
                    {/* Rarity Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F0C040]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Card Shadow */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/50 blur-xl rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <Scroll className="w-6 h-6 text-white/30" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-24 bg-gradient-to-b from-transparent via-[#0f172a]/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Anchor, value: "800+", label: "Cards Tracked", color: "from-blue-500 to-cyan-400" },
              { icon: Map, value: "15", label: "Sets Covered", color: "from-amber-500 to-yellow-400" },
              { icon: TrendingUp, value: "12", label: "Meta Decks", color: "from-green-500 to-emerald-400" },
              { icon: Compass, value: "∞", label: "Adventure", color: "from-red-500 to-rose-400" },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="group relative p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#F0C040]/30 transition-all"
              >
                <div className={`w-12 h-12 mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Your <span className="text-[#F0C040]">Treasure</span> Map
            </h2>
            <p className="text-white/50 text-lg">Everything you need to conquer the meta</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Market Watch",
                desc: "Live prices from eBay and TCGPlayer. Know the true value of every card.",
                color: "from-amber-500/20 to-yellow-500/10",
                border: "border-amber-500/20",
                href: "/market",
              },
              {
                icon: Swords,
                title: "Matchup Matrix",
                desc: "Win rates powered by tournament data. Know your matchups before you play.",
                color: "from-red-500/20 to-rose-500/10",
                border: "border-red-500/20",
                href: "/matchups",
              },
              {
                icon: BarChart3,
                title: "Meta Snapshot",
                desc: "Top decks from recent tournaments. Stay ahead of the meta curve.",
                color: "from-blue-500/20 to-indigo-500/10",
                border: "border-blue-500/20",
                href: "/meta",
              },
              {
                icon: Package,
                title: "Collection Tracker",
                desc: "Track your cards, see live value, know what to sell or hold.",
                color: "from-purple-500/20 to-violet-500/10",
                border: "border-purple-500/20",
                href: "/collection",
              },
              {
                icon: Map,
                title: "Local Drop Alerts",
                desc: "Get notified when Fayetteville stores restock. Never miss a drop.",
                color: "from-green-500/20 to-emerald-500/10",
                border: "border-green-500/20",
                href: "#",
                soon: true,
              },
              {
                icon: Scroll,
                title: "Price Alerts",
                desc: "Set targets on any card. We'll notify you when prices hit.",
                color: "from-pink-500/20 to-rose-500/10",
                border: "border-pink-500/20",
                href: "#",
                soon: true,
              },
            ].map((feature, i) => (
              <Link
                key={i}
                href={feature.href}
                className={`group relative p-6 bg-gradient-to-br ${feature.color} ${feature.border} border rounded-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
              >
                {feature.soon && (
                  <span className="absolute top-4 right-4 text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-[#F0C040]/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#F0C040]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
                </div>
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#F0C040]/0 via-[#F0C040]/5] to-[#F0C040]/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#DC2626]/10 via-[#F0C040]/10 to-[#DC2626]/10" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            Ready to find the
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F0C040] to-[#DC2626]">
              One Piece?
            </span>
          </h2>
          <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of players tracking cards, analyzing matchups, and dominating the meta.
          </p>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-xl hover:scale-105 hover:shadow-2xl hover:shadow-[#F0C040]/25 transition-all"
          >
            <Anchor className="w-5 h-5" />
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👒</span>
              <span className="text-white/60 text-sm">
                © 2026 DevilFruitTCG.gg — Built for the community
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <span>Not affiliated with Bandai Namco or Toei Animation</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}

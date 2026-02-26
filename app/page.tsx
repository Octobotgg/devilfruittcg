"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Search, TrendingUp, Swords, BarChart3, Package, 
  ChevronRight, Compass, Anchor, Zap, Crown, ArrowRight
} from "lucide-react";

// Loading Screen Component
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 900);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0a0f1e]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Low-cost manga background (static image + subtle gradient), no particle animation */}
      <div className="absolute inset-0 bg-[url('/images/manga-bg.svg')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1e]/60 via-[#0a0f1e]/85 to-[#0a0f1e]" />

      <div className="relative text-center px-6">
        <motion.div
          className="mb-6 inline-block"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-32 h-32 rounded-3xl bg-white/5 border border-[#F0C040]/25 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-[#F0C040]/15">
            <img
              src="/images/straw-hat.png"
              alt="Luffy's Straw Hat"
              className="w-24 h-24 object-contain"
            />
          </div>
        </motion.div>

        <p className="text-white text-lg font-black tracking-wide">DEVILFRUITTCG.GG</p>
        <p className="mt-1 text-white/45 text-xs tracking-[0.22em] uppercase">Loading your command center</p>

        <div className="mt-5 h-1.5 w-56 bg-white/10 rounded-full overflow-hidden mx-auto border border-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-[#DC2626] via-[#F0C040] to-[#DC2626]"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Navigation
function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      animate={{
        paddingTop: scrolled ? "0.75rem" : "1.5rem",
        paddingBottom: scrolled ? "0.75rem" : "1.5rem",
        backgroundColor: scrolled ? "rgba(10, 15, 30, 0.85)" : "rgba(0,0,0,0)",
        backdropFilter: scrolled ? "blur(20px)" : "blur(0px)",
        borderBottom: scrolled ? "1px solid rgba(240, 192, 64, 0.15)" : "1px solid rgba(240,192,64,0)",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.1, rotate: 10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-2xl shadow-red-500/30">
              <img src="/images/straw-hat.png" alt="Luffy's Straw Hat" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F0C040] rounded-full animate-pulse shadow-lg shadow-yellow-500/50" />
          </motion.div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              DEVIL<span className="text-[#F0C040]">FRUIT</span>
            </span>
            <span className="block text-[10px] text-white/40 tracking-[0.3em] uppercase">TCG.gg</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {[
            { href: "/market", label: "Market", icon: TrendingUp },
            { href: "/matchups", label: "Matchups", icon: Swords },
            { href: "/meta", label: "Meta", icon: Crown },
            { href: "/collection", label: "Collection", icon: Package },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                className="px-5 py-2.5 text-white/60 hover:text-white text-sm font-medium rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </motion.div>
            </Link>
          ))}
        </div>

        <Link href="/market">
          <motion.button
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-xl"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(240, 192, 64, 0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-4 h-4" />
            Search Cards
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
}

// Hero Section
function HeroSection() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);


  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-[#DC2626]/20 to-transparent rounded-full blur-[120px]"
          animate={{ x: [0, 24, 0], y: [0, 14, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-l from-[#F0C040]/20 to-transparent rounded-full blur-[100px]"
          animate={{ x: [0, -18, 0], y: [0, -18, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(240,192,64,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(240,192,64,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Manga texture overlay (static, lightweight) */}
        <div className="absolute inset-0 bg-[url('/images/manga-bg.svg')] bg-cover bg-center opacity-[0.08]" />
      </div>

      {/* Content */}
      <motion.div className="relative z-10 max-w-6xl mx-auto px-6 text-center" style={{ opacity }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-white/5 border border-[#F0C040]/30 rounded-full backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Compass className="w-4 h-4 text-[#F0C040]" />
          </motion.div>
          <span className="text-[#F0C040] text-sm font-medium tracking-wider uppercase">The Grand Line Awaits</span>
        </motion.div>

        {/* Main Title */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-7xl md:text-9xl lg:text-[10rem] font-black leading-none tracking-tighter"
          >
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50">
              DEVIL
            </span>
            <motion.span
              className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F0C040] via-[#DC2626] to-[#F0C040]"
              animate={{
                backgroundPosition: ["0%", "100%", "0%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{
                backgroundSize: "200% 100%",
              }}
            >
              FRUIT
            </motion.span>
          </motion.h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-xl md:text-2xl text-white/40 mb-12 max-w-2xl mx-auto font-light"
        >
          The ultimate <span className="text-[#F0C040] font-semibold">One Piece TCG</span> platform.
          <br />
          <span className="text-white/30">Market intelligence. Meta dominance. Treasure hunting.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/market">
            <motion.button
              className="group relative px-8 py-4 bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white font-bold rounded-2xl overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Explore Market
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#F0C040] to-[#DC2626]"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>
          <Link href="/collection">
            <motion.button
              className="px-8 py-4 bg-white/5 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 hover:border-[#F0C040]/50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Build Collection
            </motion.button>
          </Link>
        </motion.div>

        {/* Featured Cards 3D Carousel */}
        <motion.div
          style={{ y: y1 }}
          className="mt-20 perspective-2000"
        >
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {[
              { id: "OP01-002", name: "Roronoa Zoro", rotate: -25, z: -100, y: 20 },
              { id: "OP02-001", name: "Whitebeard", rotate: -12, z: -50, y: 10 },
              { id: "OP08-009", name: "Gol D. Roger", rotate: 0, z: 0, y: 0 },
              { id: "OP05-040", name: "Shanks", rotate: 12, z: -50, y: 10 },
              { id: "OP03-012", name: "Kaido", rotate: 25, z: -100, y: 20 },
            ].map((card, i) => (
              <motion.div
                key={card.id}
                className="relative group cursor-pointer"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: card.y }}
                transition={{ delay: 1.4 + i * 0.1 }}
                whileHover={{ 
                  y: card.y - 20, 
                  rotateY: card.rotate * 0.5,
                  z: 50,
                  transition: { duration: 0.3 }
                }}
                style={{
                  transform: `rotateY(${card.rotate}deg) translateZ(${card.z}px)`,
                  transformStyle: "preserve-3d",
                }}
              >
                <div className="relative w-20 md:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-[#F0C040]/30 transition-shadow duration-500">
                  <img
                    src={`/api/card-image?id=${card.id}`}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent"
                    initial={{ x: "-100%", opacity: 0 }}
                    whileHover={{ x: "100%", opacity: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                  {/* Rarity Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#F0C040]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Shadow */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/50 blur-xl rounded-full group-hover:blur-2xl transition-all" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
    </section>
  );
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: "800+", label: "Cards Tracked", icon: Anchor, color: "from-blue-500 to-cyan-400" },
    { value: "15", label: "Sets", icon: Compass, color: "from-amber-500 to-yellow-400" },
    { value: "12", label: "Meta Decks", icon: Crown, color: "from-purple-500 to-pink-400" },
    { value: "24/7", label: "Live Prices", icon: Zap, color: "from-green-500 to-emerald-400" },
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative p-6 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-sm hover:border-[#F0C040]/30 transition-all group"
            >
              <div className={`w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-4xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Features Grid
function FeaturesSection() {
  const features = [
    {
      icon: TrendingUp,
      title: "Market Watch",
      desc: "Real-time prices from eBay and TCGPlayer. Know the true value before you trade.",
      color: "from-amber-500/20 to-yellow-500/10",
      border: "border-amber-500/20",
      href: "/market",
    },
    {
      icon: Swords,
      title: "Matchup Matrix",
      desc: "Win rates powered by tournament data. Know your matchups before you sit down.",
      color: "from-red-500/20 to-rose-500/10",
      border: "border-red-500/20",
      href: "/matchups",
    },
    {
      icon: Crown,
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
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Your <span className="text-[#F0C040]">Treasure Map</span>
          </h2>
          <p className="text-white/40 text-lg">Everything you need to conquer the Grand Line</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={feature.href}>
                <motion.div
                  className={`relative p-8 bg-gradient-to-br ${feature.color} ${feature.border} border rounded-3xl h-full overflow-hidden group cursor-pointer`}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="relative z-10">
                    <motion.div 
                      className="w-16 h-16 mb-6 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-[#F0C040]/20 transition-colors"
                      whileHover={{ rotate: 10 }}
                    >
                      <feature.icon className="w-8 h-8 text-[#F0C040]" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-white/50 leading-relaxed">{feature.desc}</p>
                    <motion.div
                      className="mt-6 flex items-center gap-2 text-[#F0C040] font-semibold"
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                    >
                      Explore <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </div>
                  {/* Hover Glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-tr from-[#F0C040]/0 via-[#F0C040]/10 to-[#F0C040]/0"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#DC2626]/10 via-[#F0C040]/10 to-[#DC2626]/10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto px-6 text-center"
      >
        <h2 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
          Ready to find the
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F0C040] to-[#DC2626]">
            One Piece?
          </span>
        </h2>
        <p className="text-white/40 text-xl mb-10 max-w-xl mx-auto">
          Join thousands of players tracking cards, analyzing matchups, and dominating the meta.
        </p>
        <Link href="/market">
          <motion.button
            className="px-10 py-5 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-2xl text-lg"
            whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(240, 192, 64, 0.4)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-2">
              <Anchor className="w-5 h-5" />
              Start Your Journey
            </span>
          </motion.button>
        </Link>
      </motion.div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/images/straw-hat.png" alt="Straw Hat" className="w-8 h-8 object-contain" />
            <span className="text-white/40 text-sm">
              © 2026 DevilFruitTCG.gg — Built for the community
            </span>
          </div>
          <span className="text-white/30 text-xs">
            Not affiliated with Bandai Namco or Toei Animation
          </span>
        </div>
      </div>
    </footer>
  );
}

// Main Page
export default function HomePage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {/* Nav lives outside the fade wrapper — always mounted, always on top */}
      <Navigation />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <CTASection />
        <Footer />
      </motion.div>
    </div>
  );
}

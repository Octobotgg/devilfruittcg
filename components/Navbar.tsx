"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, TrendingUp, Swords, Crown, Package, Zap, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/market",      label: "Market",     icon: TrendingUp },
  { href: "/matchups",    label: "Matchups",   icon: Swords     },
  { href: "/meta",        label: "Meta",       icon: Crown      },
  { href: "/decks",       label: "Decks",      icon: BookOpen   },
  { href: "/collection",  label: "Collection", icon: Package    },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Homepage has its own premium nav
  if (pathname === "/") return null;

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-white/5 bg-[#060b18]/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-red-500/20"
          >
            <img src="/images/logo-concept-crest.svg?v=2" alt="DevilFruitTCG crest logo" className="w-full h-full object-cover" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#F0C040] rounded-full animate-pulse" />
          </motion.div>
          <div>
            <span className="font-black text-white text-lg tracking-tight leading-none">
              DEVIL<span className="text-[#F0C040]">FRUIT</span>
            </span>
            <span className="block text-[9px] text-white/30 tracking-[0.3em] uppercase leading-none">TCG.gg</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#F0C040]/10 text-[#F0C040] border border-[#F0C040]/20"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </motion.div>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/market" className="hidden md:block">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#F0C040] to-[#DC2626] text-black font-bold rounded-xl text-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Search Cards
            </motion.button>
          </Link>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/60 hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/5 bg-[#060b18]/95 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-[#F0C040]/10 text-[#F0C040] border border-[#F0C040]/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

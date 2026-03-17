"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, TrendingUp, Swords, Crown, Package, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import AuthNavButton from "@/components/auth/AuthNavButton";

const links = [
  { href: "/market",       label: "Market",      icon: TrendingUp },
  { href: "/matchups",     label: "Matchups",    icon: Swords },
  { href: "/meta",         label: "Meta",        icon: Crown },
  { href: "/decks",        label: "Decks",       icon: BookOpen },
  { href: "/collection",   label: "Collection",  icon: Package },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);


  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="captains-nav-paper sticky top-3 z-50 mx-4 rounded-[24px] border backdrop-blur-xl md:mx-6 xl:mx-auto xl:max-w-7xl"
    >
      <div className="h-18 flex items-center justify-between px-5 md:px-6">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 280 }}
            className="relative"
          >
            <BrandMark compact />
          </motion.div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={`nav-haki-link flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "nav-haki-link-active border-[rgba(212,175,55,0.48)] bg-[rgba(212,175,55,0.1)] text-[var(--theme-accent-2)]"
                      : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
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
          <AuthNavButton />

          <button
            className="md:hidden text-white/60 hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-white/8 bg-[rgba(10,10,10,0.94)]"
          >
            <div className="px-4 py-3 space-y-1">
              <AuthNavButton mobile onNavigate={() => setMobileOpen(false)} />
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "border-[rgba(212,175,55,0.48)] bg-[rgba(212,175,55,0.1)] text-[var(--theme-accent-2)]"
                        : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
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

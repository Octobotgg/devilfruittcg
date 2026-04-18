"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, TrendingUp, Swords, Crown, Package, BookOpen, Compass, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import AuthNavButton from "@/components/auth/AuthNavButton";

type NavChild = { href: string; label: string };

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const links: NavLink[] = [
  { href: "/market",     label: "Market",     icon: TrendingUp },
  { href: "/matchups",   label: "Matchups",   icon: Swords },
  { href: "/meta",       label: "Meta",       icon: Crown },
  { href: "/decks",      label: "Decks",      icon: BookOpen },
  { href: "/collection", label: "Collection", icon: Package },
  {
    href: "/format",
    label: "Format",
    icon: Compass,
    children: [
      { href: "/format/durdles", label: "Durdle" },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="captains-nav-paper sticky top-3 z-50 mx-4 rounded-[24px] md:mx-6 xl:mx-auto xl:max-w-7xl"
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

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");

            if (link.children) {
              return (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setDesktopDropdown(link.label)}
                  onMouseLeave={() => setDesktopDropdown(null)}
                >
                  <Link href={link.href}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className={`nav-haki-link flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "nav-haki-link-active border-[rgba(212,160,84,0.48)] bg-[rgba(212,160,84,0.12)] text-[var(--color-gold)]"
                          : "border-transparent text-[var(--color-parchment-dark)] hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          desktopDropdown === link.label ? "rotate-180" : ""
                        }`}
                      />
                    </motion.div>
                  </Link>

                  <AnimatePresence>
                    {desktopDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2 min-w-[140px] z-50"
                      >
                        <div className="rounded-xl border border-[rgba(212,160,84,0.3)] bg-[rgba(27,40,56,0.97)] backdrop-blur-sm py-1 shadow-xl">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block px-4 py-2 text-sm text-[var(--color-parchment-dark)] hover:text-[var(--color-gold)] hover:bg-[rgba(212,160,84,0.08)] transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link key={link.href} href={link.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={`nav-haki-link flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "nav-haki-link-active border-[rgba(212,160,84,0.48)] bg-[rgba(212,160,84,0.12)] text-[var(--color-gold)]"
                      : "border-transparent text-[var(--color-parchment-dark)] hover:bg-white/8 hover:text-white"
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
            className="md:hidden text-[var(--color-parchment-dark)] hover:text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[rgba(212,160,84,0.2)] bg-[rgba(27,40,56,0.97)]"
          >
            <div className="px-4 py-3 space-y-1">
              <AuthNavButton mobile onNavigate={() => setMobileOpen(false)} />
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + "/");

                if (link.children) {
                  return (
                    <div key={link.href}>
                      <button
                        onClick={() =>
                          setMobileExpanded(mobileExpanded === link.label ? null : link.label)
                        }
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? "border-[rgba(212,160,84,0.48)] bg-[rgba(212,160,84,0.12)] text-[var(--color-gold)]"
                            : "border-transparent text-[var(--color-parchment-dark)] hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <link.icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{link.label}</span>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${
                            mobileExpanded === link.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {mobileExpanded === link.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pt-1 space-y-1">
                              {link.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-[var(--color-parchment-dark)] hover:bg-white/8 hover:text-[var(--color-gold)] transition-all"
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? "border-[rgba(212,160,84,0.48)] bg-[rgba(212,160,84,0.12)] text-[var(--color-gold)]"
                        : "border-transparent text-[var(--color-parchment-dark)] hover:bg-white/8 hover:text-white"
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

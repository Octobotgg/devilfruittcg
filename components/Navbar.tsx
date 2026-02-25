"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/market", label: "Market Watch" },
  { href: "/matchups", label: "Matchups" },
  { href: "/meta", label: "Meta" },
  { href: "/collection", label: "Collection" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 bg-[#f0c040]/10 border border-[#f0c040]/20 rounded-lg flex items-center justify-center text-lg">
            🍇
          </div>
          <span className="font-black text-white text-lg tracking-tight">
            Devil<span className="text-[#f0c040]">Fruit</span>TCG
            <span className="text-white/20 text-sm font-normal">.gg</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-[#f0c040]/10 text-[#f0c040] border border-[#f0c040]/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white/60 hover:text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#060b18]/95 px-4 py-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-[#f0c040]/10 text-[#f0c040]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

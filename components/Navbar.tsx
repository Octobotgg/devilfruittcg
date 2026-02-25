"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/market", label: "Market Watch" },
  { href: "/matchups", label: "Matchup Matrix" },
  { href: "/meta", label: "Meta" },
  { href: "/collection", label: "Collection" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-[#060b18]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🍇</span>
          <span className="font-bold text-white text-lg tracking-tight">
            DevilFruit<span className="text-[#f0c040]">TCG</span>
            <span className="text-white/40">.gg</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-[#f0c040]/10 text-[#f0c040]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu hint */}
        <div className="md:hidden text-white/40 text-sm">Menu</div>
      </div>
    </nav>
  );
}

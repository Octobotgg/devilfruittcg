import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BrandMark from "@/components/BrandMark";

const inter = Inter({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "DevilFruitTCG.gg — Your One Piece TCG Command Center",
  description: "Market prices, matchup data, meta tracking, and more for One Piece TCG players.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${cormorant.variable} min-h-screen playmat-shell`}>
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            {children}
          </main>
          <footer className="captains-footer mt-20 py-10">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <BrandMark compact subtitle="ONE PIECE TCG INTELLIGENCE" />
                </div>
                <p className="max-w-md text-xs text-white/55">
                  Market pricing, matchup signal, and deck tools presented with the feel of a premium collector desk.
                </p>
                <p className="mt-3 text-[11px] text-white/35">
                  Not affiliated with Bandai Namco or Toei Animation
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--theme-accent-2)]">Platform</p>
                <div className="mt-2 space-y-1.5 text-sm text-white/70">
                  <Link href="/collection" className="block hover:text-white">Card Database</Link>
                  <Link href="/meta" className="block hover:text-white">Meta Reports</Link>
                  <Link href="/market" className="block hover:text-white">Market Tracker</Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--theme-accent-2)]">Play Tools</p>
                <div className="mt-2 space-y-1.5 text-sm text-white/70">
                  <Link href="/deckbuilder" className="block hover:text-white">Deck Builder</Link>
                  <Link href="/matchups" className="block hover:text-white">Matchup Matrix</Link>
                  <a href="https://discord.gg/clawd" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                    Community Discord
                  </a>
                  <Link href="/about" className="block hover:text-white">About Us</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

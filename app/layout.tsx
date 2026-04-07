import type { Metadata } from "next";
import Link from "next/link";
import { Pirata_One, Crimson_Pro, DM_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BrandMark from "@/components/BrandMark";

const pirataOne = Pirata_One({ subsets: ["latin"], weight: "400", variable: "--font-pirata", display: "swap" });
const crimsonPro = Crimson_Pro({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--font-crimson", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm", display: "swap" });

export const metadata: Metadata = {
  title: "DevilFruitTCG.gg — The One Piece TCG Home Base",
  description: "One Piece TCG prices, matchups, meta tracking, deck building, and collection tools in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${pirataOne.variable} ${crimsonPro.variable} ${dmSans.variable} min-h-screen`}>
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            {children}
          </main>
          <footer className="captains-footer mt-20 py-10">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <BrandMark compact subtitle="ONE PIECE TCG PRICES + META" />
                </div>
                <p className="max-w-md text-xs text-[var(--color-parchment-dark)]">
                  Market pricing, matchup signal, and deck tools for One Piece players who want one place that feels personal and easy to trust.
                </p>
                <p className="mt-3 text-[11px] text-[var(--color-text-light)]">
                  Not affiliated with Bandai Namco or Toei Animation
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-gold)]">Platform</p>
                <div className="mt-2 space-y-1.5 text-sm text-[var(--color-parchment-dark)]">
                  <Link href="/collection" className="block hover:text-white">Card Database</Link>
                  <Link href="/meta" className="block hover:text-white">Meta Reports</Link>
                  <Link href="/market" className="block hover:text-white">Market Tracker</Link>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-gold)]">Play Tools</p>
                <div className="mt-2 space-y-1.5 text-sm text-[var(--color-parchment-dark)]">
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

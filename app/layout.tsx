import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DevilFruitTCG.gg — Your One Piece TCG Command Center",
  description: "Market prices, matchup data, meta tracking, and more for One Piece TCG players.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0f1e] text-white min-h-screen`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 mt-16 py-8 text-center text-sm text-white/40">
          <p>DevilFruitTCG.gg — Built for One Piece TCG players 🏴‍☠️</p>
          <p className="mt-1">Not affiliated with Bandai Namco or Toei Animation</p>
        </footer>
      </body>
    </html>
  );
}

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
        {/* Ambient background orbs — visible on all interior pages */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#DC2626]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#F0C040]/8 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `linear-gradient(rgba(240,192,64,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(240,192,64,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }} />
        </div>

        <div className="relative z-10">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            {children}
          </main>
          <footer className="border-t border-white/5 mt-20 py-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/images/straw-hat.png" alt="" className="w-6 h-6 object-contain" />
              <span className="text-white/30 text-sm font-medium">DevilFruitTCG.gg</span>
            </div>
            <p className="text-white/20 text-xs">Built for One Piece TCG players · Not affiliated with Bandai Namco or Toei Animation</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

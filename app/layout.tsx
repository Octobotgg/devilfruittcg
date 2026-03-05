import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "DevilFruitTCG.gg — Your One Piece TCG Command Center",
  description: "Market prices, matchup data, meta tracking, and more for One Piece TCG players.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${cinzel.variable} min-h-screen playmat-shell`}>
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            {children}
          </main>
          <footer className="border-t border-white/10 mt-20 py-10 text-center">
            <div className="mb-3 flex items-center justify-center">
              <img src="/images/logo-wordmark.svg" alt="DevilFruitTCG" className="h-10 w-auto opacity-90" />
            </div>
            <p className="text-white/30 text-xs">Built for One Piece TCG players · Not affiliated with Bandai Namco or Toei Animation</p>
          </footer>
        </div>
      </body>
    </html>
  );
}

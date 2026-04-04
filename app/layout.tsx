import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BrandMark from "@/components/BrandMark";
import { absoluteUrl, siteConfig } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Devil Fruit TCG | One Piece TCG Prices, Meta, Matchups, and Deck Builder",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  keywords: [
    "devil fruit tcg",
    "devilfruittcg",
    "one piece tcg",
    "one piece tcg prices",
    "one piece tcg meta",
    "one piece tcg deck builder",
    "one piece tcg card database",
  ],
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    title: "Devil Fruit TCG | One Piece TCG Prices, Meta, Matchups, and Deck Builder",
    description: siteConfig.description,
    images: [
      {
        url: absoluteUrl(siteConfig.socialImage),
        width: 1024,
        height: 1024,
        alt: `${siteConfig.name} emblem`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Devil Fruit TCG | One Piece TCG Prices, Meta, Matchups, and Deck Builder",
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.socialImage)],
  },
  verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "games",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.socialImage),
    sameAs: [siteConfig.url],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-US",
  };

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${cormorant.variable} min-h-screen playmat-shell`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

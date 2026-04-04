import type { Metadata } from "next";
import { Suspense } from "react";
import MarketCatalogView from "@/components/market/MarketCatalogView";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "One Piece TCG Market Prices",
  description: "Browse One Piece TCG market prices, movers, and card value tracking on Devil Fruit TCG.",
  alternates: {
    canonical: absoluteUrl("/market"),
  },
};

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-white/45">Loading market...</div>}>
      <MarketCatalogView />
    </Suspense>
  );
}

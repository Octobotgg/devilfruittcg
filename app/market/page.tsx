import { Suspense } from "react";
import MarketCatalogView from "@/components/market/MarketCatalogView";

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-white/45">Loading market...</div>}>
      <MarketCatalogView />
    </Suspense>
  );
}

import { Suspense } from "react";
import MarketCatalogView from "@/components/market/MarketCatalogView";
import MarketLoadingState from "@/components/market/MarketLoadingState";

export default function MarketPage() {
  return (
    <Suspense fallback={<MarketLoadingState />}>
      <MarketCatalogView />
    </Suspense>
  );
}

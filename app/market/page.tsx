import { Suspense } from "react";
import MarketLoadingState from "@/components/market/MarketLoadingState";
import MarketCatalogPageContent from "./MarketCatalogPageContent";

type MarketPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function MarketPage({ searchParams }: MarketPageProps) {
  return (
    <Suspense fallback={<MarketLoadingState />}>
      <MarketCatalogPageContent searchParams={searchParams} />
    </Suspense>
  );
}

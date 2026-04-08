import MarketCatalogView from "@/components/market/MarketCatalogView";
import { searchMarketCatalog } from "@/lib/market-catalog";
import {
  buildMarketCatalogApiQuery,
  marketUrlStateToCatalogQuery,
  parseMarketUrlState,
  searchParamsRecordToUrlSearchParams,
} from "@/lib/market-query";

type MarketCatalogPageContentProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarketCatalogPageContent({ searchParams }: MarketCatalogPageContentProps) {
  const params = searchParamsRecordToUrlSearchParams(await searchParams);
  const state = parseMarketUrlState(params);
  const initialCatalog = await searchMarketCatalog(marketUrlStateToCatalogQuery(state));
  const initialCatalogKey = `${buildMarketCatalogApiQuery(state)}::0`;

  return <MarketCatalogView initialCatalog={initialCatalog} initialCatalogKey={initialCatalogKey} initialState={state} />;
}

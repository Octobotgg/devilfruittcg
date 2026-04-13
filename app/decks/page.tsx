import DecksPageClient from "./DecksPageClient";
import { getHybridMatchupPayload } from "@/lib/competitive-insights";
import {
  MATCHUPS_DEFAULT_LIMIT,
  MATCHUPS_DEFAULT_FORMAT,
  MATCHUPS_DEFAULT_PERIOD,
  MATCHUPS_PAGE_RANGE,
} from "@/lib/constants/page-defaults";

export const revalidate = 300;

export default async function DecksPage() {
  const payload = await getHybridMatchupPayload({
    format: MATCHUPS_DEFAULT_FORMAT,
    range: MATCHUPS_PAGE_RANGE,
    period: MATCHUPS_DEFAULT_PERIOD,
    limit: MATCHUPS_DEFAULT_LIMIT,
    ranking: "relevance",
    forceMatchIntelV2: true,
  }).catch(() => null);

  return <DecksPageClient initialMatchupDecks={payload?.decks || []} />;
}

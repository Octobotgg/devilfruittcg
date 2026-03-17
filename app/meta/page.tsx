import { Suspense } from "react";
import MetaPageClient from "@/components/meta/MetaPageClient";
import { unstable_cache } from "next/cache";
import { getHybridMetaPayload } from "@/lib/competitive-insights";
import {
  META_DEFAULT_FORMAT,
  META_DEFAULT_REGION,
  META_PAGE_RANGE,
} from "@/lib/constants/page-defaults";
import { getSeededMeta } from "@/lib/data/meta";

export const revalidate = 300;

const getCachedMetaPayload = unstable_cache(
  async () =>
    getHybridMetaPayload({
      format: META_DEFAULT_FORMAT,
      range: META_PAGE_RANGE,
      region: META_DEFAULT_REGION,
    }).catch(() => null),
  ["meta-page-default-payload"],
  { revalidate }
);

export default async function MetaPage() {
  const payload = await getCachedMetaPayload();

  const initialIsLive = Boolean(payload && !String(payload.source || "").toLowerCase().includes("seeded"));
  const initialMeta = payload ?? getSeededMeta();

  return (
    <Suspense fallback={null}>
      <MetaPageClient initialMeta={initialMeta} initialIsLive={initialIsLive} />
    </Suspense>
  );
}

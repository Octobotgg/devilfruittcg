import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { routeCardId } from "@/lib/cards";
import { OFFICIAL_CARDS } from "@/lib/official-cards";

export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();
  const staticEntries = siteConfig.staticRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: generatedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const dynamicCardEntries = Array.from(
    new Map(
      OFFICIAL_CARDS.map((card) => {
        const routeId = decodeURIComponent(routeCardId(card));
        const releaseDate = card.releaseDate ? new Date(card.releaseDate) : generatedAt;
        const lastModified = Number.isNaN(releaseDate.getTime()) ? generatedAt : releaseDate;

        return [
          routeId,
          {
            url: absoluteUrl(`/cards/${encodeURIComponent(routeId)}`),
            lastModified,
            changeFrequency: "weekly" as const,
            priority: card.id === card.baseId ? 0.8 : 0.72,
          },
        ];
      })
    ).values()
  );

  return [...staticEntries, ...dynamicCardEntries];
}

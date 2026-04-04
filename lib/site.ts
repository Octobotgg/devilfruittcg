export const siteConfig = {
  name: "DevilFruitTCG",
  alternateName: "Devil Fruit TCG",
  domain: "devilfruittcg.gg",
  url: "https://devilfruittcg.gg",
  description:
    "Devil Fruit TCG is a One Piece TCG hub for live market prices, meta reports, matchup data, collection tracking, and deck building.",
  socialImage: "/images/logo-refresh/devilfruit-emblem-master.png",
  staticRoutes: [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/collection", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/market", priority: 0.95, changeFrequency: "hourly" as const },
    { path: "/meta", priority: 0.92, changeFrequency: "daily" as const },
    { path: "/matchups", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/deckbuilder", priority: 0.88, changeFrequency: "weekly" as const },
    { path: "/decks", priority: 0.84, changeFrequency: "daily" as const },
    { path: "/players", priority: 0.76, changeFrequency: "weekly" as const },
    { path: "/matchhistory", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ],
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

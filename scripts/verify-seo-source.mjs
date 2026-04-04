import fs from "node:fs/promises";

const checks = [
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/layout.tsx",
    expectations: [
      { pattern: /metadataBase:\s*new URL\(siteConfig\.url\)/, message: "layout metadata should set metadataBase" },
      { pattern: /Devil Fruit TCG \| One Piece TCG Prices, Meta, Matchups, and Deck Builder/, message: "layout should define the stronger site title" },
      { pattern: /application\/ld\+json/, message: "layout should emit JSON-LD structured data" },
      { pattern: /GOOGLE_SITE_VERIFICATION/, message: "layout should support Google site verification" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/page.tsx",
    expectations: [
      { pattern: /export const metadata:\s*Metadata/, message: "homepage should export metadata" },
      { pattern: /Devil Fruit TCG for One Piece TCG Prices, Meta, and Deck Building/, message: "homepage metadata should target the core query" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/components/home/HomePageClient.tsx",
    expectations: [
      { pattern: /Devil Fruit TCG for One Piece TCG/, message: "homepage hero should include the searched phrase" },
      { pattern: /DevilFruitTCG\.gg helps One Piece TCG players/, message: "homepage intro should describe the brand and audience clearly" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/robots.ts",
    expectations: [
      { pattern: /allow:\s*"\/"/, message: "robots route should allow crawling" },
      { pattern: /sitemap:\s*absoluteUrl\("\/sitemap\.xml"\)/, message: "robots route should advertise the sitemap" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/sitemap.ts",
    expectations: [
      { pattern: /siteConfig\.staticRoutes/, message: "sitemap should be generated from the public routes list" },
      { pattern: /changeFrequency/, message: "sitemap entries should include change frequency" },
      { pattern: /OFFICIAL_CARDS/, message: "sitemap should include official card routes" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/cards/[id]/page.tsx",
    expectations: [
      { pattern: /generateMetadata/, message: "card detail page should generate metadata" },
      { pattern: /application\/ld\+json/, message: "card detail page should emit structured data" },
      { pattern: /Price, Details & Variants/, message: "card detail page title should target search intent" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/matchups/page.tsx",
    expectations: [
      { pattern: /One Piece TCG Matchup Matrix/, message: "matchups page should export metadata" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/deckbuilder/layout.tsx",
    expectations: [
      { pattern: /One Piece TCG Deck Builder/, message: "deckbuilder route should define metadata" },
    ],
  },
  {
    file: "/Users/javierbarro/Desktop/devilfruittcg/app/manifest.ts",
    expectations: [
      { pattern: /short_name:\s*siteConfig\.name/, message: "manifest should include the app short name" },
      { pattern: /android-chrome-512x512\.png/, message: "manifest should include app icons" },
    ],
  },
];

const failures = [];

for (const check of checks) {
  const content = await fs.readFile(check.file, "utf8");
  for (const expectation of check.expectations) {
    if (!expectation.pattern.test(content)) {
      failures.push(`${expectation.message} (${check.file})`);
    }
  }
}

if (failures.length) {
  console.error("SEO source verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("SEO source verification passed.");

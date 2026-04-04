import process from "node:process";

const [, , baseUrlArg = "http://127.0.0.1:3000"] = process.argv;
const baseUrl = baseUrlArg.replace(/\/$/, "");

function expect(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function fetchText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "user-agent": "DevilFruitTCG SEO Verifier",
    },
  });

  return {
    status: response.status,
    text: await response.text(),
    headers: response.headers,
  };
}

function extractTagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function extractMetaContent(html, attrName, attrValue) {
  const pattern = new RegExp(
    `<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const reversePattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${attrValue}["'][^>]*>`,
    "i"
  );

  return html.match(pattern)?.[1]?.trim() ?? html.match(reversePattern)?.[1]?.trim() ?? "";
}

function extractCanonicalHref(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  return match?.[1]?.trim() ?? "";
}

async function main() {
  const failures = [];

  const home = await fetchText("/");
  expect(home.status === 200, `Expected / to return 200, received ${home.status}`, failures);
  expect(!/Vercel Security Checkpoint/i.test(home.text), "Homepage is serving a Vercel Security Checkpoint instead of site HTML", failures);

  const title = extractTagContent(home.text, "title");
  const description = extractMetaContent(home.text, "name", "description");
  const canonical = extractCanonicalHref(home.text);

  expect(/devil fruit tcg/i.test(title), `Homepage title should include "Devil Fruit TCG". Got: ${title || "(missing)"}`, failures);
  expect(/one piece tcg/i.test(description), `Homepage description should mention "One Piece TCG". Got: ${description || "(missing)"}`, failures);
  expect(
    /^https:\/\/devilfruittcg\.gg\/?$/i.test(canonical),
    `Homepage canonical should be https://devilfruittcg.gg. Got: ${canonical || "(missing)"}`,
    failures
  );
  expect(/application\/ld\+json/i.test(home.text), "Homepage should include JSON-LD structured data", failures);

  const robots = await fetchText("/robots.txt");
  expect(robots.status === 200, `Expected /robots.txt to return 200, received ${robots.status}`, failures);
  expect(/User-agent:\s*\*/i.test(robots.text), "robots.txt should define rules for all crawlers", failures);
  expect(/Allow:\s*\//i.test(robots.text), "robots.txt should allow crawling", failures);
  expect(
    /Sitemap:\s*https:\/\/devilfruittcg\.gg\/sitemap\.xml/i.test(robots.text),
    "robots.txt should advertise the sitemap URL",
    failures
  );

  const sitemap = await fetchText("/sitemap.xml");
  expect(sitemap.status === 200, `Expected /sitemap.xml to return 200, received ${sitemap.status}`, failures);
  expect(/<urlset/i.test(sitemap.text), "sitemap.xml should return a sitemap urlset", failures);
  expect(/https:\/\/devilfruittcg\.gg\/<\/loc>/i.test(sitemap.text), "sitemap.xml should include the homepage URL", failures);
  expect(/https:\/\/devilfruittcg\.gg\/market<\/loc>/i.test(sitemap.text), "sitemap.xml should include /market", failures);
  expect(/https:\/\/devilfruittcg\.gg\/meta<\/loc>/i.test(sitemap.text), "sitemap.xml should include /meta", failures);
  expect(/https:\/\/devilfruittcg\.gg\/cards\/OP01-001<\/loc>/i.test(sitemap.text), "sitemap.xml should include a representative card detail page", failures);

  const cardPage = await fetchText("/cards/OP01-001");
  expect(cardPage.status === 200, `Expected /cards/OP01-001 to return 200, received ${cardPage.status}`, failures);

  const cardTitle = extractTagContent(cardPage.text, "title");
  const cardDescription = extractMetaContent(cardPage.text, "name", "description");
  const cardCanonical = extractCanonicalHref(cardPage.text);

  expect(/OP01-001/i.test(cardTitle), `Card title should include the card ID. Got: ${cardTitle || "(missing)"}`, failures);
  expect(/price|details|variants/i.test(cardTitle), `Card title should signal search intent. Got: ${cardTitle || "(missing)"}`, failures);
  expect(/one piece tcg/i.test(cardDescription), `Card description should mention "One Piece TCG". Got: ${cardDescription || "(missing)"}`, failures);
  expect(
    /^https:\/\/devilfruittcg\.gg\/cards\/OP01-001\/?$/i.test(cardCanonical),
    `Card canonical should point at the card route. Got: ${cardCanonical || "(missing)"}`,
    failures
  );

  if (failures.length) {
    console.error("SEO verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("SEO verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const apiRoute = fs.readFileSync(
  path.join(process.cwd(), "app/api/matchups/route.ts"),
  "utf8",
);
const headToHeadRoute = fs.readFileSync(
  path.join(process.cwd(), "app/api/matchups/headtohead/route.ts"),
  "utf8",
);
const clientSource = fs.readFileSync(
  path.join(process.cwd(), "components/matchups/MatchupsPageClient.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(
  path.join(process.cwd(), "app/matchups/page.tsx"),
  "utf8",
);
const competitiveInsightsSource = fs.readFileSync(
  path.join(process.cwd(), "lib/competitive-insights.ts"),
  "utf8",
);
const constantsSource = fs.readFileSync(
  path.join(process.cwd(), "lib/constants/page-defaults.ts"),
  "utf8",
);

test("matchups routes and page plumbing are format-first instead of set-first", () => {
  const requiredTokens = [
    'const format = (req.nextUrl.searchParams.get("format") || "OP15").toUpperCase();',
    'ranking: req.nextUrl.searchParams.get("ranking") === "relevance" ? "relevance" : "coverage",',
    "format,",
    "HOME_MATCHUP_FORMAT",
    "MATCHUPS_DEFAULT_FORMAT",
    "const [matchupFormat, setMatchupFormat] = useState<string>(MATCHUPS_DEFAULT_FORMAT);",
    'new URLSearchParams({',
    "format: matchupFormat,",
    'ranking: "relevance",',
    'ranking: "relevance",',
    "forceMatchIntelV2: true,",
    "const matchIntelV2 = true;",
    'summaryLabel: "Weekly global field games",',
    'summaryLabel: "Weekly private field games",',
    "Weekly Pool",
    "Weekly Global",
    "Weekly Private",
  ];

  for (const token of requiredTokens) {
    const source =
      apiRoute.includes(token) ||
      headToHeadRoute.includes(token) ||
      clientSource.includes(token) ||
      pageSource.includes(token) ||
      competitiveInsightsSource.includes(token) ||
      constantsSource.includes(token);

    assert.equal(source, true, `Expected format plumbing token to exist: ${token}`);
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const matchupsPath = path.join(process.cwd(), "components/matchups/MatchupsPageClient.tsx");
const source = fs.readFileSync(matchupsPath, "utf8");

test("matchups page no longer uses the old dark control-board surfaces", () => {
  const oldDarkTokens = [
    "bg-[#0a0f1e]",
    "bg-[#121b2f]",
    "bg-black/30",
    "bg-black/20",
    "bg-black/35",
    "bg-[#0c1324]/95",
    "bg-[#120f17]/90",
    "from-[#1a1325]/90",
    "via-[#111a2e]/90",
  ];

  for (const token of oldDarkTokens) {
    assert.equal(
      source.includes(token),
      false,
      `Expected matchups page to stop using old dark token: ${token}`,
    );
  }
});

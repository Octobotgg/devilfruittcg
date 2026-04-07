import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const matchupsPath = path.join(process.cwd(), "components/matchups/MatchupsPageClient.tsx");
const source = fs.readFileSync(matchupsPath, "utf8");

test("matchups matrix keeps strong row-column hover guidance", () => {
  const requiredTokens = [
    "bg-[rgba(209,91,58,0.1)]",
    "bg-[rgba(209,91,58,0.07)]",
    "scale-[1.06] ring-2 ring-[rgba(209,91,58,0.75)]",
    "border-l border-t border-[rgba(232,223,208,0.78)]",
    "border border-dashed border-[rgba(209,91,58,0.24)]",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected matchups matrix affordance token to exist: ${token}`,
    );
  }
});

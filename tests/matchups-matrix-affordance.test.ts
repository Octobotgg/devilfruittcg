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

test("matchup percentage chips keep the stronger readability treatment", () => {
  const requiredTokens = [
    "text-[28px] leading-none font-black tracking-[-0.05em]",
    "min-w-[128px] items-center justify-center",
    "rounded-[20px] border px-5 py-3",
    "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.94),rgba(245,239,227,0.99)_34%,rgba(240,229,206,0.98)_100%)]",
    "text-[24px] leading-none font-black tracking-[-0.04em]",
    "min-w-[122px] items-center justify-center",
    "bg-[linear-gradient(135deg,rgba(245,239,227,0.99),rgba(241,230,208,0.96))]",
    "text-[#22304a]",
    "rounded-[16px] border px-4 py-2.5",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected matchup readability token to exist: ${token}`,
    );
  }
});

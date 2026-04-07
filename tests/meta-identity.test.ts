import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const metaPagePath = path.join(process.cwd(), "components/meta/MetaPageClient.tsx");
const source = fs.readFileSync(metaPagePath, "utf8");

test("meta page no longer uses the old dark command-brief and modal shells", () => {
  const oldDarkTokens = [
    "from-[#1a1325]/90",
    "via-[#111a2e]/90",
    "to-[#221212]/90",
    "bg-black/20",
    "border-white/10",
    "bg-[#0c1324]",
    "text-white/60",
    "text-white/50",
    "bg-white/[0.03]",
    "bg-[#0c1324]/95",
  ];

  for (const token of oldDarkTokens) {
    assert.equal(
      source.includes(token),
      false,
      `Expected meta page to stop using old dark token: ${token}`,
    );
  }
});

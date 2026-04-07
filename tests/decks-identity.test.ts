import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const decksPagePath = path.join(process.cwd(), "app/decks/page.tsx");
const source = fs.readFileSync(decksPagePath, "utf8");

test("decks page no longer uses the old dark search and card shell tokens", () => {
  const oldDarkTokens = [
    "bg-black/25",
    "bg-black/20",
    "bg-black/30",
    "border-white/10",
    "border-white/12",
    "bg-white/[0.03]",
    "text-white/60",
    "text-white/80",
    "text-white/45",
    "bg-[linear-gradient(180deg,rgba(10,14,24,0.86),rgba(7,10,18,0.9))]",
    "bg-[rgba(4,7,14,0.72)]",
  ];

  for (const token of oldDarkTokens) {
    assert.equal(
      source.includes(token),
      false,
      `Expected decks page to stop using old dark token: ${token}`,
    );
  }
});

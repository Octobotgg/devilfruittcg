import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const cardDetailPath = path.join(process.cwd(), "components/market/CardDetailClient.tsx");
const source = fs.readFileSync(cardDetailPath, "utf8");

test("card detail page no longer uses the old dark identity panel shell", () => {
  const oldDarkTokens = [
    "bg-[#1b2838]",
    "text-[#f5efe3]",
    "border-white/14 bg-white/10",
    "bg-[#08111f] p-2",
    "bg-[rgba(12,16,24,0.86)]",
    "border-white/18 bg-white/10 text-white",
  ];

  for (const token of oldDarkTokens) {
    assert.equal(
      source.includes(token),
      false,
      `Expected card detail page to stop using old dark token: ${token}`,
    );
  }
});

test("card detail hero keeps a richer warm collector treatment", () => {
  const requiredTokens = [
    "bg-[radial-gradient(circle_at_top_left,rgba(240,192,64,0.16),transparent_28%),linear-gradient(145deg,rgba(245,239,227,0.98),rgba(239,230,214,0.98))]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_18px_40px_rgba(27,40,56,0.12)]",
    "border border-[#d4a054]/35 bg-[#fffaf1]",
    "border border-[#dccfb9] bg-[#f3eadc]",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected card detail hero token to exist: ${token}`,
    );
  }
});

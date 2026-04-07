import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/ui/LiveStatusStrip.tsx"),
  "utf8",
);

test("live status strip no longer uses the old dark translucent shell", () => {
  const oldTokens = [
    "bg-black/20",
    "border-white/10",
    "text-white/75",
    "text-white/45",
    "text-white/40",
  ];

  for (const token of oldTokens) {
    assert.equal(
      source.includes(token),
      false,
      `Expected LiveStatusStrip to stop using old token: ${token}`,
    );
  }
});

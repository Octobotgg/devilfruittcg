import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("format surfaces use the singular Durdle label", () => {
  const formatIndex = fs.readFileSync(path.join(REPO_ROOT, "app/format/page.tsx"), "utf8");
  const durdlePage = fs.readFileSync(path.join(REPO_ROOT, "app/format/durdles/page.tsx"), "utf8");
  const navbar = fs.readFileSync(path.join(REPO_ROOT, "components/Navbar.tsx"), "utf8");

  assert.match(formatIndex, />Durdle</);
  assert.doesNotMatch(formatIndex, />Durdles</);
  assert.match(durdlePage, />\s*Durdle\s*</);
  assert.doesNotMatch(durdlePage, />\s*Durdles\s*</);
  assert.match(navbar, /label: "Durdle"/);
});

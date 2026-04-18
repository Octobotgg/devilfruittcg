import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("Durdle page links to the Team Durdle Instagram", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "app/format/durdles/page.tsx"),
    "utf8",
  );

  assert.match(source, /https:\/\/www\.instagram\.com\/teamdurdle\//);
  assert.match(source, /@teamdurdle/);
});

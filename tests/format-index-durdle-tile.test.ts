import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("format index uses the Durdle logo tile instead of leader card art", () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, "app/format/page.tsx"), "utf8");

  assert.match(source, /\/format\/durdles\/durdle-logo\.png/);
  assert.doesNotMatch(source, /\/format\/durdles\/gamer-durdle\.png/);
  assert.match(source, /object-contain/);
});

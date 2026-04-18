import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("Moto uses the updated Moto Durdle identity", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "lib/data/formats/durdles-leaders.ts"),
    "utf8",
  );

  assert.match(source, /slug: 'moto'[\s\S]*name: 'Moto Durdle'/);
  assert.doesNotMatch(source, /slug: 'moto'[\s\S]*name: 'Moto'/);
});

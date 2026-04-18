import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("rule two explains Wanted pool eligibility for new Durdles", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "lib/data/formats/durdles-leaders.ts"),
    "utf8",
  );

  assert.match(
    source,
    /Players who are not part of Team Durdle, and new Durdles who don't have their own leaders, may only choose from the current Wanted leader pool\./,
  );
  assert.match(
    source,
    /Team Durdle members can only play their Rogue\/Wanted leader\./,
  );
});

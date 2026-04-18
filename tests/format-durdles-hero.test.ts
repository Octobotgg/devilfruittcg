import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

test("durdles hero avoids the old dark manga treatment", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "app/format/durdles/page.tsx"),
    "utf8",
  );

  assert.equal(source.includes('className="relative manga-bg py-20 px-4 text-center overflow-hidden"'), false);
  assert.equal(source.includes('className="text-7xl md:text-8xl text-white manga-impact mb-4"'), false);
});

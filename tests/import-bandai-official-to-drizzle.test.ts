import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Projects/devilfruittcg/.worktrees/codex-card-pricing-v1";
const SCRIPT_PATH = path.join(REPO_ROOT, "scripts", "import-bandai-official-to-drizzle.mjs");

function loadSeed() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bandai-seed-"));
  const seedPath = path.join(tempDir, "seed.json");

  execFileSync("node", [SCRIPT_PATH, "--seed-out", seedPath], {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: "pipe",
  });

  return JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    cardPrints: Array<{
      id: string;
      variant_label: string;
      variant_slug: string;
    }>;
  };
}

test("Bandai seed assigns the correct OP13 secret treatments for the premium print slots", () => {
  const seed = loadSeed();
  const byId = new Map(seed.cardPrints.map((row) => [row.id, row]));

  assert.deepEqual(
    {
      id: "OP13-118_p2",
      variant_label: byId.get("OP13-118_p2")?.variant_label,
      variant_slug: byId.get("OP13-118_p2")?.variant_slug,
    },
    {
      id: "OP13-118_p2",
      variant_label: "Super Alternate Art",
      variant_slug: "super_alternate_art_op13_print_2",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-118_p3",
      variant_label: byId.get("OP13-118_p3")?.variant_label,
      variant_slug: byId.get("OP13-118_p3")?.variant_slug,
    },
    {
      id: "OP13-118_p3",
      variant_label: "Red Super Alternate Art",
      variant_slug: "red_super_alternate_art_op13_print_3",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-118_p4",
      variant_label: byId.get("OP13-118_p4")?.variant_label,
      variant_slug: byId.get("OP13-118_p4")?.variant_slug,
    },
    {
      id: "OP13-118_p4",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op13",
    },
  );

  assert.deepEqual(
    {
      id: "OP13-119_p2",
      variant_label: byId.get("OP13-119_p2")?.variant_label,
      variant_slug: byId.get("OP13-119_p2")?.variant_slug,
    },
    {
      id: "OP13-119_p2",
      variant_label: "Super Alternate Art",
      variant_slug: "super_alternate_art_op13_print_2",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-119_p3",
      variant_label: byId.get("OP13-119_p3")?.variant_label,
      variant_slug: byId.get("OP13-119_p3")?.variant_slug,
    },
    {
      id: "OP13-119_p3",
      variant_label: "Red Super Alternate Art",
      variant_slug: "red_super_alternate_art_op13_print_3",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-119_p4",
      variant_label: byId.get("OP13-119_p4")?.variant_label,
      variant_slug: byId.get("OP13-119_p4")?.variant_slug,
    },
    {
      id: "OP13-119_p4",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op13",
    },
  );

  assert.deepEqual(
    {
      id: "OP13-120_p2",
      variant_label: byId.get("OP13-120_p2")?.variant_label,
      variant_slug: byId.get("OP13-120_p2")?.variant_slug,
    },
    {
      id: "OP13-120_p2",
      variant_label: "Super Alternate Art",
      variant_slug: "super_alternate_art_op13_print_2",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-120_p3",
      variant_label: byId.get("OP13-120_p3")?.variant_label,
      variant_slug: byId.get("OP13-120_p3")?.variant_slug,
    },
    {
      id: "OP13-120_p3",
      variant_label: "Red Super Alternate Art",
      variant_slug: "red_super_alternate_art_op13_print_3",
    },
  );
  assert.deepEqual(
    {
      id: "OP13-120_p4",
      variant_label: byId.get("OP13-120_p4")?.variant_label,
      variant_slug: byId.get("OP13-120_p4")?.variant_slug,
    },
    {
      id: "OP13-120_p4",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op13",
    },
  );
});

test("Bandai seed assigns the second OP13 Five Elders premium print as Parallel", () => {
  const seed = loadSeed();
  const byId = new Map(seed.cardPrints.map((row) => [row.id, row]));

  for (const id of ["OP13-080_p2", "OP13-083_p2", "OP13-084_p2", "OP13-089_p2", "OP13-091_p2"]) {
    assert.deepEqual(
      {
        id,
        variant_label: byId.get(id)?.variant_label,
        variant_slug: byId.get(id)?.variant_slug,
      },
      {
        id,
        variant_label: "Parallel",
        variant_slug: `${id.replace(/_p2$/, "") === "OP13-080" ? "parallel_op13_print_2" : "parallel_op13_print_2"}`,
      },
    );
  }
});

test("Bandai seed assigns the correct OP09 premium treatments for ambiguous chase prints", () => {
  const seed = loadSeed();
  const byId = new Map(seed.cardPrints.map((row) => [row.id, row]));

  assert.deepEqual(
    {
      id: "OP09-004_p2",
      variant_label: byId.get("OP09-004_p2")?.variant_label,
      variant_slug: byId.get("OP09-004_p2")?.variant_slug,
    },
    {
      id: "OP09-004_p2",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op09",
    },
  );

  assert.deepEqual(
    {
      id: "OP09-051_p2",
      variant_label: byId.get("OP09-051_p2")?.variant_label,
      variant_slug: byId.get("OP09-051_p2")?.variant_slug,
    },
    {
      id: "OP09-051_p2",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op09",
    },
  );

  assert.deepEqual(
    {
      id: "OP09-093_p1",
      variant_label: byId.get("OP09-093_p1")?.variant_label,
      variant_slug: byId.get("OP09-093_p1")?.variant_slug,
    },
    {
      id: "OP09-093_p1",
      variant_label: "Wanted Poster",
      variant_slug: "wanted_poster_op09",
    },
  );

  assert.deepEqual(
    {
      id: "OP09-119_p2",
      variant_label: byId.get("OP09-119_p2")?.variant_label,
      variant_slug: byId.get("OP09-119_p2")?.variant_slug,
    },
    {
      id: "OP09-119_p2",
      variant_label: "Manga",
      variant_slug: "manga_op09",
    },
  );

  assert.deepEqual(
    {
      id: "ST18-004_p1",
      variant_label: byId.get("ST18-004_p1")?.variant_label,
      variant_slug: byId.get("ST18-004_p1")?.variant_slug,
    },
    {
      id: "ST18-004_p1",
      variant_label: "Treasure Rare",
      variant_slug: "treasure_rare_op09",
    },
  );
});

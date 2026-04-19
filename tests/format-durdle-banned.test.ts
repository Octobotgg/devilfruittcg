import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const REPO_ROOT = "/Users/javierbarro/Documents/Playground/devilfruittcg";

const dataSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/data/formats/durdles-leaders.ts"),
  "utf8",
);
const gallerySource = fs.readFileSync(
  path.join(REPO_ROOT, "app/format/durdles/DurdlesGallery.tsx"),
  "utf8",
);

test("Durdles data exposes banned leaders and marks Pro Durdle as banned", () => {
  assert.match(dataSource, /export type DurdleStatus = 'wanted' \| 'rogue' \| 'banned'/);
  assert.match(dataSource, /slug: 'pro-durdle'[\s\S]*status: 'banned'/);
  assert.match(
    dataSource,
    /slug: 'pro-durdle'[\s\S]*bannedNote: 'Banned after winning Tournament 1 \(Apr 2026\)'/,
  );
  assert.match(dataSource, /export const getBannedLeaders = \(\): DurdleLeader\[\] =>/);
});

test("Durdles gallery renders banned section, badge, modal note, and filter chip", () => {
  assert.match(gallerySource, /function BannedBadge\(\{ small = false \}/);
  assert.match(gallerySource, /leader\.status === "banned"/);
  assert.match(gallerySource, /Banned\s*</);
  assert.match(gallerySource, /Leaders retired from the Wanted pool after winning a tournament\./);
  assert.match(gallerySource, /No leaders have been banned yet\./);
  assert.match(gallerySource, /label="Banned"/);
  assert.match(gallerySource, /setStatusFilter\(statusFilter === "banned" \? null : "banned"\)/);
  assert.match(gallerySource, /leader\.bannedNote/);
  assert.match(gallerySource, /grayscale\(40%\)/);
});

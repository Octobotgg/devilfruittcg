import assert from "node:assert/strict";
import test from "node:test";

import {
  getCompactCurveBarHeight,
  getOverviewSectionLayout,
} from "../lib/deckbuilder-overview-layout.ts";

test("overview layout collapses color split when there is no color data", () => {
  const layout = getOverviewSectionLayout({
    colorDistribution: [],
    typeDistribution: [
      { label: "Character", count: 0, percent: 0 },
      { label: "Event", count: 0, percent: 0 },
      { label: "Stage", count: 0, percent: 0 },
    ],
    powerByCost: [],
  });

  assert.equal(layout.colorSplitMode, "compact");
  assert.equal(layout.typeSplitMode, "compact");
  assert.equal(layout.averagePowerMode, "compact");
});

test("overview layout collapses color split when the deck is single color", () => {
  const layout = getOverviewSectionLayout({
    colorDistribution: [{ label: "Green", count: 8, percent: 100 }],
    typeDistribution: [
      { label: "Character", count: 8, percent: 100 },
      { label: "Event", count: 0, percent: 0 },
      { label: "Stage", count: 0, percent: 0 },
    ],
    powerByCost: [{ label: "1", averagePower: 2000, copies: 8 }],
  });

  assert.equal(layout.colorSplitMode, "compact");
  assert.equal(layout.typeSplitMode, "compact");
  assert.equal(layout.averagePowerMode, "compact");
});

test("overview layout keeps full sections when there is enough data", () => {
  const layout = getOverviewSectionLayout({
    colorDistribution: [
      { label: "Red", count: 22, percent: 44 },
      { label: "Purple", count: 28, percent: 56 },
    ],
    typeDistribution: [
      { label: "Character", count: 36, percent: 72 },
      { label: "Event", count: 10, percent: 20 },
      { label: "Stage", count: 4, percent: 8 },
    ],
    powerByCost: [
      { label: "1", averagePower: 2000, copies: 8 },
      { label: "4", averagePower: 5000, copies: 12 },
    ],
  });

  assert.equal(layout.colorSplitMode, "full");
  assert.equal(layout.typeSplitMode, "full");
  assert.equal(layout.averagePowerMode, "full");
});

test("compact curve bar height uses a shorter visual scale", () => {
  assert.equal(getCompactCurveBarHeight(0, 8), 6);
  assert.equal(getCompactCurveBarHeight(4, 8), 17);
  assert.equal(getCompactCurveBarHeight(8, 8), 34);
});

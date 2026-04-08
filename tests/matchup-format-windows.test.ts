import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.join(process.cwd(), "lib/matchup-format-windows.ts")).href;
const {
  getSupportedMatchupFormats,
  getMatchupFormatWindow,
  isCardLegalInMatchupFormat,
} = await import(moduleUrl);

test("matchup formats expose the latest five release windows including EB formats", () => {
  assert.deepEqual(getSupportedMatchupFormats(), ["OP15", "EB03", "OP14", "OP13", "OP12"]);
});

test("format windows are ordered newest to oldest with explicit release cutoffs", () => {
  assert.deepEqual(getMatchupFormatWindow("OP15"), {
    code: "OP15",
    startDate: "2026-04-03",
    endDate: null,
  });

  assert.deepEqual(getMatchupFormatWindow("EB03"), {
    code: "EB03",
    startDate: "2026-02-20",
    endDate: "2026-04-02",
  });
});

test("matchup format legality never leaks future release windows backward", () => {
  assert.equal(isCardLegalInMatchupFormat("EB03-001", "OP14"), false);
  assert.equal(isCardLegalInMatchupFormat("EB03-001", "EB03"), true);
  assert.equal(isCardLegalInMatchupFormat("OP15-001", "EB03"), false);
  assert.equal(isCardLegalInMatchupFormat("OP12-001", "OP13"), true);
});

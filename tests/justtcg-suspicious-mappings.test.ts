import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

Object.assign(process.env as Record<string, string | undefined>, { NODE_ENV: "test" });

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..");

async function importModule<T>(relativePath: string): Promise<T> {
  return import(pathToFileURL(path.join(REPO_ROOT, relativePath)).href) as Promise<T>;
}

test("classifySuspiciousApprovedMapping flags risky premium auto-approvals", async () => {
  const { classifySuspiciousApprovedMapping } =
    await importModule<typeof import("../scripts/lib/justtcg-suspicious-mappings.mjs")>(
      "scripts/lib/justtcg-suspicious-mappings.mjs",
    );

  const result = classifySuspiciousApprovedMapping({
    cardId: "OP13-120_p2",
    confidence: 0.9,
    status: "auto_approved",
    confidenceReasons: [
      "final_aggressive_review_pass",
      "premium_lane",
      "multiple_premium_candidates_correct_set",
      "multiple_candidates",
      "premium_hint_mismatch",
    ],
    notes: "Final aggressive review pass: multiple_premium_candidates_correct_set",
    bestCandidate: {
      name: "Sabo (120) (Red Super Alternate Art)",
      set: "Carrying On His Will",
      price: 4749.97,
    },
    cardPrintContext: {
      setName: "CARRYING ON HIS WILL [OP-13]",
      variantLabel: "Red Super Alternate Art",
      variantSlug: "red_super_alternate_art_op13_print_2",
    },
  });

  assert.equal(result.suspicious, true);
  assert.equal(result.premium, true);
  assert.equal(result.highPrice, true);
  assert.equal(result.treatment, "Red Super Alternate Art");
  assert.deepEqual(result.flags, [
    "low_confidence",
    "premium_hint_mismatch",
    "aggressive_review",
    "multiple_candidates",
    "high_price",
  ]);
});

test("buildSuspiciousMappingReport focuses on premium suspects by default", async () => {
  const { buildSuspiciousMappingReport } =
    await importModule<typeof import("../scripts/lib/justtcg-suspicious-mappings.mjs")>(
      "scripts/lib/justtcg-suspicious-mappings.mjs",
    );

  const report = buildSuspiciousMappingReport({
    generatedAt: "2026-03-25T00:00:00.000Z",
    results: [
      {
        cardId: "OP13-120_p2",
        confidence: 0.9,
        status: "auto_approved",
        confidenceReasons: ["premium_hint_mismatch", "multiple_candidates"],
        notes: null,
        bestCandidate: {
          name: "Sabo (120) (Red Super Alternate Art)",
          set: "Carrying On His Will",
          price: 4749.97,
        },
        cardPrintContext: {
          setName: "CARRYING ON HIS WILL [OP-13]",
          variantLabel: "Red Super Alternate Art",
          variantSlug: "red_super_alternate_art_op13_print_2",
        },
      },
      {
        cardId: "P-999_p1",
        confidence: 0.99,
        status: "auto_approved",
        confidenceReasons: [],
        notes: null,
        bestCandidate: {
          name: "Judge Promo Something",
          set: "One Piece Promotion Cards",
          price: 500,
        },
        cardPrintContext: {
          setName: "Promotion Cards",
          variantLabel: "Judge Pack",
          variantSlug: "judge_pack",
        },
      },
      {
        cardId: "OP01-001",
        confidence: 0.99,
        status: "auto_approved",
        confidenceReasons: [],
        notes: null,
        bestCandidate: {
          name: "Monkey.D.Luffy (001)",
          set: "Romance Dawn",
          price: 12.5,
        },
        cardPrintContext: {
          setName: "ROMANCE DAWN [OP01]",
          variantLabel: "Base",
          variantSlug: "base",
        },
      },
    ],
  });

  assert.equal(report.summary.totalSuspicious, 2);
  assert.equal(report.summary.premiumSuspicious, 2);
  assert.equal(report.summary.highPriceSuspicious, 2);
  assert.equal(report.rows.length, 2);
  assert.deepEqual(
    report.rows.map((row) => row.cardId),
    ["OP13-120_p2", "P-999_p1"],
  );
});

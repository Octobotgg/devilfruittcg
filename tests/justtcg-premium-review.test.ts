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

test("reviewSuspiciousPremiumMappings promotes a single set-matched premium candidate", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-25T00:00:00.000Z",
      results: [
        {
          cardId: "OP13-120_p2",
          lane: null,
          confidence: 0.9,
          status: "auto_approved",
          searchMethod: "number_exact",
          searchQuery: "OP13-120",
          candidateCount: 5,
          confidenceReasons: ["premium_hint_mismatch", "multiple_candidates", "premium_lane"],
          notes: "Final aggressive review pass",
          bestCandidate: {
            id: "wrong-sabo",
            name: "Sabo (120) (Red Super Alternate Art)",
            set: "Wrong Set",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Red Super Alternate Art",
            variantSlug: "red_super_alternate_art_op13_print_2",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "correct-sabo",
          name: "Sabo (120) (Red Super Alternate Art)",
          number: "OP13-120",
          set_name: "Carrying On His Will",
        },
        {
          id: "wrong-sabo",
          name: "Sabo (120) (Red Super Alternate Art)",
          number: "OP13-120",
          set_name: "Wrong Set",
        },
      ],
    },
    cards: [
      {
        id: "OP13-120_p2",
        name: "Sabo",
        setCode: "OP13",
        number: "120",
        set: "CARRYING ON HIS WILL [OP-13]",
        variantType: "",
        variantLabel: "Red Super Alternate Art",
        variantSlug: "red_super_alternate_art_op13_print_2",
      },
    ],
  });

  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0]?.cardId, "OP13-120_p2");
  assert.equal(result.promoted[0]?.bestCandidate.id, "correct-sabo");
  assert.equal(result.promoted[0]?.cardPrintContext?.variantLabel, "Red Super Alternate Art");
  assert.equal(result.promoted[0]?.cardPrintContext?.setName, "CARRYING ON HIS WILL [OP-13]");
});

test("reviewSuspiciousPremiumMappings leaves ambiguous premium rows for manual review", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-25T00:00:00.000Z",
      results: [
        {
          cardId: "OP13-119_p2",
          lane: null,
          confidence: 0.9,
          status: "auto_approved",
          searchMethod: "number_exact",
          searchQuery: "OP13-119",
          candidateCount: 5,
          confidenceReasons: ["premium_hint_mismatch", "multiple_candidates", "premium_lane"],
          notes: "Final aggressive review pass",
          bestCandidate: {
            id: "candidate-a",
            name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
            set: "Carrying On His Will",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Red Super Alternate Art",
            variantSlug: "red_super_alternate_art_op13_print_2",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "candidate-a",
          name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
          number: "OP13-119",
          set_name: "Carrying On His Will",
        },
        {
          id: "candidate-b",
          name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
          number: "OP13-119",
          set_name: "Carrying On His Will",
        },
      ],
    },
    cards: [
      {
        id: "OP13-119_p2",
        name: "Portgas.D.Ace",
        setCode: "OP13",
        number: "119",
        set: "CARRYING ON HIS WILL [OP-13]",
        variantType: "",
        variantLabel: "Red Super Alternate Art",
        variantSlug: "red_super_alternate_art_op13_print_2",
      },
    ],
  });

  assert.equal(result.promoted.length, 0);
  assert.equal(result.remaining.length, 1);
  assert.equal(result.remaining[0]?.cardId, "OP13-119_p2");
});

test("reviewSuspiciousPremiumMappings prefers the most specific premium treatment match", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-25T00:00:00.000Z",
      results: [
        {
          cardId: "OP13-120_p2",
          lane: null,
          confidence: 0.9,
          status: "auto_approved",
          searchMethod: "number_exact",
          searchQuery: "OP13-120",
          candidateCount: 6,
          confidenceReasons: ["premium_hint_mismatch", "multiple_candidates", "premium_lane"],
          notes: "Final aggressive review pass",
          bestCandidate: {
            id: "parallel-sabo",
            name: "Sabo (120) (Parallel)",
            set: "Carrying On His Will",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Red Super Alternate Art",
            variantSlug: "red_super_alternate_art_op13_print_2",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "red-super-sabo",
          name: "Sabo (120) (Red Super Alternate Art)",
          number: "OP13-120",
          set_name: "Carrying On His Will",
        },
        {
          id: "super-sabo",
          name: "Sabo (120) (Super Alternate Art)",
          number: "OP13-120",
          set_name: "Carrying On His Will",
        },
        {
          id: "parallel-sabo",
          name: "Sabo (120) (Parallel)",
          number: "OP13-120",
          set_name: "Carrying On His Will",
        },
      ],
    },
    cards: [
      {
        id: "OP13-120_p2",
        name: "Sabo",
        setCode: "OP13",
        number: "120",
        set: "CARRYING ON HIS WILL [OP-13]",
        variantType: "",
        variantLabel: "Red Super Alternate Art",
        variantSlug: "red_super_alternate_art_op13_print_2",
      },
    ],
  });

  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0]?.cardId, "OP13-120_p2");
  assert.equal(result.promoted[0]?.bestCandidate.id, "red-super-sabo");
});

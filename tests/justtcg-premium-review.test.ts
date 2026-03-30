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

test("reviewSuspiciousPremiumMappings treats Wanted Poster as a real premium treatment", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-29T00:00:00.000Z",
      results: [
        {
          cardId: "OP13-118_p4",
          lane: null,
          confidence: 0.9,
          status: "auto_approved",
          searchMethod: "number_exact",
          searchQuery: "OP13-118",
          candidateCount: 3,
          confidenceReasons: ["premium_hint_mismatch", "multiple_candidates", "premium_lane"],
          notes: "Final aggressive review pass",
          bestCandidate: {
            id: "luffy-parallel",
            name: "Monkey.D.Luffy (118) (Parallel)",
            set: "Carrying On His Will",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Wanted Poster",
            variantSlug: "wanted_poster_op13",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "luffy-wanted",
          name: "Monkey.D.Luffy (118) (Wanted Poster)",
          number: "OP13-118",
          set_name: "Carrying On His Will",
        },
        {
          id: "luffy-parallel",
          name: "Monkey.D.Luffy (118) (Parallel)",
          number: "OP13-118",
          set_name: "Carrying On His Will",
        },
      ],
    },
    cards: [
      {
        id: "OP13-118_p4",
        name: "Monkey.D.Luffy",
        setCode: "OP13",
        number: "118",
        set: "CARRYING ON HIS WILL [OP-13]",
        variantType: "wanted_poster",
        variantLabel: "Wanted Poster",
        variantSlug: "wanted_poster_op13",
      },
    ],
  });

  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0]?.cardId, "OP13-118_p4");
  assert.equal(result.promoted[0]?.bestCandidate.id, "luffy-wanted");
});

test("reviewSuspiciousPremiumMappings can promote premium needs-review rows using exact treatment hints", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-29T00:00:00.000Z",
      results: [
        {
          cardId: "OP13-119_p2",
          lane: "premium",
          confidence: "low",
          status: "needs_review",
          searchMethod: "number_exact",
          searchQuery: "OP13-119",
          candidateCount: 4,
          confidenceReasons: ["manual_review_required", "multiple_candidates", "premium_lane"],
          notes: "Needs review",
          bestCandidate: {
            id: "ace-red-super",
            name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
            set: "Carrying On His Will",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Super Alternate Art",
            variantSlug: "super_alternate_art_op13_print_2",
          },
        },
        {
          cardId: "OP13-119_p3",
          lane: "premium",
          confidence: "low",
          status: "needs_review",
          searchMethod: "number_exact",
          searchQuery: "OP13-119",
          candidateCount: 4,
          confidenceReasons: ["manual_review_required", "multiple_candidates", "premium_lane"],
          notes: "Needs review",
          bestCandidate: {
            id: "ace-red-super",
            name: "Portgas.D.Ace (119) (Red Super Alternate Art)",
            set: "Carrying On His Will",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            variantLabel: "Red Super Alternate Art",
            variantSlug: "red_super_alternate_art_op13_print_3",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "ace-super",
          name: "Portgas.D.Ace (119) (Super Alternate Art)",
          number: "OP13-119",
          set_name: "Carrying On His Will",
        },
        {
          id: "ace-red-super",
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
        variantType: "alt_art",
        variantLabel: "Super Alternate Art",
        variantSlug: "super_alternate_art_op13_print_2",
      },
      {
        id: "OP13-119_p3",
        name: "Portgas.D.Ace",
        setCode: "OP13",
        number: "119",
        set: "CARRYING ON HIS WILL [OP-13]",
        variantType: "alt_art",
        variantLabel: "Red Super Alternate Art",
        variantSlug: "red_super_alternate_art_op13_print_3",
      },
    ],
  });

  const promotedById = new Map(result.promoted.map((entry) => [entry.cardId, entry.bestCandidate?.id]));
  assert.equal(promotedById.get("OP13-119_p2"), "ace-super");
  assert.equal(promotedById.get("OP13-119_p3"), "ace-red-super");
});

test("reviewSuspiciousPremiumMappings prefers the release-set reprint candidate over the origin-set print", async () => {
  const { reviewSuspiciousPremiumMappings } =
    await importModule<typeof import("../scripts/lib/justtcg-premium-review.mjs")>(
      "scripts/lib/justtcg-premium-review.mjs",
    );

  const result = reviewSuspiciousPremiumMappings({
    report: {
      generatedAt: "2026-03-30T00:00:00.000Z",
      results: [
        {
          cardId: "OP09-118_p3",
          lane: "premium",
          confidence: "medium",
          status: "auto_approved",
          searchMethod: "number_exact",
          searchQuery: "OP09-118",
          candidateCount: 4,
          confidenceReasons: ["multiple_candidates", "premium_lane", "premium_hint_mismatch"],
          notes: "Final aggressive review pass",
          bestCandidate: {
            id: "roger-op09-alt",
            name: "Gol.D.Roger (Alternate Art)",
            set: "Emperors in the New World",
          },
          cardPrintContext: {
            setName: "CARRYING ON HIS WILL [OP-13]",
            releaseCode: "OP13",
            variantLabel: "Wanted Poster",
            variantSlug: "wanted_poster_op13",
          },
        },
      ],
    },
    snapshot: {
      cards: [
        {
          id: "roger-op09-alt",
          name: "Gol.D.Roger (Alternate Art)",
          number: "OP09-118",
          set_name: "Emperors in the New World",
        },
        {
          id: "roger-op13-wanted",
          name: "Gol.D.Roger - OP09-118 (SP) (Wanted Poster)",
          number: "OP09-118",
          set_name: "Carrying On His Will",
        },
      ],
    },
    cards: [
      {
        id: "OP09-118_p3",
        name: "Gol.D.Roger",
        setCode: "OP09",
        releaseCode: "OP13",
        isReprint: true,
        number: "118",
        set: "CARRYING ON HIS WILL [OP-13]",
        originSet: "EMPERORS IN THE NEW WORLD [OP-09]",
        variantType: "parallel",
        variantLabel: "Wanted Poster",
        variantSlug: "wanted_poster_op13",
      },
    ],
  });

  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0]?.cardId, "OP09-118_p3");
  assert.equal(result.promoted[0]?.bestCandidate.id, "roger-op13-wanted");
});

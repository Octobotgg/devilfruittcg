import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const checks = [
  {
    file: "components/home/HomePageClient.tsx",
    banned: [
      "ONE PIECE TCG MARKET + META INTELLIGENCE",
      "Wanted holo",
      "Foil-grade visual focus",
    ],
    required: [
      "ONE PIECE TCG PRICES + META",
      "Featured Card",
      "Card spotlight",
    ],
  },
  {
    file: "components/matchups/MatchupsPageClient.tsx",
    banned: ["Log Pose"],
    required: ["Current Route"],
  },
  {
    file: "app/layout.tsx",
    banned: [
      "ONE PIECE TCG INTELLIGENCE",
      "premium collector desk",
    ],
    required: [
      "ONE PIECE TCG PRICES + META",
      "one place that feels personal and easy to trust",
    ],
  },
  {
    file: "app/matchhistory/page.tsx",
    banned: [
      "Match Intel V2",
      "Match History Command",
    ],
    required: [
      "Player Match Log",
      "Match History",
    ],
  },
  {
    file: "app/globals.css",
    banned: [".glass-card {"],
    required: [],
  },
];

const failures = [];

for (const check of checks) {
  const source = readFileSync(path.join(repoRoot, check.file), "utf8");

  for (const phrase of check.banned) {
    if (source.includes(phrase)) {
      failures.push(`${check.file}: banned phrase still present -> ${phrase}`);
    }
  }

  for (const phrase of check.required) {
    if (!source.includes(phrase)) {
      failures.push(`${check.file}: required phrase missing -> ${phrase}`);
    }
  }
}

if (failures.length) {
  console.error("Site identity sweep verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site identity sweep verification passed.");

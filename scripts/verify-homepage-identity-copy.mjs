import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const homepagePath = path.join(repoRoot, "components/home/HomePageClient.tsx");
const source = readFileSync(homepagePath, "utf8");

const bannedPhrases = [
  "Grand Line command desk",
  "Log Pose Sync",
  "command deck",
  "live tournament desk",
  "Open Log Pose",
  "Open Marine Board",
  "Market Quote",
];

const requiredPhrases = [
  "Captain's Log",
  "Fresh from the line",
  "one place that feels lived-in, clear, and easy to trust",
  "Current route",
  "See the Meta",
  "Open Market",
  "Price Check",
];

const failures = [];

for (const phrase of bannedPhrases) {
  if (source.includes(phrase)) {
    failures.push(`Banned phrase still present: ${phrase}`);
  }
}

for (const phrase of requiredPhrases) {
  if (!source.includes(phrase)) {
    failures.push(`Required phrase missing: ${phrase}`);
  }
}

if (failures.length) {
  console.error("Homepage identity copy verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage identity copy verification passed.");

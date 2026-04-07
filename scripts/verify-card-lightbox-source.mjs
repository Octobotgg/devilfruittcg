import { readFileSync } from "node:fs";

const filePath =
  "/Users/javierbarro/.config/superpowers/worktrees/devilfruittcg/codex-seo-clean-deploy/components/market/CardDetailClient.tsx";

const source = readFileSync(filePath, "utf8");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(source.includes("data-card-image-button"), "Expected clickable card image trigger");
expect(source.includes("data-card-lightbox"), "Expected fullscreen lightbox markup");
expect(/onClick=\{\(\) => setIsLightboxOpen\(true\)\}/.test(source), "Expected click handler to open lightbox");
expect(/Escape/.test(source), "Expected Escape key handling for lightbox close");

if (failures.length) {
  console.error("Card lightbox source verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Card lightbox source verification passed.");

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const modalPath = path.join(process.cwd(), "components/decks/DeckViewModal.tsx");
const source = fs.readFileSync(modalPath, "utf8");

test("deck view modal exposes the approved action bar and close behavior", () => {
  const requiredTokens = [
    "Edit Deck",
    "Share as Image",
    "Export to Sim",
    "CAPTAIN&apos;S LOG",
    "if (event.key === \"Escape\") onClose();",
    "aria-label=\"Close deck view\"",
  ];

  for (const token of requiredTokens) {
    assert.equal(source.includes(token), true, `Expected deck modal token to exist: ${token}`);
  }

  assert.equal(
    source.includes("className=\"absolute inset-0 bg-[rgba(13,21,38,0.74)] backdrop-blur-sm\"\n            onClick={onClose}"),
    false,
    "Expected deck modal backdrop to avoid click-to-close behavior",
  );
});

test("deck view modal uses the same-origin card image proxy for renderable card art", () => {
  assert.equal(
    source.includes("/api/card-image?id="),
    true,
    "Expected deck modal to use the existing same-origin card image proxy",
  );
});

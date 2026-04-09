import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/meta/MetaPageClient.tsx"),
  "utf8",
);

test("meta decklist close flow clears the open deck immediately before router sync", () => {
  const requiredTokens = [
    "const closingDeckIdRef = useRef<string | null>(null);",
    "closingDeckIdRef.current = selectedDeckParam || activeDeck?.deckId || null;",
    "if (closingDeckIdRef.current === selectedDeckParam) {",
    "closingDeckIdRef.current = null;",
    "setActiveDeck(null);",
    'params.delete("deck");',
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected modal close guard token to exist: ${token}`,
    );
  }
});

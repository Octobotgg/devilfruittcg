import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/meta/MetaPageClient.tsx"),
  "utf8",
);

test("meta decklist modal collapses placings by default and supports in-modal card preview", () => {
  const requiredTokens = [
    "const [showPlacings, setShowPlacings] = useState(false);",
    "const [selectedPreviewCard, setSelectedPreviewCard] = useState<{ name: string; imageUrl: string } | null>(null);",
    "setShowPlacings(false);",
    "setSelectedPreviewCard(null);",
    'onClick={() => setShowPlacings((open) => !open)}',
    "Recent Tournament Placings ({deckLists.length})",
    "selectedPreviewCard ? (",
    'onClick={() => setSelectedPreviewCard({ name: u.name, imageUrl: u.imageUrl })}',
    'onClick={() => setSelectedPreviewCard({ name: c.name, imageUrl: c.imageUrl })}',
    'className="fixed inset-0 z-[60] flex items-center justify-center',
    'onClick={() => setSelectedPreviewCard(null)}',
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected meta decklist modal token to exist: ${token}`,
    );
  }
});

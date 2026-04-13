import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pagePath = path.join(process.cwd(), "app/decks/page.tsx");
const source = fs.readFileSync(pagePath, "utf8");

test("decks page is a server wrapper that preloads matchup payload into DecksPageClient", () => {
  const requiredTokens = [
    'import DecksPageClient from "./DecksPageClient";',
    'import { getHybridMatchupPayload } from "@/lib/competitive-insights";',
    "export const revalidate = 300;",
    "const payload = await getHybridMatchupPayload(",
    "<DecksPageClient",
    "initialMatchupDecks={payload?.decks || []}",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      source.includes(token),
      true,
      `Expected decks page wrapper token to exist: ${token}`,
    );
  }

  assert.equal(
    source.includes('"use client"'),
    false,
    "Expected decks page wrapper to be server-rendered instead of a client page",
  );
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const profileFiles = [
  "app/account/profile/page.tsx",
  "app/user/[username]/page.tsx",
  "components/profile/ActivityFeed.tsx",
  "components/profile/BadgeBoard.tsx",
  "components/profile/CollectionCompareButton.tsx",
  "components/profile/FeaturedDecks.tsx",
  "components/profile/OwnerProfileTools.tsx",
  "components/profile/ProfileStatCards.tsx",
  "components/profile/PublicDeckArchive.tsx",
  "components/profile/PublicProfileActions.tsx",
];

const combinedSource = profileFiles
  .map((filePath) => fs.readFileSync(path.join(process.cwd(), filePath), "utf8"))
  .join("\n");

const globalStyles = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

test("profile surfaces use the parchment account identity instead of old dark shells", () => {
  const requiredTokens = [
    "profile-ledger-surface",
    "profile-paper-card",
    "profile-soft-tile",
    "text-[var(--color-navy)]",
    "text-[var(--color-text-mid)]",
  ];

  for (const token of requiredTokens) {
    assert.equal(
      combinedSource.includes(token),
      true,
      `Expected profile source to include new identity token: ${token}`,
    );
  }
});

test("profile identity classes are defined in the global design system", () => {
  const styleTokens = [
    ".profile-ledger-surface",
    ".profile-paper-card",
    ".profile-soft-tile",
  ];

  for (const token of styleTokens) {
    assert.equal(
      globalStyles.includes(token),
      true,
      `Expected profile global style to exist: ${token}`,
    );
  }
});

test("profile surfaces no longer use the old smoky account identity tokens", () => {
  const oldTokens = [
    "bg-black/20",
    "bg-black/25",
    "bg-black/30",
    "bg-white/[0.03]",
    "bg-white/[0.02]",
    "border-white/10",
    "border-white/12",
    "text-white/40",
    "text-white/45",
    "text-white/50",
    "text-white/55",
    "text-white/60",
    "text-white/65",
    "text-white/70",
    "text-white/75",
    "text-white/80",
  ];

  for (const token of oldTokens) {
    assert.equal(
      combinedSource.includes(token),
      false,
      `Expected profile source to stop using old dark token: ${token}`,
    );
  }
});

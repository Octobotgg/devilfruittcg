/**
 * Durdles Format — Custom Leader Dataset
 *
 * Local format created by Team Durdle for their tournament.
 * This file is the single source of truth for the /format/durdles page.
 *
 * ------------------------------------------------------------------------
 * WANTED vs ROGUE
 * ------------------------------------------------------------------------
 * Leaders have one of two statuses:
 *   - 'wanted'  → tournament-featured leader. Non-Team-Durdle players must
 *                 use a Wanted leader. If a Wanted leader wins 1st place,
 *                 it gets banned.
 *   - 'rogue'   → all other Durdle leaders. If a Rogue leader wins, it
 *                 becomes Wanted AND Team Durdle creates a new buffed
 *                 Wanted leader.
 * The Wanted roster rotates — update the `status` field as the meta shifts.
 *
 * ------------------------------------------------------------------------
 * KNOWN PRINT CONFLICTS (card numbers confirmed from physical cards)
 * ------------------------------------------------------------------------
 * 1. Backpack Durdle and Dude Durdle both print DRDL-013 — genuine
 *    duplicate on the physical cards. Stored as-is.
 * 2. Judge Durdle prints "DRDL-8" (no leading zero). Stored as-is.
 * 3. Monk Durdle prints "DRDL-6" (no leading zero). Stored as-is.
 * 4. Midnight Durdle prints "DRDL-12" (no leading zero). Stored as-is.
 * 5. Sloppy Durdle prints "DRD-666" (no L) — confirmed typo on the card.
 *    Preserved as-is here. Change to "DRDL-666" if you want to fix.
 *
 * NOTE: The leader list is not final — more Durdles are in development.
 * Add new entries to DURDLE_LEADERS as they're released.
 *
 * Effect text is intentionally NOT stored here — it lives on the card
 * image itself, which the UI displays in full via the lightbox modal.
 * If you later want searchable effect text, add an `effectText` field.
 * ------------------------------------------------------------------------
 */

export type DurdleColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'purple'
  | 'yellow'
  | 'black';

export type DurdleAttribute =
  | 'slash'
  | 'strike'
  | 'ranged'
  | 'special'
  | 'wisdom'
  | 'unknown';

export type DurdleAffiliation =
  | 'Gamer Pirates'
  | 'Captain Pirates'
  | 'Master Pirates'
  | 'One-Star Bandits'
  | 'Elite 4';

export type DurdleKeyword =
  | 'Blocker'
  | 'Double Attack'
  | 'Rush'
  | 'Banish';

export type DurdleStatus = 'wanted' | 'rogue';

export interface DurdleLeader {
  slug: string;
  name: string;
  cardNumber: string;
  power: number;
  life: number;
  colors: DurdleColor[];
  attributes: DurdleAttribute[];
  affiliations: DurdleAffiliation[];
  keywords: DurdleKeyword[];
  status: DurdleStatus;
  imagePath: string; // public path, e.g. "/format/durdles/dude-durdle.png"
}

export const DURDLE_LEADERS: DurdleLeader[] = [
  {
    slug: 'a-durdle',
    name: 'A Durdle',
    cardNumber: 'DRDL-101',
    power: 5000,
    life: 10,
    colors: ['blue', 'red'],
    attributes: ['wisdom'],
    affiliations: ['One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/a-durdle.png',
  },
  {
    slug: 'backpack-durdle',
    name: 'Backpack Durdle',
    cardNumber: 'DRDL-013', // prints DRDL-013 — confirmed duplicate with Dude Durdle
    power: 6000,
    life: 4,
    colors: ['green', 'yellow'],
    attributes: ['slash', 'ranged'],
    affiliations: ['Captain Pirates'],
    keywords: ['Double Attack'],
    status: 'rogue',
    imagePath: '/format/durdles/backpack-durdle.png',
  },
  {
    slug: 'big-durdle',
    name: 'BIG Durdle',
    cardNumber: 'DRDL-007',
    power: 7000,
    life: 4,
    colors: ['green', 'blue'],
    attributes: ['slash', 'ranged'],
    affiliations: ['Gamer Pirates'],
    keywords: ['Blocker'],
    status: 'rogue',
    imagePath: '/format/durdles/big-durdle.png',
  },
  {
    slug: 'captain-durdle',
    name: 'Captain Durdle',
    cardNumber: 'DRDL-094',
    power: 6000,
    life: 4,
    colors: ['yellow'],
    attributes: ['unknown'],
    affiliations: ['Captain Pirates', 'Elite 4'],
    keywords: [],
    status: 'wanted',
    imagePath: '/format/durdles/captain-durdle.png',
  },
  {
    slug: 'chef-durdle',
    name: 'Chef Durdle',
    cardNumber: 'DRDL-015',
    power: 7000,
    life: 4,
    colors: ['blue', 'red'],
    attributes: ['slash', 'strike'],
    affiliations: ['Captain Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/chef-durdle.png',
  },
  {
    slug: 'crashout-durdle',
    name: 'Crashout Durdle',
    cardNumber: 'DRDL-003',
    power: 5000,
    life: 6,
    colors: ['blue'],
    attributes: ['unknown'],
    affiliations: ['Captain Pirates'],
    keywords: ['Double Attack'],
    status: 'rogue',
    imagePath: '/format/durdles/crashout-durdle.png',
  },
  {
    slug: 'dr-durdle',
    name: 'Dr. Durdle',
    cardNumber: 'DRDL-002',
    power: 6000,
    life: 4,
    colors: ['green', 'purple'],
    attributes: ['slash', 'wisdom'],
    affiliations: ['Master Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/dr-durdle.png',
  },
  {
    slug: 'dude-durdle',
    name: 'Dude Durdle',
    cardNumber: 'DRDL-013',
    power: 5000,
    life: 6,
    colors: ['purple'],
    attributes: ['special'],
    affiliations: ['Gamer Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/dude-durdle.png',
  },
  {
    slug: 'durdette',
    name: 'Durdette',
    cardNumber: 'DRDL-008',
    power: 6000,
    life: 2,
    colors: ['purple', 'yellow'],
    attributes: ['unknown'],
    affiliations: ['Captain Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/durdette.png',
  },
  {
    slug: 'fresh-durdle',
    name: 'Fresh Durdle',
    cardNumber: 'DRDL-017',
    power: 5000,
    life: 5,
    colors: ['purple'],
    attributes: ['strike', 'wisdom'],
    affiliations: ['One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/fresh-durdle.png',
  },
  {
    slug: 'gamer-durdle',
    name: 'Gamer Durdle',
    cardNumber: 'DRDL-001',
    power: 8000,
    life: 3,
    colors: ['red'],
    attributes: ['slash', 'strike'],
    affiliations: ['Gamer Pirates', 'Elite 4'],
    keywords: [],
    status: 'wanted',
    imagePath: '/format/durdles/gamer-durdle.png',
  },
  {
    slug: 'hr-durdle',
    name: 'HR Durdle',
    cardNumber: 'DRDL-005',
    power: 6000,
    life: 4,
    colors: ['blue', 'yellow'],
    attributes: ['wisdom'],
    affiliations: ['Master Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/hr-durdle.png',
  },
  {
    slug: 'jesus-durdle',
    name: 'Jesus Durdle',
    cardNumber: 'DRDL-023',
    power: 6000,
    life: 3,
    colors: ['red', 'yellow'],
    attributes: ['strike', 'ranged'],
    affiliations: ['Master Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/jesus-durdle.png',
  },
  {
    slug: 'judge-durdle',
    name: 'Judge Durdle',
    cardNumber: 'DRDL-8', // confirmed from physical card
    power: 6000,
    life: 5,
    colors: ['purple'],
    attributes: ['wisdom'],
    affiliations: ['Master Pirates', 'Captain Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/judge-durdle.png',
  },
  {
    slug: 'king-durdle',
    name: 'King Durdle',
    cardNumber: 'DRDL-100',
    power: 6000,
    life: 4,
    colors: ['red', 'purple'],
    attributes: ['slash', 'wisdom'],
    affiliations: ['One-Star Bandits', 'Captain Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/king-durdle.png',
  },
  {
    slug: 'koby-bryan-durdle',
    name: 'Koby Bryan Durdle',
    cardNumber: 'DRDL-024',
    power: 6000,
    life: 5,
    colors: ['red', 'black'],
    attributes: ['strike'],
    affiliations: ['One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/koby-bryan-durdle.png',
  },
  {
    slug: 'lady-durdle',
    name: 'Lady Durdle',
    cardNumber: 'DRDL-009',
    power: 6000,
    life: 6,
    colors: ['red'],
    attributes: ['special'],
    affiliations: ['Gamer Pirates', 'One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/lady-durdle.png',
  },
  {
    slug: 'late-durdle',
    name: 'Late Durdle',
    cardNumber: 'DRDL-006',
    power: 6000,
    life: 4,
    colors: ['blue', 'black'],
    attributes: ['strike', 'wisdom'],
    affiliations: ['Gamer Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/late-durdle.png',
  },
  {
    slug: 'master-durdle',
    name: 'Master Durdle',
    cardNumber: 'DRDL-000',
    power: 7000,
    life: 4,
    colors: ['blue'],
    attributes: ['special'],
    affiliations: ['Master Pirates', 'Elite 4'],
    keywords: ['Blocker'],
    status: 'wanted',
    imagePath: '/format/durdles/master-durdle.png',
  },
  {
    slug: 'midnight-durdle',
    name: 'Midnight Durdle',
    cardNumber: 'DRDL-12', // confirmed from physical card
    power: 6000,
    life: 4,
    colors: ['red', 'green'],
    attributes: ['special'],
    affiliations: ['Gamer Pirates'],
    keywords: [],
    status: 'wanted',
    imagePath: '/format/durdles/midnight-durdle.png',
  },
  {
    slug: 'monk-durdle',
    name: 'Monk Durdle',
    cardNumber: 'DRDL-6', // confirmed from physical card
    power: 6000,
    life: 6,
    colors: ['green', 'black'],
    attributes: ['wisdom'],
    affiliations: ['Master Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/monk-durdle.png',
  },
  {
    slug: 'moto',
    name: 'Moto',
    cardNumber: 'DRDL-676',
    power: 6000,
    life: 3,
    colors: ['black', 'yellow'],
    attributes: ['unknown'],
    affiliations: ['Captain Pirates', 'One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/moto.png',
  },
  {
    slug: 'murtle',
    name: 'MURTLE',
    cardNumber: 'DRDL-190',
    power: 6000,
    life: 6,
    colors: ['green', 'black'],
    attributes: ['unknown'],
    affiliations: ['Gamer Pirates'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/murtle.png',
  },
  {
    slug: 'pro-durdle',
    name: 'Pro Durdle',
    cardNumber: 'DRDL-010',
    power: 8000,
    life: 3,
    colors: ['yellow'],
    attributes: ['unknown'],
    affiliations: ['Captain Pirates', 'Elite 4'],
    keywords: [],
    status: 'wanted',
    imagePath: '/format/durdles/pro-durdle.png',
  },
  {
    slug: 'shop-durdle',
    name: 'Shop Durdle',
    cardNumber: 'DRDL-018',
    power: 5000,
    life: 7,
    colors: ['black'],
    attributes: ['slash', 'strike'],
    affiliations: ['One-Star Bandits'],
    keywords: [],
    status: 'rogue',
    imagePath: '/format/durdles/shop-durdle.png',
  },
  {
    slug: 'sketchy-durdle',
    name: 'Sketchy Durdle',
    cardNumber: 'DRDL-064',
    power: 6000,
    life: 5,
    colors: ['black'],
    attributes: ['strike'],
    affiliations: ['One-Star Bandits', 'Elite 4'],
    keywords: [],
    status: 'wanted',
    imagePath: '/format/durdles/sketchy-durdle.png',
  },
  {
    slug: 'sloppy-durdle',
    name: 'Sloppy Durdle',
    cardNumber: 'DRD-666', // card actually reads "DRD-666" (no L) — likely typo
    power: 6000,
    life: 5,
    colors: ['red'],
    attributes: ['ranged'],
    affiliations: ['Gamer Pirates'],
    keywords: ['Banish', 'Double Attack'],
    status: 'rogue',
    imagePath: '/format/durdles/sloppy-durdle.png',
  },
];

export const DURDLE_AFFILIATIONS: DurdleAffiliation[] = [
  'Gamer Pirates',
  'Captain Pirates',
  'Master Pirates',
  'One-Star Bandits',
  'Elite 4',
];

export const DURDLE_COLORS: DurdleColor[] = [
  'red',
  'blue',
  'green',
  'purple',
  'yellow',
  'black',
];

/**
 * Format rules, in the order they should be displayed.
 * Each rule has a short title and a plain-language explanation.
 * Edit here — the UI reads from this array.
 */
export interface DurdleRule {
  title: string;
  description: string;
}

export const DURDLE_RULES: DurdleRule[] = [
  {
    title: 'Durdle Leaders Only',
    description:
      'All players must play a Durdle leader. Standard One Piece TCG leaders are not legal in this format.',
  },
  {
    title: 'Wanted Leaders for Non-Team-Durdle Players',
    description:
      'Players who are not part of Team Durdle may only choose from the current Wanted leader pool. Team Durdle members may play any Durdle leader, Wanted or Rogue.',
  },
  {
    title: 'No Block Rotation',
    description:
      'All cards are legal regardless of set or block. Bring anything that plays nicely with your leader.',
  },
  {
    title: 'Standard Banlist Applies',
    description:
      'The current official One Piece TCG banlist is enforced for all non-leader cards.',
  },
  {
    title: 'No Leader-Locked Effects',
    description:
      'Card effects that lock to specific named leaders (e.g. "if your Leader is X") do not apply in this format.',
  },
  {
    title: 'Wanted Wins → Banned',
    description:
      'If a Wanted leader wins 1st place in a Durdles tournament, that leader is banned from the Wanted pool going forward.',
  },
  {
    title: 'Rogue Wins → Promoted',
    description:
      'If a Rogue leader wins 1st place, it is promoted to Wanted status — AND Team Durdle creates a brand-new, super-buffed custom Wanted leader to join the pool.',
  },
];

/** Convenience helper — the current Wanted roster. */
export const getWantedLeaders = (): DurdleLeader[] =>
  DURDLE_LEADERS.filter((l) => l.status === 'wanted');

/** Convenience helper — the current Rogue roster. */
export const getRogueLeaders = (): DurdleLeader[] =>
  DURDLE_LEADERS.filter((l) => l.status === 'rogue');

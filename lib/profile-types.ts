export type ProfileVisibility = "public" | "private";

export type NotificationPreferences = {
  priceAlerts: boolean;
  newSetReleases: boolean;
  followerActivity: boolean;
};

export type ProfileBadgeId =
  | "rookie_pirate"
  | "deck_builder"
  | "collector"
  | "set_master"
  | "treasure_hunter"
  | "grand_line_explorer";

export type ProfileBadge = {
  id: ProfileBadgeId;
  label: string;
  description: string;
};

export const PROFILE_BADGE_DEFINITIONS: ProfileBadge[] = [
  {
    id: "rookie_pirate",
    label: "Rookie Pirate",
    description: "Created an account and joined the DevilFruit crew.",
  },
  {
    id: "deck_builder",
    label: "Deck Builder",
    description: "Built at least 5 decks.",
  },
  {
    id: "collector",
    label: "Collector",
    description: "Owns 100 or more unique cards.",
  },
  {
    id: "set_master",
    label: "Set Master",
    description: "Completed at least one full set.",
  },
  {
    id: "treasure_hunter",
    label: "Treasure Hunter",
    description: "Collection value crossed $500.",
  },
  {
    id: "grand_line_explorer",
    label: "Grand Line Explorer",
    description: "Owns cards from 10 or more sets.",
  },
];

export type ProfileTopCard = {
  cardId: string;
  name: string;
  imageUrl?: string | null;
  price: number;
  quantity?: number;
};

export type ProfileLeaderSummary = {
  cardId: string;
  name: string;
  color?: string | null;
  imageUrl?: string | null;
};

export type ProfileFeaturedDeck = {
  deckId: string;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
  leaderImageId: string | null;
  leaderColors: string[];
  mainDeckCount: number;
  updatedAt: string;
};

export type ProfilePublicDeckCard = {
  cardId: string;
  variantId?: string | null;
  imageCardId: string;
  quantity: number;
  name: string;
  type: string;
  cost: number | null;
  color: string;
  set: string;
  setCode: string;
  number: string;
  rarity: string;
  power: number | null;
  attribute: string | null;
  imageUrl?: string | null;
};

export type ProfilePublicDeck = {
  deckId: string;
  name: string;
  leaderId: string | null;
  leaderVariantId?: string | null;
  leaderName: string | null;
  leaderImageId: string | null;
  leaderColors: string[];
  mainDeckCount: number;
  updatedAt: string;
  isFeatured: boolean;
  leaderCard: ProfilePublicDeckCard | null;
  cards: ProfilePublicDeckCard[];
};

export type ProfileSummary = {
  uniqueCardsOwned: number;
  totalCardsOwned: number;
  collectionValue: number;
  setsCompleted: number;
  completedSetCodes: string[];
  topValuableCards: ProfileTopCard[];
  totalDecksBuilt: number;
  battleReadyDecks: number;
  favoriteColors: string[];
  mostUsedLeader: ProfileLeaderSummary | null;
  wishlistCount: number;
  tradeCount: number;
  collectionCards: Array<{ cardId: string; quantity: number }>;
  updatedAt: string;
};

export type UserProfileRecord = {
  userId: string;
  email: string | null;
  displayName: string;
  username: string | null;
  avatarKey: string;
  bio: string;
  favoriteLeaderId: string | null;
  profileVisibility: ProfileVisibility;
  showActivity: boolean;
  featuredDeckIds: string[];
  memberSince: string;
  updatedAt: string;
  notificationPreferences: NotificationPreferences;
};

export type ProfileActivityKind =
  | "collection_add"
  | "deck_created"
  | "deck_updated"
  | "wishlist_add"
  | "set_completed"
  | "badge_earned"
  | "followed_user";

export type ProfileActivity = {
  activityId: string;
  userId: string;
  kind: ProfileActivityKind;
  title: string;
  detail: string;
  cardId?: string | null;
  deckId?: string | null;
  createdAt: string;
  publicVisible: boolean;
};

export type PublicProfilePayload = {
  profile: UserProfileRecord;
  summary: ProfileSummary | null;
  activities: ProfileActivity[];
  featuredDecks: ProfileFeaturedDeck[];
  publicDecks: ProfilePublicDeck[];
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  badges: ProfileBadge[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  priceAlerts: false,
  newSetReleases: false,
  followerActivity: false,
};

export const DEFAULT_PROFILE_SUMMARY: ProfileSummary = {
  uniqueCardsOwned: 0,
  totalCardsOwned: 0,
  collectionValue: 0,
  setsCompleted: 0,
  completedSetCodes: [],
  topValuableCards: [],
  totalDecksBuilt: 0,
  battleReadyDecks: 0,
  favoriteColors: [],
  mostUsedLeader: null,
  wishlistCount: 0,
  tradeCount: 0,
  collectionCards: [],
  updatedAt: new Date(0).toISOString(),
};

export function deriveProfileBadges(summary: ProfileSummary): ProfileBadge[] {
  const badges: ProfileBadge[] = [PROFILE_BADGE_DEFINITIONS[0]];

  if (summary.totalDecksBuilt >= 5) {
    badges.push(PROFILE_BADGE_DEFINITIONS.find((badge) => badge.id === "deck_builder")!);
  }

  if (summary.uniqueCardsOwned >= 100) {
    badges.push(PROFILE_BADGE_DEFINITIONS.find((badge) => badge.id === "collector")!);
  }

  if (summary.setsCompleted >= 1) {
    badges.push(PROFILE_BADGE_DEFINITIONS.find((badge) => badge.id === "set_master")!);
  }

  if (summary.collectionValue >= 500) {
    badges.push(PROFILE_BADGE_DEFINITIONS.find((badge) => badge.id === "treasure_hunter")!);
  }

  const setCount = new Set(
    summary.collectionCards
      .map((entry) => entry.cardId.trim().toUpperCase().split("-")[0])
      .filter(Boolean),
  ).size;

  if (setCount >= 10) {
    badges.push(PROFILE_BADGE_DEFINITIONS.find((badge) => badge.id === "grand_line_explorer")!);
  }

  return badges;
}

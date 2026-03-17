export type CloudProviderName = "supabase" | "firebase";

export interface CloudUser {
  id: string;
  email?: string | null;
  fullName?: string | null;
}

export interface CloudSignInOptions {
  email?: string;
  redirectTo?: string;
  password?: string;
  provider?: "google";
  strategy?: "magic_link" | "password";
}

export interface CloudSignUpOptions {
  fullName?: string;
  email: string;
  password: string;
  redirectTo?: string;
}

export interface CloudSignUpResult {
  needsEmailConfirmation: boolean;
  user: CloudUser | null;
}

export interface CloudPasswordResetOptions {
  email: string;
  redirectTo?: string;
}

export interface CloudPasswordUpdateOptions {
  password: string;
}

export type DeckVisibility = "private" | "public";

export type DeckCard = { cardId: string; quantity: number; variantId?: string | null };
export type Deck = {
  id: string;
  name: string;
  leaderId: string | null;
  leaderVariantId?: string | null;
  visibility?: DeckVisibility;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
};

export type CollectionEntry = {
  cardId: string;
  quantity: number;
  price?: number;
  lastUpdated?: string;
};

export type Collection = Record<string, CollectionEntry>;

export interface CloudAdapter {
  signIn(options?: CloudSignInOptions): Promise<void>;
  signUp(options: CloudSignUpOptions): Promise<CloudSignUpResult>;
  sendPasswordReset(options: CloudPasswordResetOptions): Promise<void>;
  updatePassword(options: CloudPasswordUpdateOptions): Promise<void>;
  signOut(): Promise<void>;
  getSessionUser(): Promise<CloudUser | null>;
  subscribeToAuthState?(onChange: (user: CloudUser | null) => void): () => void;

  loadDecks(userId: string): Promise<Deck[]>;
  saveDecks(userId: string, decks: Deck[]): Promise<void>;

  loadCollection(userId: string): Promise<Collection>;
  saveCollection(userId: string, collection: Collection): Promise<void>;
}

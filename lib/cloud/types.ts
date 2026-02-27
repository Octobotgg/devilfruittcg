export type CloudProviderName = "supabase" | "firebase";

export interface CloudUser {
  id: string;
  email?: string | null;
}

export type DeckCard = { cardId: string; quantity: number };
export type Deck = {
  id: string;
  name: string;
  leaderId: string | null;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
};

export type Collection = Record<string, number>;

export interface CloudAdapter {
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getSessionUser(): Promise<CloudUser | null>;

  loadDecks(userId: string): Promise<Deck[]>;
  saveDecks(userId: string, decks: Deck[]): Promise<void>;

  loadCollection(userId: string): Promise<Collection>;
  saveCollection(userId: string, collection: Collection): Promise<void>;
}

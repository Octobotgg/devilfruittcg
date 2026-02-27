import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CloudAdapter, CloudUser, Deck, Collection } from "./types";

let client: SupabaseClient | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  client = createClient(url, key);
  return client;
}

const TABLE = "user_data";

export const supabaseAdapter: CloudAdapter = {
  async signIn() {
    const sb = getClient();
    const email = window.prompt("Enter email for Supabase magic link sign-in:");
    if (!email) return;
    const { error } = await sb.auth.signInWithOtp({ email });
    if (error) throw error;
    alert("Magic link sent. Open your email to finish sign in.");
  },
  async signOut() {
    const sb = getClient();
    await sb.auth.signOut();
  },
  async getSessionUser(): Promise<CloudUser | null> {
    const sb = getClient();
    const { data } = await sb.auth.getUser();
    const u = data.user;
    return u ? { id: u.id, email: u.email } : null;
  },
  async loadDecks(userId: string): Promise<Deck[]> {
    const sb = getClient();
    const { data } = await sb.from(TABLE).select("decks").eq("user_id", userId).maybeSingle();
    return (data?.decks as Deck[] | null) || [];
  },
  async saveDecks(userId: string, decks: Deck[]): Promise<void> {
    const sb = getClient();
    const { error } = await sb.from(TABLE).upsert({ user_id: userId, decks }, { onConflict: "user_id" });
    if (error) throw error;
  },
  async loadCollection(userId: string): Promise<Collection> {
    const sb = getClient();
    const { data } = await sb.from(TABLE).select("collection").eq("user_id", userId).maybeSingle();
    return (data?.collection as Collection | null) || {};
  },
  async saveCollection(userId: string, collection: Collection): Promise<void> {
    const sb = getClient();
    const { error } = await sb.from(TABLE).upsert({ user_id: userId, collection }, { onConflict: "user_id" });
    if (error) throw error;
  },
};

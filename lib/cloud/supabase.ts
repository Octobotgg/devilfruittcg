import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthCallbackUrl } from "./auth-redirect";
import type {
  CloudAdapter,
  CloudUser,
  Deck,
  Collection,
  CloudSignInOptions,
  CloudSignUpOptions,
  CloudSignUpResult,
  CloudPasswordResetOptions,
  CloudPasswordUpdateOptions,
} from "./types";
import { normalizeCollection, normalizeDecks } from "./normalize";

let client: SupabaseClient | null = null;

function cleanEnvValue(value: string | undefined) {
  return String(value || "").replace(/\\n/g, "").trim();
}

function mapSupabaseUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): CloudUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  return { id: user.id, email: user.email, fullName };
}

function getClient() {
  if (client) return client;
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  client = createClient(url, key);
  return client;
}

export function getSupabaseClient() {
  return getClient();
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const TABLE = "user_data";

export const supabaseAdapter: CloudAdapter = {
  async signIn(options?: CloudSignInOptions) {
    const sb = getClient();
    const redirectTo = options?.redirectTo || getAuthCallbackUrl();

    if (options?.provider === "google") {
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) throw error;
      return;
    }

    if (options?.strategy === "password") {
      if (!options.email || !options.password) {
        throw new Error("Email and password are required.");
      }
      const { error } = await sb.auth.signInWithPassword({
        email: options.email,
        password: options.password,
      });
      if (error) throw error;
      return;
    }

    const email = options?.email || window.prompt("Enter email for Supabase magic link sign-in:");
    if (!email) return;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) throw error;
    if (!options?.email) {
      alert("Magic link sent. Open your email to finish sign in.");
    }
  },
  async signUp(options: CloudSignUpOptions): Promise<CloudSignUpResult> {
    const sb = getClient();
    const { data, error } = await sb.auth.signUp({
      email: options.email,
      password: options.password,
      options: {
        ...(options.redirectTo ? { emailRedirectTo: options.redirectTo } : {}),
        ...(options.fullName ? { data: { full_name: options.fullName } } : {}),
      },
    });
    if (error) throw error;
    return {
      needsEmailConfirmation: !Boolean(data.session?.user),
      user: mapSupabaseUser(data.user),
    };
  },
  async sendPasswordReset(options: CloudPasswordResetOptions) {
    const sb = getClient();
    const { error } = await sb.auth.resetPasswordForEmail(options.email, {
      redirectTo: options.redirectTo,
    });
    if (error) throw error;
  },
  async updatePassword(options: CloudPasswordUpdateOptions) {
    const sb = getClient();
    const { error } = await sb.auth.updateUser({ password: options.password });
    if (error) throw error;
  },
  async signOut() {
    const sb = getClient();
    await sb.auth.signOut();
  },
  async getSessionUser(): Promise<CloudUser | null> {
    const sb = getClient();
    const { data } = await sb.auth.getUser();
    return mapSupabaseUser(data.user);
  },
  subscribeToAuthState(onChange) {
    const sb = getClient();
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      onChange(mapSupabaseUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  },
  async loadDecks(userId: string): Promise<Deck[]> {
    const sb = getClient();
    const { data } = await sb.from(TABLE).select("decks").eq("user_id", userId).maybeSingle();
    return normalizeDecks(data?.decks);
  },
  async saveDecks(userId: string, decks: Deck[]): Promise<void> {
    const sb = getClient();
    const { error } = await sb.from(TABLE).upsert({ user_id: userId, decks }, { onConflict: "user_id" });
    if (error) throw error;
  },
  async loadCollection(userId: string): Promise<Collection> {
    const sb = getClient();
    const { data } = await sb.from(TABLE).select("collection").eq("user_id", userId).maybeSingle();
    return normalizeCollection(data?.collection);
  },
  async saveCollection(userId: string, collection: Collection): Promise<void> {
    const sb = getClient();
    const { error } = await sb.from(TABLE).upsert({ user_id: userId, collection }, { onConflict: "user_id" });
    if (error) throw error;
  },
};

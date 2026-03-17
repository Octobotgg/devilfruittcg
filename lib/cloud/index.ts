import type { CloudAdapter } from "./types";

let _adapter: CloudAdapter | null = null;

export function getCloudAdapter(): CloudAdapter | null {
  if (typeof window === "undefined") return null;
  if (_adapter) return _adapter;
  const provider = process.env.NEXT_PUBLIC_CLOUD_PROVIDER || "";
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasFirebase = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );

  if (provider === "supabase" || (!provider && hasSupabase)) {
    // lazy load to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseAdapter } = require("./supabase");
    _adapter = supabaseAdapter;
  } else if (provider === "firebase" || (!provider && hasFirebase)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { firebaseAdapter } = require("./firebase");
    _adapter = firebaseAdapter;
  }
  return _adapter;
}

export type { CloudAdapter, CloudUser, Deck, Collection } from "./types";

import type { CloudAdapter } from "./types";

let _adapter: CloudAdapter | null = null;

export function getCloudAdapter(): CloudAdapter | null {
  if (typeof window === "undefined") return null;
  if (_adapter) return _adapter;
  const provider = process.env.NEXT_PUBLIC_CLOUD_PROVIDER || "";
  if (provider === "supabase") {
    // lazy load to avoid SSR issues
    const { supabaseAdapter } = require("./supabase");
    _adapter = supabaseAdapter;
  } else if (provider === "firebase") {
    const { firebaseAdapter } = require("./firebase");
    _adapter = firebaseAdapter;
  }
  return _adapter;
}

export type { CloudAdapter, CloudUser, Deck, Collection } from "./types";

"use client";

const USER_LOCAL_STORAGE_KEYS = [
  "devilfruit_decks",
  "devilfruit_collection",
  "devilfruit_collection_conditions",
  "devilfruit_collection_recent",
  "devilfruit_collection_trade_cards",
  "devilfruit_pending_auth_action",
];

const USER_LOCAL_STORAGE_PREFIXES = [
  "devilfruit_deck_art_selection:",
  "devilfruit_deck_manual_order:",
  "devilfruit_profile_settings:",
];

function shouldClearClientKey(key: string) {
  return (
    USER_LOCAL_STORAGE_KEYS.includes(key) ||
    USER_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    /^sb-.*-auth-token$/i.test(key) ||
    /^supabase\./i.test(key) ||
    key.startsWith("firebase:authUser:")
  );
}

function clearMatchingStorage(storage: Storage | null) {
  if (!storage) return;

  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }

  keys.forEach((key) => {
    if (shouldClearClientKey(key)) {
      storage.removeItem(key);
    }
  });
}

function expireCookie(name: string) {
  const base = `${encodeURIComponent(name)}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = base;

  const hostname = window.location.hostname;
  if (!hostname) return;

  document.cookie = `${base}; domain=${hostname}`;

  const parts = hostname.split(".");
  if (parts.length >= 2) {
    document.cookie = `${base}; domain=.${parts.slice(-2).join(".")}`;
  }
}

function clearAccessibleAuthCookies() {
  if (typeof document === "undefined") return;

  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0]?.trim())
    .filter(Boolean) as string[];

  cookieNames.forEach((name) => {
    const normalized = name.toLowerCase();
    if (normalized.startsWith("sb-") || normalized.includes("supabase") || normalized.startsWith("firebase")) {
      expireCookie(name);
    }
  });
}

function clearKnownAuthIndexedDb() {
  if (typeof indexedDB === "undefined") return;

  try {
    indexedDB.deleteDatabase("firebaseLocalStorageDb");
  } catch {
    // ignore IndexedDB cleanup failures
  }
}

export function clearUserScopedClientData() {
  if (typeof window === "undefined") return;

  clearMatchingStorage(window.localStorage);
  clearMatchingStorage(window.sessionStorage);
  clearAccessibleAuthCookies();
  clearKnownAuthIndexedDb();
}

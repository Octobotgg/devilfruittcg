"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getCloudAdapter } from "./index";
import { getInitialCloudReady } from "./hydration";
import type {
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
import { clearUserScopedClientData } from "@/lib/client-user-data";

const LS_DECKS = "devilfruit_decks";
const LS_COLLECTION = "devilfruit_collection";

function lsGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export function useCloudSync() {
  const adapter = getCloudAdapter();
  const [user, setUser] = useState<CloudUser | null>(null);
  const syncing = false;
  const [ready, setReady] = useState(() => getInitialCloudReady(Boolean(adapter)));
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!adapter) {
      setReady(true);
      return;
    }
    let cancelled = false;
    adapter.getSessionUser().then(u => {
      if (cancelled) return;
      lastUserIdRef.current = u?.id ?? null;
      setUser(u);
      setReady(true);
    }).catch(() => {
      if (cancelled) return;
      setReady(true);
    });

    const unsubscribe = adapter.subscribeToAuthState?.((nextUser) => {
      if (cancelled) return;
      const nextUserId = nextUser?.id ?? null;
      if (lastUserIdRef.current && lastUserIdRef.current !== nextUserId) {
        clearUserScopedClientData();
      }
      lastUserIdRef.current = nextUserId;
      setUser(nextUser);
      setReady(true);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [adapter]);

  const signIn = useCallback(async (options?: CloudSignInOptions) => {
    if (!adapter) return;
    await adapter.signIn(options);
    const u = await adapter.getSessionUser();
    lastUserIdRef.current = u?.id ?? null;
    setUser(u);
  }, [adapter]);

  const signUp = useCallback(async (options: CloudSignUpOptions): Promise<CloudSignUpResult | undefined> => {
    if (!adapter) return undefined;
    const result = await adapter.signUp(options);
    const u = await adapter.getSessionUser();
    lastUserIdRef.current = u?.id ?? null;
    setUser(u);
    return result;
  }, [adapter]);

  const sendPasswordReset = useCallback(async (options: CloudPasswordResetOptions) => {
    if (!adapter) return;
    await adapter.sendPasswordReset(options);
  }, [adapter]);

  const updatePassword = useCallback(async (options: CloudPasswordUpdateOptions) => {
    if (!adapter) return;
    await adapter.updatePassword(options);
    const u = await adapter.getSessionUser();
    lastUserIdRef.current = u?.id ?? null;
    setUser(u);
  }, [adapter]);

  const signOut = useCallback(async () => {
    if (!adapter) return;
    await adapter.signOut();
    clearUserScopedClientData();
    lastUserIdRef.current = null;
    setUser(null);
  }, [adapter]);

  const loadDecks = useCallback(async (): Promise<Deck[]> => {
    if (adapter && user) {
      try { return normalizeDecks(await adapter.loadDecks(user.id)); } catch {}
    }
    if (adapter) return [];
    return normalizeDecks(lsGet<unknown>(LS_DECKS, []));
  }, [adapter, user]);

  const saveDecks = useCallback(async (decks: Deck[]): Promise<void> => {
    if (!adapter || user) {
      localStorage.setItem(LS_DECKS, JSON.stringify(decks));
    }
    if (adapter && user) {
      try { await adapter.saveDecks(user.id, decks); } catch {}
    }
  }, [adapter, user]);

  const loadCollection = useCallback(async (): Promise<Collection> => {
    if (adapter && user) {
      try { return normalizeCollection(await adapter.loadCollection(user.id)); } catch {}
    }
    if (adapter) return {};
    return normalizeCollection(lsGet<unknown>(LS_COLLECTION, {}));
  }, [adapter, user]);

  const saveCollection = useCallback(async (collection: Collection): Promise<void> => {
    if (!adapter || user) {
      localStorage.setItem(LS_COLLECTION, JSON.stringify(collection));
    }
    if (adapter && user) {
      try { await adapter.saveCollection(user.id, collection); } catch {}
    }
  }, [adapter, user]);

  return {
    user,
    syncing,
    ready,
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    signOut,
    loadDecks,
    saveDecks,
    loadCollection,
    saveCollection,
    hasCloud: !!adapter,
  };
}

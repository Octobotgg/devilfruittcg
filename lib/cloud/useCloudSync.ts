"use client";
import { useState, useEffect, useCallback } from "react";
import { getCloudAdapter } from "./index";
import type { CloudUser, Deck, Collection } from "./types";

const LS_DECKS = "devilfruit_decks";
const LS_COLLECTION = "devilfruit_collection";

function lsGet<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

export function useCloudSync() {
  const [user, setUser] = useState<CloudUser | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [ready, setReady] = useState(false);

  const adapter = getCloudAdapter();

  useEffect(() => {
    if (!adapter) { setReady(true); return; }
    adapter.getSessionUser().then(u => {
      setUser(u);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const signIn = useCallback(async () => {
    if (!adapter) return;
    await adapter.signIn();
    const u = await adapter.getSessionUser();
    setUser(u);
    if (u) {
      // migrate localStorage to cloud if cloud is empty
      setSyncing(true);
      try {
        const cloudDecks = await adapter.loadDecks(u.id);
        if (cloudDecks.length === 0) {
          const localDecks = lsGet<Deck[]>(LS_DECKS, []);
          if (localDecks.length > 0) await adapter.saveDecks(u.id, localDecks);
        }
        const cloudCollection = await adapter.loadCollection(u.id);
        if (Object.keys(cloudCollection).length === 0) {
          const localCollection = lsGet<Collection>(LS_COLLECTION, {});
          if (Object.keys(localCollection).length > 0) await adapter.saveCollection(u.id, localCollection);
        }
      } finally { setSyncing(false); }
    }
  }, [adapter]);

  const signOut = useCallback(async () => {
    if (!adapter) return;
    await adapter.signOut();
    setUser(null);
  }, [adapter]);

  const loadDecks = useCallback(async (): Promise<Deck[]> => {
    if (adapter && user) {
      try { return await adapter.loadDecks(user.id); } catch {}
    }
    return lsGet<Deck[]>(LS_DECKS, []);
  }, [adapter, user]);

  const saveDecks = useCallback(async (decks: Deck[]): Promise<void> => {
    localStorage.setItem(LS_DECKS, JSON.stringify(decks));
    if (adapter && user) {
      try { await adapter.saveDecks(user.id, decks); } catch {}
    }
  }, [adapter, user]);

  const loadCollection = useCallback(async (): Promise<Collection> => {
    if (adapter && user) {
      try { return await adapter.loadCollection(user.id); } catch {}
    }
    return lsGet<Collection>(LS_COLLECTION, {});
  }, [adapter, user]);

  const saveCollection = useCallback(async (collection: Collection): Promise<void> => {
    localStorage.setItem(LS_COLLECTION, JSON.stringify(collection));
    if (adapter && user) {
      try { await adapter.saveCollection(user.id, collection); } catch {}
    }
  }, [adapter, user]);

  return { user, syncing, ready, signIn, signOut, loadDecks, saveDecks, loadCollection, saveCollection, hasCloud: !!adapter };
}

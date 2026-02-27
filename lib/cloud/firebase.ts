import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, signOut as fbSignOut } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import type { CloudAdapter, CloudUser, Deck, Collection } from "./types";

function getFirebase() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new Error("Missing Firebase env vars");
  }
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}

export const firebaseAdapter: CloudAdapter = {
  async signIn() {
    const { auth } = getFirebase();
    await signInAnonymously(auth);
  },
  async signOut() {
    const { auth } = getFirebase();
    await fbSignOut(auth);
  },
  async getSessionUser(): Promise<CloudUser | null> {
    const { auth } = getFirebase();
    const user = auth.currentUser;
    return user ? { id: user.uid, email: user.email } : null;
  },
  async loadDecks(userId: string): Promise<Deck[]> {
    const { db } = getFirebase();
    const snap = await getDoc(doc(db, "users", userId));
    const data = snap.data();
    return (data?.decks as Deck[] | undefined) || [];
  },
  async saveDecks(userId: string, decks: Deck[]): Promise<void> {
    const { db } = getFirebase();
    await setDoc(doc(db, "users", userId), { decks }, { merge: true });
  },
  async loadCollection(userId: string): Promise<Collection> {
    const { db } = getFirebase();
    const snap = await getDoc(doc(db, "users", userId));
    const data = snap.data();
    return (data?.collection as Collection | undefined) || {};
  },
  async saveCollection(userId: string, collection: Collection): Promise<void> {
    const { db } = getFirebase();
    await setDoc(doc(db, "users", userId), { collection }, { merge: true });
  },
};

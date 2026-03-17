import type { Deck } from "./types";
import { normalizeAuthNextPath } from "./auth-redirect";

const PENDING_AUTH_ACTION_KEY = "devilfruit_pending_auth_action";
const MAX_PENDING_AGE_MS = 1000 * 60 * 60 * 6;

export type AuthPromptReason = "save_deck" | "collection_add";

export type PendingAuthAction =
  | {
      kind: "save_deck";
      createdAt: string;
      next: string;
      deck: Deck;
    }
  | {
      kind: "collection_add";
      createdAt: string;
      next: string;
      cardId: string;
      cardName?: string;
    };

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isExpired(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return Date.now() - created > MAX_PENDING_AGE_MS;
}

export function currentClientPath() {
  if (typeof window === "undefined") return "/account";
  return `${window.location.pathname}${window.location.search}`;
}

export function buildLoginUrl(nextPath: string, reason?: AuthPromptReason) {
  const params = new URLSearchParams();
  params.set("next", normalizeAuthNextPath(nextPath));
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export function describeAuthPromptReason(reason: string | null | undefined) {
  switch (reason) {
    case "save_deck":
      return "Create a free account to save this deck and reopen it from any device.";
    case "collection_add":
      return "Create a free account to save cards to your collection and keep them synced.";
    default:
      return null;
  }
}

export function setPendingAuthAction(action: PendingAuthAction) {
  if (!canUseLocalStorage()) return;
  const nextAction: PendingAuthAction = {
    ...action,
    createdAt: action.createdAt || new Date().toISOString(),
    next: normalizeAuthNextPath(action.next),
  };
  window.localStorage.setItem(PENDING_AUTH_ACTION_KEY, JSON.stringify(nextAction));
}

export function clearPendingAuthAction() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(PENDING_AUTH_ACTION_KEY);
}

export function getPendingAuthAction(): PendingAuthAction | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(PENDING_AUTH_ACTION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingAuthAction> | null;
    if (!parsed?.kind || typeof parsed.createdAt !== "string" || typeof parsed.next !== "string") {
      clearPendingAuthAction();
      return null;
    }

    if (isExpired(parsed.createdAt)) {
      clearPendingAuthAction();
      return null;
    }

    if (parsed.kind === "save_deck") {
      if (!parsed.deck || typeof parsed.deck !== "object" || typeof parsed.deck.id !== "string") {
        clearPendingAuthAction();
        return null;
      }

      return {
        kind: "save_deck",
        createdAt: parsed.createdAt,
        next: normalizeAuthNextPath(parsed.next),
        deck: parsed.deck,
      };
    }

    if (parsed.kind === "collection_add") {
      if (typeof parsed.cardId !== "string" || !parsed.cardId.trim()) {
        clearPendingAuthAction();
        return null;
      }

      return {
        kind: "collection_add",
        createdAt: parsed.createdAt,
        next: normalizeAuthNextPath(parsed.next),
        cardId: parsed.cardId,
        cardName: typeof parsed.cardName === "string" ? parsed.cardName : undefined,
      };
    }

    clearPendingAuthAction();
    return null;
  } catch {
    clearPendingAuthAction();
    return null;
  }
}

export function getPendingAuthDestination(fallback = "/account") {
  return getPendingAuthAction()?.next || fallback;
}

export function doesPendingActionMatchCurrentPath(action: PendingAuthAction) {
  return currentClientPath() === normalizeAuthNextPath(action.next);
}

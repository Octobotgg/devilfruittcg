export const LAST_MARKET_STATE_KEY = "devilfruit:last-market-state";
export const PENDING_MARKET_RESTORE_KEY = "devilfruit:pending-market-restore";

export type StoredMarketState = {
  path: string;
  scrollY: number;
  savedAt: number;
};

function isMarketPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/market");
}

function parseStoredState(raw: string | null): StoredMarketState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredMarketState>;
    if (!isMarketPath(parsed.path)) return null;

    return {
      path: parsed.path,
      scrollY: typeof parsed.scrollY === "number" && Number.isFinite(parsed.scrollY) ? parsed.scrollY : 0,
      savedAt: typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function readLastMarketState(): StoredMarketState | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  return parseStoredState(storage.getItem(LAST_MARKET_STATE_KEY));
}

export function writeLastMarketState(state: StoredMarketState) {
  const storage = getSessionStorage();
  if (!storage || !isMarketPath(state.path)) return;
  storage.setItem(LAST_MARKET_STATE_KEY, JSON.stringify(state));
}

export function readPendingMarketRestore(): StoredMarketState | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  return parseStoredState(storage.getItem(PENDING_MARKET_RESTORE_KEY));
}

export function writePendingMarketRestore(state: StoredMarketState) {
  const storage = getSessionStorage();
  if (!storage || !isMarketPath(state.path)) return;
  storage.setItem(PENDING_MARKET_RESTORE_KEY, JSON.stringify(state));
}

export function clearPendingMarketRestore() {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(PENDING_MARKET_RESTORE_KEY);
}

export function resolveMarketBackTarget(explicitPath?: string | null) {
  if (isMarketPath(explicitPath)) return explicitPath;
  const stored = readLastMarketState();
  return stored?.path || "/market";
}

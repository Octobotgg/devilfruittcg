import "server-only";
import vm from "node:vm";
import { getExternalSnapshot, setExternalSnapshot } from "@/lib/db";

type GumGumRawMove = {
  id: number;
  g: number;
  l: number;
  dl: number;
  pl: number;
  m: number;
  dm: number;
  pm: number;
};

type GumGumDataBlock = {
  data: GumGumRawMove[];
  lastModified?: string;
};

type GumGumCardData = {
  id: string;
  name?: string;
  group_id?: string;
};

type GumGumMapper = {
  productToCardId: (productId: string) => string | undefined;
  getCard: (cardId: string) => GumGumCardData | undefined;
  getImage: (cardId: string) => string | undefined;
};

export type GumGumMarketMover = {
  productId: string;
  groupId: string;
  cardId?: string;
  name: string;
  price: number;
  delta: number;
  percent: number;
  marketPrice: number;
  marketDelta: number;
  marketPercent: number;
  imageUrl?: string;
  tcgplayerUrl: string;
};

export type GumGumMarketMovesPayload = {
  updatedAt: string | null;
  fetchedAt: string;
  board: GumGumMarketMover[];
  ticker: GumGumMarketMover[];
  movers: GumGumMarketMover[];
  stale?: boolean;
  staleAgeMs?: number;
  refreshError?: string;
};

const MARKET_WATCH_URL = "https://gumgum.gg/market-watch";
const SNAPSHOT_KEY = "gumgum:market-movers:v1";
const IN_MEMORY_TTL_MS = 5 * 60 * 1000;
const SNAPSHOT_FRESH_MS = 30 * 60 * 1000;
const SNAPSHOT_MAX_STALE_MS = 48 * 60 * 60 * 1000;

let cache: { expiresAt: number; value: GumGumMarketMovesPayload } | null = null;
let refreshInFlight: Promise<GumGumMarketMovesPayload> | null = null;

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractBalancedJsonObject(source: string, objectStart: number): string | null {
  if (objectStart < 0 || objectStart >= source.length || source[objectStart] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = objectStart; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(objectStart, i + 1);
      }
    }
  }

  return null;
}

function extractDataBlockFromFlightString(flightString: string, key: "dailyData" | "weeklyData"): GumGumDataBlock {
  const keyToken = `"${key}":`;
  const keyIndex = flightString.indexOf(keyToken);
  if (keyIndex === -1) return { data: [] };

  const objectStart = flightString.indexOf("{", keyIndex + keyToken.length);
  if (objectStart === -1) return { data: [] };

  const jsonText = extractBalancedJsonObject(flightString, objectStart);
  if (!jsonText) return { data: [] };

  try {
    const parsed = JSON.parse(jsonText) as GumGumDataBlock;
    return {
      data: Array.isArray(parsed.data) ? parsed.data : [],
      lastModified: parsed.lastModified,
    };
  } catch {
    return { data: [] };
  }
}

function parseFlightEntriesFromHtml(html: string): unknown[] {
  const sandbox: { self: { __next_f: unknown[] } } = {
    self: {
      __next_f: [],
    },
  };

  const scripts = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of scripts) {
    const code = match[1] || "";
    if (!code.includes("self.__next_f.push")) continue;

    try {
      vm.runInNewContext(code, sandbox, { timeout: 1200 });
    } catch {
      // ignore malformed chunks
    }
  }

  return sandbox.self.__next_f;
}

function findChunkUrl(html: string, chunkId: string): string | null {
  const direct = html.match(new RegExp(`https://gumgum\\.gg/_next/static/chunks/${chunkId}-[^"']+\\.js`));
  if (direct?.[0]) return direct[0];

  const escaped = html.match(new RegExp(`https:\\\\/\\\\/gumgum\\\\.gg\\\\/_next\\\\/static\\\\/chunks\\\\/${chunkId}-[^"']+\\.js`));
  if (escaped?.[0]) return escaped[0].replaceAll("\\/", "/");

  const relative = html.match(new RegExp(`/_next/static/chunks/${chunkId}-[^"']+\\.js`));
  if (relative?.[0]) return `https://gumgum.gg${relative[0]}`;

  const relativeEscaped = html.match(new RegExp(`\\/_next\\/static\\/chunks\\/${chunkId}-[^"']+\\.js`));
  if (relativeEscaped?.[0]) return `https://gumgum.gg${relativeEscaped[0].replaceAll("\\/", "/")}`;

  return null;
}

function buildWebpackRequire(factories: Record<string, unknown>) {
  const moduleCache: Record<string, { exports: unknown }> = {};

  const webpackRequire = ((moduleId: number | string) => {
    const id = String(moduleId);
    if (moduleCache[id]) return moduleCache[id].exports;

    const factory = factories[id];
    if (typeof factory !== "function") {
      throw new Error(`Missing webpack module factory for ${id}`);
    }

    const module = { exports: {} as unknown };
    moduleCache[id] = module;

    (factory as (module: { exports: unknown }, exports: unknown, require: typeof webpackRequire) => void)(
      module,
      module.exports,
      webpackRequire
    );

    return module.exports;
  }) as ((moduleId: number | string) => unknown) & {
    d: (exports: object, definition: Record<string, () => unknown>) => void;
    o: (obj: object, prop: string) => boolean;
    r: (exports: object) => void;
  };

  webpackRequire.d = (exports: object, definition: Record<string, () => unknown>) => {
    for (const key of Object.keys(definition)) {
      if (webpackRequire.o(definition, key) && !webpackRequire.o(exports, key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key],
        });
      }
    }
  };

  webpackRequire.o = (obj: object, prop: string) => Object.prototype.hasOwnProperty.call(obj, prop);

  webpackRequire.r = (exports: object) => {
    if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    }
    Object.defineProperty(exports, "__esModule", { value: true });
  };

  return webpackRequire;
}

async function loadGumGumMapper(chunk4036Url: string | null, chunk4265Url: string | null): Promise<GumGumMapper | null> {
  if (!chunk4036Url || !chunk4265Url) return null;

  const [chunk4036Res, chunk4265Res] = await Promise.all([
    fetch(chunk4036Url, { cache: "no-store" }),
    fetch(chunk4265Url, { cache: "no-store" }),
  ]);

  if (!chunk4036Res.ok || !chunk4265Res.ok) return null;

  const [chunk4036Text, chunk4265Text] = await Promise.all([chunk4036Res.text(), chunk4265Res.text()]);

  const sandbox: { self: { webpackChunk_N_E: unknown[] } } = {
    self: {
      webpackChunk_N_E: [],
    },
  };

  vm.runInNewContext(chunk4036Text, sandbox, { timeout: 4000 });
  vm.runInNewContext(chunk4265Text, sandbox, { timeout: 4000 });

  const factories: Record<string, unknown> = {};

  for (const entry of sandbox.self.webpackChunk_N_E) {
    if (!Array.isArray(entry)) continue;
    const modules = entry[1];
    if (!modules || typeof modules !== "object") continue;
    Object.assign(factories, modules as Record<string, unknown>);
  }

  if (!factories["24245"] || !factories["24265"]) return null;

  const require = buildWebpackRequire(factories);
  const productMapModule = require(24245) as { T7?: (productId: string) => string | undefined };
  const cardDataModule = require(24265) as {
    Zy?: (cardId: string) => GumGumCardData | undefined;
    MQ?: (cardId: string, size?: string) => string;
  };

  if (typeof productMapModule?.T7 !== "function") return null;

  return {
    productToCardId: (productId: string) => {
      try {
        return productMapModule.T7?.(productId);
      } catch {
        return undefined;
      }
    },
    getCard: (cardId: string) => {
      try {
        return cardDataModule?.Zy?.(cardId);
      } catch {
        return undefined;
      }
    },
    getImage: (cardId: string) => {
      try {
        return cardDataModule?.MQ?.(cardId, "158x220");
      } catch {
        return undefined;
      }
    },
  };
}

function buildMover(raw: GumGumRawMove, mapper: GumGumMapper | null): GumGumMarketMover {
  const productId = String(raw.id);
  const cardId = mapper?.productToCardId(productId);
  const card = cardId ? mapper?.getCard(cardId) : undefined;

  return {
    productId,
    groupId: String(raw.g),
    cardId,
    name: card?.name || `TCG Product ${productId}`,
    price: safeNumber(raw.l),
    delta: safeNumber(raw.dl),
    percent: safeNumber(raw.pl),
    marketPrice: safeNumber(raw.m),
    marketDelta: safeNumber(raw.dm),
    marketPercent: safeNumber(raw.pm),
    imageUrl: cardId ? mapper?.getImage(cardId) : undefined,
    tcgplayerUrl: `https://www.tcgplayer.com/product/${productId}`,
  };
}

function uniqueByProductId(items: GumGumMarketMover[]): GumGumMarketMover[] {
  const seen = new Set<string>();
  const out: GumGumMarketMover[] = [];

  for (const item of items) {
    if (seen.has(item.productId)) continue;
    seen.add(item.productId);
    out.push(item);
  }

  return out;
}

async function fetchLiveGumGumMarketMoves(): Promise<GumGumMarketMovesPayload> {
  const htmlRes = await fetch(MARKET_WATCH_URL, {
    cache: "no-store",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!htmlRes.ok) {
    throw new Error(`GumGum market-watch fetch failed: ${htmlRes.status}`);
  }

  const html = await htmlRes.text();

  const entries = parseFlightEntriesFromHtml(html);
  const dataFlightString = entries
    .map((entry) => (Array.isArray(entry) ? entry[1] : undefined))
    .find((value): value is string => typeof value === "string" && value.includes('"dailyData"') && value.includes('"weeklyData"'));

  if (!dataFlightString) {
    throw new Error("Could not locate dailyData/weeklyData in GumGum flight payload");
  }

  const daily = extractDataBlockFromFlightString(dataFlightString, "dailyData");

  const chunk4036Url = findChunkUrl(html, "4036");
  const chunk4265Url = findChunkUrl(html, "4265");

  let mapper: GumGumMapper | null = null;
  try {
    mapper = await loadGumGumMapper(chunk4036Url, chunk4265Url);
  } catch {
    mapper = null;
  }

  const movers = uniqueByProductId(
    (daily.data || [])
      .map((raw) => buildMover(raw, mapper))
      .filter((item) => Number.isFinite(item.percent) && item.percent !== 0 && item.price > 0)
      .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent))
  );

  const topUp = movers
    .filter((item) => item.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);

  const topDown = movers
    .filter((item) => item.percent < 0)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 8);

  const board = [...topUp.slice(0, 3), ...topDown.slice(0, 3)];
  const ticker = [...topUp.slice(0, 8), ...topDown.slice(0, 8)];

  return {
    updatedAt: daily.lastModified || null,
    fetchedAt: new Date().toISOString(),
    board: board.length ? board : movers.slice(0, 6),
    ticker: ticker.length ? ticker : movers.slice(0, 12),
    movers,
    stale: false,
  };
}

async function refreshAndPersistGumGumMarketMoves(): Promise<GumGumMarketMovesPayload> {
  const payload = await fetchLiveGumGumMarketMoves();

  setExternalSnapshot(SNAPSHOT_KEY, {
    ...payload,
    stale: false,
    staleAgeMs: undefined,
    refreshError: undefined,
  });

  cache = {
    value: {
      ...payload,
      stale: false,
      staleAgeMs: undefined,
      refreshError: undefined,
    },
    expiresAt: Date.now() + IN_MEMORY_TTL_MS,
  };

  return cache.value;
}

function queueRefresh(): Promise<GumGumMarketMovesPayload> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAndPersistGumGumMarketMoves().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight!;
}

export async function getGumGumMarketMoves(forceRefresh = false): Promise<GumGumMarketMovesPayload> {
  const now = Date.now();

  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const snapshot = getExternalSnapshot<GumGumMarketMovesPayload>(SNAPSHOT_KEY);
  const snapshotAge = snapshot ? now - snapshot.updatedAt : null;

  if (!forceRefresh && snapshot && snapshotAge !== null && snapshotAge <= SNAPSHOT_FRESH_MS) {
    const freshSnapshot = {
      ...snapshot.data,
      stale: false,
      staleAgeMs: undefined,
      refreshError: undefined,
    } satisfies GumGumMarketMovesPayload;

    cache = {
      value: freshSnapshot,
      expiresAt: now + IN_MEMORY_TTL_MS,
    };

    return freshSnapshot;
  }

  if (!forceRefresh && snapshot && snapshotAge !== null && snapshotAge <= SNAPSHOT_MAX_STALE_MS) {
    void queueRefresh();

    const staleSnapshot = {
      ...snapshot.data,
      stale: true,
      staleAgeMs: snapshotAge,
    } satisfies GumGumMarketMovesPayload;

    cache = {
      value: staleSnapshot,
      expiresAt: now + Math.min(IN_MEMORY_TTL_MS, 60 * 1000),
    };

    return staleSnapshot;
  }

  try {
    return await queueRefresh();
  } catch (error) {
    if (snapshot && snapshotAge !== null && snapshotAge <= SNAPSHOT_MAX_STALE_MS) {
      const staleFallback = {
        ...snapshot.data,
        stale: true,
        staleAgeMs: snapshotAge,
        refreshError: String(error),
      } satisfies GumGumMarketMovesPayload;

      cache = {
        value: staleFallback,
        expiresAt: now + Math.min(IN_MEMORY_TTL_MS, 60 * 1000),
      };

      return staleFallback;
    }

    throw error;
  }
}

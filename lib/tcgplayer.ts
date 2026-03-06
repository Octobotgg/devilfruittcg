type OAuthToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  userName?: string;
  ".issued"?: string;
  ".expires"?: string;
};

type CachedToken = {
  token: string;
  expiresAt: number;
};

let tokenCache: CachedToken | null = null;

const TCG_BASE = "https://api.tcgplayer.com";

function readCreds() {
  const publicKey = process.env.TCGPLAYER_PUBLIC_KEY || process.env.TCGPLAYER_CLIENT_ID || "";
  const privateKey = process.env.TCGPLAYER_PRIVATE_KEY || process.env.TCGPLAYER_CLIENT_SECRET || "";
  return {
    publicKey: publicKey.trim(),
    privateKey: privateKey.trim(),
  };
}

export function isTcgplayerConfigured(): boolean {
  const creds = readCreds();
  return Boolean(creds.publicKey && creds.privateKey);
}

export async function getTcgplayerToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  const { publicKey, privateKey } = readCreds();
  if (!publicKey || !privateKey) {
    throw new Error("TCGplayer credentials not configured (TCGPLAYER_PUBLIC_KEY / TCGPLAYER_PRIVATE_KEY)");
  }

  const auth = Buffer.from(`${publicKey}:${privateKey}`).toString("base64");
  const res = await fetch(`${TCG_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TCGplayer auth failed (${res.status}): ${text.slice(0, 220)}`);
  }

  const payload = (await res.json()) as OAuthToken;
  if (!payload?.access_token) {
    throw new Error("TCGplayer auth response missing access_token");
  }

  const ttl = Math.max(60, Number(payload.expires_in || 3600));
  tokenCache = {
    token: payload.access_token,
    expiresAt: now + ttl * 1000,
  };

  return payload.access_token;
}

async function tcgRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getTcgplayerToken();

  const res = await fetch(`${TCG_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TCGplayer request failed (${res.status}) ${path}: ${text.slice(0, 220)}`);
  }

  return (await res.json()) as T;
}

export type TcgCategory = {
  categoryId: number;
  name: string;
  displayName?: string;
  seoCategoryName?: string;
  categoryDescription?: string;
};

export async function tcgGetCategories(limit = 500, offset = 0) {
  return await tcgRequest<{ success: boolean; results: TcgCategory[] }>(
    `/catalog/categories?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`
  );
}

export type TcgSearchResult = {
  productId: number;
  name: string;
  cleanName?: string;
  imageUrl?: string;
  categoryId?: number;
  groupId?: number;
  url?: string;
};

export async function tcgSearchCategory(categoryId: number, searchText: string, options?: { limit?: number; offset?: number }) {
  const body = {
    sort: "Relevance",
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    searchText,
    getExtendedFields: true,
  };

  return await tcgRequest<{ success: boolean; results: TcgSearchResult[] }>(`/catalog/categories/${categoryId}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export type TcgProductPrice = {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice?: number | null;
  subTypeName?: string;
};

export async function tcgGetProductPrices(productIds: number[]) {
  const ids = productIds.filter((x) => Number.isFinite(x)).map((x) => Math.trunc(x));
  if (!ids.length) return { success: true, results: [] as TcgProductPrice[] };

  const endpoint = `/pricing/product/${encodeURIComponent(ids.join(","))}`;
  return await tcgRequest<{ success: boolean; results: TcgProductPrice[] }>(endpoint);
}

export async function tcgGetProductList(params: {
  categoryId?: number;
  groupId?: number;
  productName?: string;
  getExtendedFields?: boolean;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params.categoryId != null) q.set("categoryId", String(params.categoryId));
  if (params.groupId != null) q.set("groupId", String(params.groupId));
  if (params.productName) q.set("productName", params.productName);
  q.set("getExtendedFields", String(params.getExtendedFields ?? true));
  q.set("limit", String(params.limit ?? 50));
  q.set("offset", String(params.offset ?? 0));

  return await tcgRequest<{ success: boolean; results: TcgSearchResult[] }>(`/catalog/products?${q.toString()}`);
}

export async function tcgFindOnePieceCategoryId(): Promise<number | null> {
  const data = await tcgGetCategories(800, 0);
  const rows = data?.results || [];

  const pick = rows.find((r) => /one\s*piece/i.test(r.name || "") || /one\s*piece/i.test(r.displayName || ""));
  return pick?.categoryId ?? null;
}

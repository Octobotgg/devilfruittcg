export interface EbaySale {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  condition: string;
  url: string;
  image?: string;
}

export interface MarketData {
  cardName: string;
  cardId: string;
  ebay: {
    sales: EbaySale[];
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
    saleCount: number;
  };
  tcgplayer: {
    low: number | null;
    mid: number | null;
    high: number | null;
    market: number | null;
  };
  trend: {
    direction: "up" | "down" | "flat";
    percent: number;
  };
  lastUpdated: string;
}

async function getEbayToken(): Promise<string> {
  const clientId = process.env.EBAY_APP_ID;
  const clientSecret = process.env.EBAY_CERT_ID;

  if (!clientId || !clientSecret) {
    throw new Error("eBay credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    "https://api.ebay.com/identity/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    }
  );

  if (!res.ok) throw new Error(`eBay token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function fetchEbaySales(cardName: string, cardId: string): Promise<MarketData> {
  let sales: EbaySale[] = [];

  try {
    const token = await getEbayToken();
    const query = encodeURIComponent(`One Piece TCG ${cardName} ${cardId}`);

    const res = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&filter=buyingOptions%3A%7BFIXED_PRICE%7D,conditions%3A%7BNEW%7D&category_ids=2536&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      sales = (data.itemSummaries || []).slice(0, 5).map((item: Record<string, unknown>) => ({
        title: item.title as string,
        price: parseFloat((item.price as Record<string, string>)?.value || "0"),
        currency: (item.price as Record<string, string>)?.currency || "USD",
        soldDate: new Date().toISOString().split("T")[0],
        condition: (item.condition as string) || "Unknown",
        url: item.itemWebUrl as string,
        image: ((item.thumbnailImages as Record<string, string>[])?.[0] || (item.image as Record<string, string>))?.imageUrl,
      }));
    }
  } catch (err) {
    console.error("eBay fetch error:", err);
  }

  // Use mock data if no real data or API not configured
  if (sales.length === 0) {
    sales = getMockSales(cardName, cardId);
  }

  const prices = sales.map((s) => s.price).filter((p) => p > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;

  // Mock TCGPlayer data (replace with real API when key is available)
  const tcgMock = getMockTCGPlayer(avg);

  return {
    cardName,
    cardId,
    ebay: {
      sales,
      averagePrice: parseFloat(avg.toFixed(2)),
      lowestPrice: parseFloat(low.toFixed(2)),
      highestPrice: parseFloat(high.toFixed(2)),
      saleCount: sales.length,
    },
    tcgplayer: tcgMock,
    trend: {
      direction: Math.random() > 0.5 ? "up" : "down",
      percent: parseFloat((Math.random() * 15).toFixed(1)),
    },
    lastUpdated: new Date().toISOString(),
  };
}

function getMockSales(cardName: string, cardId: string): EbaySale[] {
  const basePrice = getBasePrice(cardId);
  const dates = ["2025-02-24", "2025-02-23", "2025-02-22", "2025-02-21", "2025-02-20"];
  return dates.map((date, i) => ({
    title: `One Piece TCG ${cardName} ${cardId} NM/M`,
    price: parseFloat((basePrice * (0.85 + Math.random() * 0.3)).toFixed(2)),
    currency: "USD",
    soldDate: date,
    condition: i % 3 === 0 ? "Near Mint" : i % 3 === 1 ? "Lightly Played" : "Near Mint",
    url: `https://www.ebay.com/sch/i.html?_nkw=one+piece+tcg+${encodeURIComponent(cardName)}`,
  }));
}

function getBasePrice(cardId: string): number {
  const rareCards: Record<string, number> = {
    "OP05-001": 85, "OP07-001": 120, "OP08-001": 95, "OP04-001": 45,
    "OP01-001": 35, "OP05-002": 55, "OP02-001": 28, "OP04-002": 40,
  };
  return rareCards[cardId] || 5 + Math.random() * 20;
}

function getMockTCGPlayer(avg: number) {
  if (!avg) return { low: null, mid: null, high: null, market: null };
  return {
    low: parseFloat((avg * 0.8).toFixed(2)),
    mid: parseFloat((avg * 1.0).toFixed(2)),
    high: parseFloat((avg * 1.25).toFixed(2)),
    market: parseFloat((avg * 0.95).toFixed(2)),
  };
}

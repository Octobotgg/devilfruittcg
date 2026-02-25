import { NextRequest, NextResponse } from "next/server";
import { fetchEbaySales } from "@/lib/ebay";
import { getCached, setCache } from "@/lib/db";
import { searchCards } from "@/lib/cards";

export async function GET(req: NextRequest) {
  const cardParam = req.nextUrl.searchParams.get("card") || "";
  const idParam = req.nextUrl.searchParams.get("id") || "";

  if (!cardParam && !idParam) {
    return NextResponse.json({ error: "card or id param required" }, { status: 400 });
  }

  // Find card
  let cardName = cardParam;
  let cardId = idParam;

  if (!cardName || !cardId) {
    const results = searchCards(cardParam || cardId);
    if (results.length > 0) {
      cardName = results[0].name;
      cardId = results[0].id;
    }
  }

  // Check cache
  const cached = getCached(cardId);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // Fetch fresh data
  try {
    const data = await fetchEbaySales(cardName, cardId);
    setCache(cardId, cardName, data);
    return NextResponse.json({ ...data, cached: false });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch market data", detail: String(err) },
      { status: 500 }
    );
  }
}

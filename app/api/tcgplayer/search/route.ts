import { NextRequest, NextResponse } from "next/server";
import {
  isTcgplayerConfigured,
  tcgFindOnePieceCategoryId,
  tcgGetProductList,
  tcgGetProductPrices,
  tcgSearchCategory,
} from "@/lib/tcgplayer";

export async function GET(req: NextRequest) {
  const configured = isTcgplayerConfigured();
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const categoryIdParam = req.nextUrl.searchParams.get("categoryId");
  const limit = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("limit") || 15)));

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        configured,
        message: "Missing TCGPLAYER_PUBLIC_KEY and/or TCGPLAYER_PRIVATE_KEY",
      },
      { status: 200 }
    );
  }

  if (!q) {
    return NextResponse.json(
      {
        ok: false,
        configured,
        message: "Provide ?q=...",
      },
      { status: 400 }
    );
  }

  try {
    const categoryId = categoryIdParam ? Number(categoryIdParam) : await tcgFindOnePieceCategoryId();

    let products = [] as Awaited<ReturnType<typeof tcgSearchCategory>>["results"];

    if (categoryId && Number.isFinite(categoryId)) {
      const byCategory = await tcgSearchCategory(categoryId, q, { limit, offset: 0 });
      products = byCategory.results || [];
    }

    if (!products.length) {
      const byName = await tcgGetProductList({
        productName: q,
        categoryId: categoryId && Number.isFinite(categoryId) ? categoryId : undefined,
        getExtendedFields: true,
        limit,
        offset: 0,
      });
      products = byName.results || [];
    }

    const productIds = products.map((p) => p.productId).filter((id) => Number.isFinite(id));
    const prices = productIds.length ? await tcgGetProductPrices(productIds) : { results: [] as any[] };

    const priceByProduct = new Map<number, any>();
    for (const p of prices.results || []) {
      priceByProduct.set(Number(p.productId), p);
    }

    const results = products.map((p) => {
      const price = priceByProduct.get(Number(p.productId));
      return {
        ...p,
        price: price
          ? {
              lowPrice: price.lowPrice,
              midPrice: price.midPrice,
              highPrice: price.highPrice,
              marketPrice: price.marketPrice,
              directLowPrice: price.directLowPrice,
              subTypeName: price.subTypeName,
            }
          : null,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        configured,
        q,
        categoryId,
        count: results.length,
        results,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured,
        q,
        message: error instanceof Error ? error.message : "Unknown TCGplayer error",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

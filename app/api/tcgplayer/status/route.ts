import { NextRequest, NextResponse } from "next/server";
import { isTcgplayerConfigured, tcgFindOnePieceCategoryId, tcgGetCategories, getTcgplayerToken } from "@/lib/tcgplayer";

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  const configured = isTcgplayerConfigured();
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

  try {
    const token = await getTcgplayerToken(forceRefresh);
    const [cats, onePieceCategoryId] = await Promise.all([tcgGetCategories(250, 0), tcgFindOnePieceCategoryId()]);

    return NextResponse.json(
      {
        ok: true,
        configured,
        tokenPreview: `${token.slice(0, 10)}...`,
        categoriesReturned: cats.results?.length || 0,
        onePieceCategoryId,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured,
        message: error instanceof Error ? error.message : "Unknown TCGplayer error",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

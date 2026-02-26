import { NextRequest, NextResponse } from "next/server";
import { loadCards } from "@/lib/card-feed";

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim().toUpperCase();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const cards = await loadCards();
  const variants = cards.filter((c) => c.id.toUpperCase() === id);

  return NextResponse.json(
    {
      id,
      count: variants.length,
      variants,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

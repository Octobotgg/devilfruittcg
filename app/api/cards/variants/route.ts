import { NextRequest, NextResponse } from "next/server";
import { getOfficialVariantsByBaseId } from "@/lib/official-cards";

export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").trim().toUpperCase();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const variants = getOfficialVariantsByBaseId(id);

  return NextResponse.json(
    {
      id,
      count: variants.length,
      variants,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

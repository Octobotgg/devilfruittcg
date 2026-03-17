import { NextRequest, NextResponse } from "next/server";
import { EN_VARIANT_TYPES, type EnVariantType } from "@/lib/card-variants";
import { getPreferredOfficialVariants, type PreferredOfficialVariantType } from "@/lib/official-cards";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") || "";
  const typeParam = (req.nextUrl.searchParams.get("type") || "special_print").trim().toLowerCase();
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ error: "ids are required" }, { status: 400 });
  }

  const requestedType =
    typeParam === "special_print" || EN_VARIANT_TYPES.includes(typeParam as EnVariantType)
      ? (typeParam as PreferredOfficialVariantType)
      : null;

  if (!requestedType) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const results = getPreferredOfficialVariants(ids, requestedType);

  return NextResponse.json(
    {
      total: results.length,
      results,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

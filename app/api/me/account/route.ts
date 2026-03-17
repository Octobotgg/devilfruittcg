import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import { deleteUserProfileData } from "@/lib/db";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/user-context";

export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function DELETE(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:account:delete",
    max: 6,
    windowMs: 60_000,
    blockMs: 10 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimit.headers });
  }

  let userId = "";
  try {
    ({ id: userId } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  const deletedData = deleteUserProfileData(userId);
  const serviceClient = getServiceClient();
  let authDeleted = false;

  if (serviceClient) {
    const { error } = await serviceClient.auth.admin.deleteUser(userId);
    authDeleted = !error;
  }

  return NextResponse.json(
    {
      ok: deletedData,
      authDeleted,
      message: authDeleted
        ? "Account and profile data deleted."
        : "Profile data deleted. Auth identity could not be removed because a service role key is not configured.",
    },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    },
  );
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type AuthenticatedSupabaseUser = AuthenticatedUser & {
  userMetadata: Record<string, unknown>;
  createdAt: string | null;
};

class UserContextError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "UserContextError";
    this.status = status;
    this.code = code;
  }
}

let authClient: SupabaseClient | null = null;

function cleanEnvValue(value: string | undefined) {
  return String(value || "").replace(/\\n/g, "").trim();
}

function getSupabaseAuthClient() {
  if (authClient) return authClient;

  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    throw new UserContextError(503, "supabase_not_configured", "Supabase auth is not configured.");
  }

  authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return authClient;
}

function getBearerToken(req: Request | NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;

  const trimmed = token.trim();
  return trimmed || null;
}

export async function requireAuthenticatedSupabaseUser(req: Request | NextRequest): Promise<AuthenticatedSupabaseUser> {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    throw new UserContextError(401, "auth_required", "Sign in is required.");
  }

  const client = getSupabaseAuthClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new UserContextError(401, "invalid_session", "Your session is invalid or expired. Sign in again.");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    userMetadata:
      data.user.user_metadata && typeof data.user.user_metadata === "object"
        ? (data.user.user_metadata as Record<string, unknown>)
        : {},
    createdAt: typeof data.user.created_at === "string" ? data.user.created_at : null,
  };
}

export async function requireAuthenticatedUser(req: Request | NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedSupabaseUser(req);
  return {
    id: user.id,
    email: user.email,
  };
}

export function authErrorResponse(error: unknown, headers: HeadersInit = {}) {
  const normalized =
    error instanceof UserContextError
      ? error
      : new UserContextError(500, "auth_verification_failed", "Could not verify the current user session.");

  return NextResponse.json(
    {
      error: normalized.message,
      code: normalized.code,
    },
    {
      status: normalized.status,
      headers: {
        ...headers,
        "Cache-Control": "no-store",
      },
    }
  );
}

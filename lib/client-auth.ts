"use client";

import { getSupabaseClient, hasSupabaseConfig } from "@/lib/cloud/supabase";

export async function getClientAccessToken(): Promise<string | null> {
  if (!hasSupabaseConfig()) return null;

  try {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getClientAuthHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra || {});
  const accessToken = await getClientAccessToken();

  if (!accessToken) {
    throw new Error("Sign in is required.");
  }

  headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export async function fetchWithClientAuth(input: RequestInfo | URL, init?: RequestInit) {
  const headers = await getClientAuthHeaders(init?.headers);
  return fetch(input, {
    ...init,
    headers,
  });
}

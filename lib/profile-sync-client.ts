"use client";

import { fetchWithClientAuth } from "@/lib/client-auth";
import type { ProfileActivityKind, ProfileSummary } from "@/lib/profile-types";

export async function syncProfileSummaryPatch(summary: Partial<ProfileSummary>) {
  const res = await fetchWithClientAuth("/api/me/profile/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ summary }),
  });

  if (!res.ok) {
    throw new Error("Could not sync profile summary.");
  }

  return await res.json();
}

export async function logProfileActivity(input: {
  kind: ProfileActivityKind;
  title: string;
  detail: string;
  cardId?: string | null;
  deckId?: string | null;
  publicVisible?: boolean;
  dedupeKey?: string | null;
}) {
  const res = await fetchWithClientAuth("/api/me/profile/activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error("Could not log profile activity.");
  }

  return await res.json();
}

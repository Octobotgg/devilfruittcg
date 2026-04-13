"use client";

import { getSupabaseClient, hasSupabaseConfig } from "./supabase";

type DeckNoteRow = {
  notes: string;
};

type SaveDeckNoteInput = {
  deckId: string;
  userId: string;
  notes: string;
};

async function resolveUserId(userId?: string | null) {
  if (userId) return userId;
  const { data } = await getSupabaseClient().auth.getUser();
  return data.user?.id ?? null;
}

export async function loadDeckNote(deckId: string, userId?: string | null): Promise<string> {
  if (!hasSupabaseConfig()) return "";

  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return "";

  const { data, error } = await getSupabaseClient()
    .from("deck_notes")
    .select("notes")
    .eq("deck_id", deckId)
    .eq("user_id", resolvedUserId)
    .maybeSingle<DeckNoteRow>();

  if (error) throw error;
  return data?.notes ?? "";
}

export async function saveDeckNote({ deckId, userId, notes }: SaveDeckNoteInput): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const { error } = await getSupabaseClient().from("deck_notes").upsert(
    {
      deck_id: deckId,
      user_id: userId,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "deck_id,user_id" }
  );

  if (error) throw error;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

type PlayerRow = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
  bio: string;
  favoriteLeaderId: string | null;
  updatedAt: string;
};

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load players");
        return await res.json();
      })
      .then((json) => {
        if (!cancelled) setPlayers(Array.isArray(json.results) ? (json.results as PlayerRow[]) : []);
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <section className="journal-surface rounded-[2rem] p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">Community</p>
        <h1 className="mt-2 text-4xl font-black text-white">Players Directory</h1>
        <p className="mt-3 text-white/60">Search public captains by username or display name.</p>

        <label className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(event) => {
              setPlayers(null);
              setQuery(event.target.value);
            }}
            placeholder="Search captains..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {players === null ? (
          <p className="text-white/45">Loading players...</p>
        ) : players.length ? (
          players.map((player) => (
            <Link key={player.userId} href={`/user/${player.username}`} className="rounded-[1.7rem] border border-white/10 bg-black/20 p-5 transition-colors hover:border-white/20">
              <div className="flex items-start gap-4">
                <ProfileAvatar avatarKey={player.avatarKey} displayName={player.displayName} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-white">{player.displayName}</p>
                  <p className="text-sm text-white/45">@{player.username}</p>
                  <p className="mt-3 line-clamp-2 text-sm text-white/60">{player.bio || "No bio yet."}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-white/45">No public captains matched that search.</p>
        )}
      </section>
    </div>
  );
}

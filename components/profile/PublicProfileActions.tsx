"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Swords, UserPlus, UserRoundCheck } from "lucide-react";
import { fetchWithClientAuth } from "@/lib/client-auth";
import { useCloudSync } from "@/lib/cloud/useCloudSync";

type PublicProfileActionsProps = {
  username: string;
  targetUserId?: string | null;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialIsFollowing: boolean;
  allowFollow: boolean;
};

export default function PublicProfileActions({
  username,
  targetUserId,
  initialFollowerCount,
  initialFollowingCount,
  initialIsFollowing,
  allowFollow,
}: PublicProfileActionsProps) {
  const { user } = useCloudSync();
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount] = useState(initialFollowingCount);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileUrl = useMemo(() => `https://devilfruittcg.gg/user/${username}`, [username]);
  const canFollow = allowFollow && Boolean(user) && user?.id !== targetUserId;

  useEffect(() => {
    if (!canFollow || !user) return;

    let cancelled = false;

    void fetchWithClientAuth(`/api/users/${encodeURIComponent(username)}/follow`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load follow state");
        return await res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setIsFollowing(Boolean(json.isFollowing));
        setFollowerCount(Number(json.followerCount || 0));
      })
      .catch(() => {
        // ignore follow-state hydration failures
      });

    return () => {
      cancelled = true;
    };
  }, [canFollow, user, username]);

  async function toggleFollow() {
    if (!canFollow || !user) return;
    setLoading(true);

    try {
      const res = await fetchWithClientAuth(`/api/users/${encodeURIComponent(username)}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setIsFollowing(Boolean(json.isFollowing));
        setFollowerCount(Number(json.followerCount || 0));
      }
    } finally {
      setLoading(false);
    }
  }

  async function shareProfile() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canFollow ? (
        <button
          type="button"
          onClick={() => {
            void toggleFollow();
          }}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-4 text-sm font-bold text-[var(--color-text-mid)] transition-colors hover:border-[rgba(212,160,84,0.42)] hover:text-[var(--color-navy)] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? <UserRoundCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isFollowing ? "Following" : "Follow"}
        </button>
      ) : null}
      {canFollow ? (
        <button
          type="button"
          disabled
          title="Trading requests will arrive in a future update."
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.16)] bg-[rgba(232,223,208,0.42)] px-4 text-sm font-bold text-[var(--color-text-light)]"
        >
          <Swords className="h-4 w-4" />
          Request Trade
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void shareProfile();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.34)] bg-[rgba(212,160,84,0.12)] px-4 text-sm font-bold text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.18)]"
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copied" : "Share Profile"}
      </button>
      <div className="inline-flex items-center gap-3 rounded-xl border border-[rgba(212,160,84,0.2)] bg-[rgba(255,249,235,0.72)] px-4 py-3 text-sm text-[var(--color-text-mid)]">
        <span>{followerCount} followers</span>
        <span>{followingCount} following</span>
      </div>
    </div>
  );
}

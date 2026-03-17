"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Crown, ExternalLink, Lock, ScrollText, ShieldCheck } from "lucide-react";
import ActivityFeed from "@/components/profile/ActivityFeed";
import BadgeBoard from "@/components/profile/BadgeBoard";
import FeaturedDecks from "@/components/profile/FeaturedDecks";
import OwnerProfileTools from "@/components/profile/OwnerProfileTools";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileStatCards from "@/components/profile/ProfileStatCards";
import PublicDeckArchive from "@/components/profile/PublicDeckArchive";
import PublicProfileActions from "@/components/profile/PublicProfileActions";
import { fetchWithClientAuth } from "@/lib/client-auth";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import type {
  ProfileActivity,
  ProfileBadge,
  ProfileFeaturedDeck,
  ProfilePublicDeck,
  ProfileSummary,
  UserProfileRecord,
} from "@/lib/profile-types";

type FollowRow = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
};

type AccountProfilePayload = {
  profile: UserProfileRecord;
  summary: ProfileSummary | null;
  badges: ProfileBadge[];
  followerCount: number;
  followingCount: number;
  followers: FollowRow[];
  following: FollowRow[];
  activities: ProfileActivity[];
  featuredDecks: ProfileFeaturedDeck[];
  publicDecks: ProfilePublicDeck[];
};

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="journal-surface rounded-[2rem] p-8">
        <p className="text-sm text-white/55">Loading your captain profile...</p>
      </section>
    </div>
  );
}

function SignedOutState() {
  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="journal-surface rounded-[2rem] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Account access
        </div>
        <h1 className="mt-5 text-3xl font-black text-white">Sign in to view your captain profile</h1>
        <p className="mt-2 text-sm text-white/60">Your profile page lives here, even when your public handle is private.</p>
        <Link
          href="/login?next=%2Faccount%2Fprofile"
          className="luxury-action mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-[var(--obsidian-soft)]"
        >
          Go to Login
        </Link>
      </section>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="journal-surface rounded-[2rem] p-8">
        <p className="text-sm text-red-200">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/account/settings"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 hover:text-white"
          >
            Account Settings
          </Link>
          <Link
            href="/decks"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-bold text-[var(--theme-accent-2)]"
          >
            Crew Hangar
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function AccountProfilePage() {
  const { user, ready, hasCloud } = useCloudSync();
  const [payload, setPayload] = useState<AccountProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user || !hasCloud) return;

    let cancelled = false;

    void fetchWithClientAuth("/api/me/profile", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as AccountProfilePayload | { error?: string } | null;
        if (!res.ok) {
          throw new Error(json && "error" in json && typeof json.error === "string" ? json.error : "We could not load your captain profile.");
        }
        if (!cancelled) setPayload(json as AccountProfilePayload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "We could not load your captain profile.");
      });

    return () => {
      cancelled = true;
    };
  }, [hasCloud, ready, user]);

  const activeUserId = user?.id ?? null;
  const waitingForProfile = ready && Boolean(activeUserId) && hasCloud && !error && (!payload || payload.profile.userId !== activeUserId);

  if (!ready || waitingForProfile) return <LoadingState />;
  if (!user || !hasCloud) return <SignedOutState />;
  if (!payload) return <ErrorState message={error || "We could not load your captain profile."} />;

  const { profile, summary, badges, followerCount, followingCount, followers, following, activities, featuredDecks, publicDecks } = payload;
  const publicProfileHref = profile.username ? `/user/${profile.username}` : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <section className="journal-surface relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,175,55,0.15),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.12),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(0deg,transparent_24%,rgba(248,212,121,0.8)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(248,212,121,0.45)_25%,transparent_26%)] [background-size:26px_26px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <ProfileAvatar avatarKey={profile.avatarKey} displayName={profile.displayName} size="xl" />
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
                <ScrollText className="h-3.5 w-3.5" /> Your captain profile
              </div>
              <h1 className="mt-4 text-4xl font-black text-white">{profile.displayName}</h1>
              <p className="mt-1 text-lg text-white/50">@{profile.username || "claim-your-handle"}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/55">
                <span>Member since {new Date(profile.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                <span className="inline-flex items-center gap-1">
                  {profile.profileVisibility === "private" ? <Lock className="h-3.5 w-3.5" /> : <Compass className="h-3.5 w-3.5" />}
                  {profile.profileVisibility === "private" ? "Private profile" : "Public profile"}
                </span>
                {profile.favoriteLeaderId ? <span>Favorite leader: {profile.favoriteLeaderId}</span> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {publicProfileHref ? (
              <PublicProfileActions
                username={profile.username || ""}
                targetUserId={profile.userId}
                initialFollowerCount={followerCount}
                initialFollowingCount={followingCount}
                initialIsFollowing={false}
                allowFollow={false}
              />
            ) : (
              <div className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                <span>{followerCount} followers</span>
                <span>{followingCount} following</span>
              </div>
            )}
            <OwnerProfileTools targetUserId={profile.userId} />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/account/settings"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 transition-colors hover:text-white"
              >
                Account Settings
              </Link>
              {publicProfileHref ? (
                <Link
                  href={publicProfileHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-bold text-[var(--theme-accent-2)]"
                >
                  Open Public URL
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <ProfileStatCards summary={summary} followerCount={followerCount} />

      <FeaturedDecks decks={featuredDecks} targetUserId={profile.userId} />

      <PublicDeckArchive decks={publicDecks} targetUserId={profile.userId} />

      <BadgeBoard badges={badges} />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-black text-white">Captain&apos;s Log</h2>
            </div>
          </div>
          <div className="mt-5">
            <ActivityFeed activities={activities} emptyMessage="Start building decks or adding cards to fill your captain's log." />
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Social Circle</p>
                <h2 className="mt-2 text-2xl font-black text-white">Crew Manifest</h2>
              </div>
              <Crown className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Followers</p>
                <div className="mt-3 space-y-3">
                  {followers.length ? followers.map((row) => (
                    <div key={`follower-${row.userId}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{row.displayName}</p>
                        <p className="text-xs text-white/45">@{row.username || "pirate"}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/45">No followers yet.</p>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Following</p>
                <div className="mt-3 space-y-3">
                  {following.length ? following.map((row) => (
                    <div key={`following-${row.userId}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{row.displayName}</p>
                        <p className="text-xs text-white/45">@{row.username || "pirate"}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/45">You are not following anyone yet.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Quick Links</p>
                <h2 className="mt-2 text-2xl font-black text-white">Harbor Routes</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/decks" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white transition-colors hover:border-white/20">
                Crew Hangar
              </Link>
              <Link href="/collection" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white transition-colors hover:border-white/20">
                Collection
              </Link>
              <Link href="/players" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white transition-colors hover:border-white/20">
                Find Players
              </Link>
              <Link href="/account/settings" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white transition-colors hover:border-white/20">
                Settings
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

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
        <p className="text-sm text-[var(--color-text-mid)]">Loading your captain profile...</p>
      </section>
    </div>
  );
}

function SignedOutState() {
  return (
    <div className="mx-auto max-w-6xl pb-16">
      <section className="journal-surface rounded-[2rem] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.3)] bg-[rgba(212,160,84,0.12)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Account access
        </div>
        <h1 className="mt-5 text-3xl font-black text-[var(--color-navy)]">Sign in to view your captain profile</h1>
        <p className="mt-2 text-sm text-[var(--color-text-mid)]">Your profile page lives here, even when your public handle is private.</p>
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
        <p className="text-sm text-[var(--color-sunset)]">{message}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/account/settings"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-4 text-sm font-bold text-[var(--color-text-mid)] hover:text-[var(--color-navy)]"
          >
            Account Settings
          </Link>
          <Link
            href="/decks"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.34)] bg-[rgba(212,160,84,0.12)] px-4 text-sm font-bold text-[var(--color-gold-dark)]"
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
      <section className="profile-ledger-surface relative rounded-[2rem] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,160,84,0.14),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(45,106,143,0.08),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(0deg,transparent_24%,rgba(212,160,84,0.58)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(212,160,84,0.32)_25%,transparent_26%)] [background-size:26px_26px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <ProfileAvatar avatarKey={profile.avatarKey} displayName={profile.displayName} size="xl" />
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.3)] bg-[rgba(212,160,84,0.12)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
                <ScrollText className="h-3.5 w-3.5" /> Your captain profile
              </div>
              <h1 className="mt-4 text-4xl font-black text-[var(--color-navy)]">{profile.displayName}</h1>
              <p className="mt-1 text-lg text-[var(--color-text-light)]">@{profile.username || "claim-your-handle"}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-mid)]">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--color-text-mid)]">
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
              <div className="inline-flex items-center gap-3 rounded-xl border border-[rgba(212,160,84,0.2)] bg-[rgba(255,249,235,0.72)] px-4 py-3 text-sm text-[var(--color-text-mid)]">
                <span>{followerCount} followers</span>
                <span>{followingCount} following</span>
              </div>
            )}
            <OwnerProfileTools targetUserId={profile.userId} />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/account/settings"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-4 text-sm font-bold text-[var(--color-text-mid)] transition-colors hover:text-[var(--color-navy)]"
              >
                Account Settings
              </Link>
              {publicProfileHref ? (
                <Link
                  href={publicProfileHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.34)] bg-[rgba(212,160,84,0.12)] px-4 text-sm font-bold text-[var(--color-gold-dark)]"
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
        <div className="profile-ledger-surface rounded-[2rem] p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Captain&apos;s Log</h2>
            </div>
          </div>
          <div className="mt-5">
            <ActivityFeed activities={activities} emptyMessage="Start building decks or adding cards to fill your captain's log." />
          </div>
        </div>

        <div className="space-y-6">
          <section className="profile-ledger-surface rounded-[2rem] p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Social Circle</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Crew Manifest</h2>
              </div>
              <Crown className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">Followers</p>
                <div className="mt-3 space-y-3">
                  {followers.length ? followers.map((row) => (
                    <div key={`follower-${row.userId}`} className="profile-soft-tile flex items-center gap-3 rounded-2xl p-3">
                      <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--color-navy)]">{row.displayName}</p>
                        <p className="text-xs text-[var(--color-text-light)]">@{row.username || "pirate"}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-[var(--color-text-light)]">No followers yet.</p>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-light)]">Following</p>
                <div className="mt-3 space-y-3">
                  {following.length ? following.map((row) => (
                    <div key={`following-${row.userId}`} className="profile-soft-tile flex items-center gap-3 rounded-2xl p-3">
                      <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[var(--color-navy)]">{row.displayName}</p>
                        <p className="text-xs text-[var(--color-text-light)]">@{row.username || "pirate"}</p>
                      </div>
                    </div>
                  )) : <p className="text-sm text-[var(--color-text-light)]">You are not following anyone yet.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="profile-ledger-surface rounded-[2rem] p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Quick Links</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Harbor Routes</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/decks" className="profile-soft-tile rounded-2xl p-4 text-sm font-bold text-[var(--color-navy)]">
                Crew Hangar
              </Link>
              <Link href="/collection" className="profile-soft-tile rounded-2xl p-4 text-sm font-bold text-[var(--color-navy)]">
                Collection
              </Link>
              <Link href="/players" className="profile-soft-tile rounded-2xl p-4 text-sm font-bold text-[var(--color-navy)]">
                Find Players
              </Link>
              <Link href="/account/settings" className="profile-soft-tile rounded-2xl p-4 text-sm font-bold text-[var(--color-navy)]">
                Settings
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

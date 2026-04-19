import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass, Crown, Lock, ScrollText, Swords } from "lucide-react";
import ActivityFeed from "@/components/profile/ActivityFeed";
import BadgeBoard from "@/components/profile/BadgeBoard";
import CollectionCompareButton from "@/components/profile/CollectionCompareButton";
import FeaturedDecks from "@/components/profile/FeaturedDecks";
import OwnerProfileTools from "@/components/profile/OwnerProfileTools";
import PublicDeckArchive from "@/components/profile/PublicDeckArchive";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileStatCards from "@/components/profile/ProfileStatCards";
import PublicProfileActions from "@/components/profile/PublicProfileActions";
import {
  getFollowCountsSupabase,
  getUserProfileByUsernameSupabase,
  getUserProfileSummarySupabase,
  listFeaturedProfileDecksSupabase,
  listPublicProfileDecksSupabase,
  listFollowersSupabase,
  listFollowingSupabase,
  listUserProfileActivitiesSupabase,
} from "@/lib/profile-store";
import { getOfficialCardById } from "@/lib/official-cards";
import { deriveProfileBadges } from "@/lib/profile-types";

type RouteCtx = {
  params: Promise<{
    username: string;
  }>;
};

async function loadProfile(username: string) {
  const profile = await getUserProfileByUsernameSupabase(username);
  if (!profile) return null;

  const summary = await getUserProfileSummarySupabase(profile.userId);
  const counts = await getFollowCountsSupabase(profile.userId);
  const activities = profile.showActivity
    ? await listUserProfileActivitiesSupabase(profile.userId, { limit: 20, publicOnly: true })
    : [];
  const followers = await listFollowersSupabase(profile.userId, 12);
  const following = await listFollowingSupabase(profile.userId, 12);
  const featuredDecks = await listFeaturedProfileDecksSupabase(profile.userId);
  const publicDecks = await listPublicProfileDecksSupabase(profile.userId);
  const favoriteLeader = profile.favoriteLeaderId ? getOfficialCardById(profile.favoriteLeaderId) : null;

  return {
    profile,
    summary,
    activities,
    featuredDecks,
    publicDecks,
    followers,
    following,
    favoriteLeader,
    badges: summary ? deriveProfileBadges(summary) : [],
    ...counts,
  };
}

export async function generateMetadata({ params }: RouteCtx): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const data = await loadProfile(String(rawUsername || "").trim().toLowerCase());

  if (!data) {
    return {
      title: "User Profile — DevilFruit TCG",
    };
  }

  const title = `${data.profile.displayName} — DevilFruit TCG`;
  const description = data.profile.bio
    ? data.profile.bio
    : `${data.summary?.uniqueCardsOwned || 0} cards collected · ${data.summary?.totalDecksBuilt || 0} decks built on DevilFruit TCG.`;
  const image = data.favoriteLeader?.id ? `/api/card-image?id=${encodeURIComponent(data.favoriteLeader.id)}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function UserProfilePage({ params }: RouteCtx) {
  const { username: rawUsername } = await params;
  const data = await loadProfile(String(rawUsername || "").trim().toLowerCase());

  if (!data) notFound();

  const { profile, summary, activities, featuredDecks, publicDecks, followers, following, favoriteLeader, badges, followerCount, followingCount } = data;

  if (profile.profileVisibility === "private") {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        <section className="journal-surface rounded-[2rem] p-8 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(212,160,84,0.24)] bg-[rgba(212,160,84,0.1)]">
            <Lock className="h-6 w-6 text-[var(--color-gold-dark)]" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-[var(--color-navy)]">This profile is private</h1>
          <p className="mt-2 text-[var(--color-text-mid)]">The captain has hidden their profile from public view.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <section className="profile-ledger-surface relative rounded-[2rem] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,160,84,0.14),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(45,106,143,0.08),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(0deg,transparent_24%,rgba(212,160,84,0.58)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(212,160,84,0.32)_25%,transparent_26%)] [background-size:26px_26px]" />
        <div className="pointer-events-none absolute right-6 top-6 h-32 w-32 rounded-full border border-[rgba(212,160,84,0.18)] opacity-40" />
        <div className="pointer-events-none absolute right-14 top-14 h-16 w-16 rounded-full border border-[rgba(212,160,84,0.18)] opacity-35" />
        <div className="pointer-events-none absolute left-8 bottom-8 h-28 w-28 rounded-full border border-[rgba(212,160,84,0.14)] opacity-30" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <ProfileAvatar avatarKey={profile.avatarKey} displayName={profile.displayName} size="xl" />
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.3)] bg-[rgba(212,160,84,0.12)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">
                <ScrollText className="h-3.5 w-3.5" /> Captain&apos;s profile
              </div>
              <h1 className="mt-4 text-4xl font-black text-[var(--color-navy)]">{profile.displayName}</h1>
              <p className="mt-1 text-lg text-[var(--color-text-light)]">@{profile.username}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-mid)]">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--color-text-mid)]">
                <span>Member since {new Date(profile.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                {favoriteLeader ? <span>Favorite leader: {favoriteLeader.name}</span> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <PublicProfileActions
              username={profile.username || ""}
              targetUserId={profile.userId}
              initialFollowerCount={followerCount}
              initialFollowingCount={followingCount}
              initialIsFollowing={false}
              allowFollow={Boolean(profile.username)}
            />
            <OwnerProfileTools targetUserId={profile.userId} />
            {favoriteLeader ? (
              <div className="profile-paper-card flex items-center gap-3 rounded-2xl p-3">
                <img
                  src={`/api/card-image?id=${encodeURIComponent(favoriteLeader.id)}`}
                  alt={favoriteLeader.name}
                  className="h-20 w-14 rounded-xl border border-[rgba(212,160,84,0.22)] object-cover"
                />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Favorite Leader</p>
                  <p className="mt-1 text-sm font-black text-[var(--color-navy)]">{favoriteLeader.name}</p>
                  <p className="text-xs text-[var(--color-text-light)]">{favoriteLeader.id} · {favoriteLeader.color}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <ProfileStatCards summary={summary} followerCount={followerCount} />

      <FeaturedDecks decks={featuredDecks} targetUserId={profile.userId} />

      <PublicDeckArchive decks={publicDecks} targetUserId={profile.userId} />

      <BadgeBoard badges={badges} />

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="profile-ledger-surface relative rounded-[2rem] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_center,rgba(248,212,121,0.9)_1px,transparent_1.4px)] [background-size:18px_18px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Quartermaster Notes</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Captain Snapshot</h2>
              </div>
              {summary?.mostUsedLeader ? (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Most Used Leader</p>
                  <p className="mt-1 text-sm font-black text-[var(--color-navy)]">{summary.mostUsedLeader.name}</p>
                </div>
              ) : null}
            </div>

            <div className="relative mt-5 grid gap-4 md:grid-cols-2">
              <div className="profile-paper-card rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Favorite Colors</p>
                <p className="mt-2 text-sm font-black text-[var(--color-navy)]">
                  {summary?.favoriteColors?.length ? summary.favoriteColors.join(" · ") : "Still charting"}
                </p>
              </div>
              <div className="profile-paper-card rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Crew Reach</p>
                <p className="mt-2 text-sm font-black text-[var(--color-navy)]">{followerCount} followers · {followingCount} following</p>
                <p className="mt-1 text-sm text-[var(--color-text-mid)]">Reputation from the Grand Line social log.</p>
              </div>
            </div>

            <div className="relative mt-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Top Valuable Cards</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {summary?.topValuableCards?.length ? summary.topValuableCards.map((card) => (
                  <div key={card.cardId} className="profile-paper-card rounded-2xl p-3">
                    <img
                      src={card.imageUrl || `/api/card-image?id=${encodeURIComponent(card.cardId)}`}
                      alt={card.name}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 text-sm font-black text-[var(--color-navy)]">{card.name}</p>
                    <p className="text-xs text-[var(--color-text-light)]">{card.cardId}</p>
                    <p className="mt-1 text-sm font-black text-[var(--theme-accent-2)]">${card.price.toFixed(2)}</p>
                  </div>
                )) : <p className="text-sm text-[var(--color-text-light)]">No collection highlights synced yet.</p>}
              </div>
            </div>
          </div>

          <div className="profile-ledger-surface relative rounded-[2rem] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(45deg,rgba(248,212,121,0.8)_1px,transparent_1px),linear-gradient(-45deg,rgba(248,212,121,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Voyage Timeline</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Captain&apos;s Log</h2>
              </div>
              <Swords className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="relative mt-5">
              <ActivityFeed activities={activities} emptyMessage="No public activity yet." />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="profile-ledger-surface relative rounded-[2rem] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_center,rgba(248,212,121,0.9)_1px,transparent_1.4px)] [background-size:18px_18px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Social Signals</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Crew Manifest</h2>
              </div>
              <Crown className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="relative mt-5">
              <CollectionCompareButton username={profile.username || ""} />
            </div>
            <div className="relative mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-black text-[var(--color-navy)]">Followers</p>
                {followers.length ? followers.map((row) => (
                  <Link key={`follower-${row.userId}`} href={row.username ? `/user/${row.username}` : "#"} className="profile-soft-tile flex items-center gap-3 rounded-2xl p-3">
                    <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-navy)]">{row.displayName}</p>
                      <p className="text-xs text-[var(--color-text-light)]">@{row.username || "pirate"}</p>
                    </div>
                  </Link>
                )) : <p className="text-sm text-[var(--color-text-light)]">No followers yet.</p>}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-black text-[var(--color-navy)]">Following</p>
                {following.length ? following.map((row) => (
                  <Link key={`following-${row.userId}`} href={row.username ? `/user/${row.username}` : "#"} className="profile-soft-tile flex items-center gap-3 rounded-2xl p-3">
                    <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-navy)]">{row.displayName}</p>
                      <p className="text-xs text-[var(--color-text-light)]">@{row.username || "pirate"}</p>
                    </div>
                  </Link>
                )) : <p className="text-sm text-[var(--color-text-light)]">Not following anyone yet.</p>}
              </div>
            </div>
          </div>

          <div className="profile-ledger-surface relative rounded-[2rem] p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(0deg,transparent_24%,rgba(248,212,121,0.8)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(248,212,121,0.35)_25%,transparent_26%)] [background-size:20px_20px]" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-gold-dark)]">Route Planner</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--color-navy)]">Harbor Routes</h2>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-mid)]">Open your collection, manage decks, or scout more captains from the community roster.</p>
            <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
              <Link href="/collection" className="profile-soft-tile rounded-2xl p-4">
                <p className="text-sm font-black text-[var(--color-navy)]">Collection</p>
                <p className="mt-1 text-sm text-[var(--color-text-mid)]">Browse cards and track holdings.</p>
              </Link>
              <Link href="/decks" className="profile-soft-tile rounded-2xl p-4">
                <p className="text-sm font-black text-[var(--color-navy)]">Crew Hangar</p>
                <p className="mt-1 text-sm text-[var(--color-text-mid)]">Open saved decks and Deck Lab.</p>
              </Link>
              <Link href="/players" className="profile-soft-tile rounded-2xl p-4">
                <p className="text-sm font-black text-[var(--color-navy)]">Players Directory</p>
                <p className="mt-1 text-sm text-[var(--color-text-mid)]">Find more public captains.</p>
              </Link>
            </div>
            <Link
              href="/players"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.28)] bg-[rgba(212,160,84,0.1)] px-4 text-sm font-bold text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.16)]"
            >
              <Compass className="h-4 w-4" />
              Open Players Directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

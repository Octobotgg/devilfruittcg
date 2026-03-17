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
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
            <Lock className="h-6 w-6 text-white/70" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-white">This profile is private</h1>
          <p className="mt-2 text-white/60">The captain has hidden their profile from public view.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <section className="journal-surface relative overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,175,55,0.15),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(59,130,246,0.12),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(0deg,transparent_24%,rgba(248,212,121,0.8)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(248,212,121,0.45)_25%,transparent_26%)] [background-size:26px_26px]" />
        <div className="pointer-events-none absolute right-6 top-6 h-32 w-32 rounded-full border border-white/8 opacity-20" />
        <div className="pointer-events-none absolute right-14 top-14 h-16 w-16 rounded-full border border-white/8 opacity-20" />
        <div className="pointer-events-none absolute left-8 bottom-8 h-28 w-28 rounded-full border border-white/8 opacity-10" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <ProfileAvatar avatarKey={profile.avatarKey} displayName={profile.displayName} size="xl" />
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
                <ScrollText className="h-3.5 w-3.5" /> Captain&apos;s profile
              </div>
              <h1 className="mt-4 text-4xl font-black text-white">{profile.displayName}</h1>
              <p className="mt-1 text-lg text-white/50">@{profile.username}</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65">{profile.bio || "No bio added yet."}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/55">
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
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <img
                  src={`/api/card-image?id=${encodeURIComponent(favoriteLeader.id)}`}
                  alt={favoriteLeader.name}
                  className="h-20 w-14 rounded-xl border border-white/10 object-cover"
                />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Favorite Leader</p>
                  <p className="mt-1 text-sm font-black text-white">{favoriteLeader.name}</p>
                  <p className="text-xs text-white/50">{favoriteLeader.id} · {favoriteLeader.color}</p>
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
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_center,rgba(248,212,121,0.9)_1px,transparent_1.4px)] [background-size:18px_18px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Quartermaster Notes</p>
                <h2 className="mt-2 text-2xl font-black text-white">Captain Snapshot</h2>
              </div>
              {summary?.mostUsedLeader ? (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Most Used Leader</p>
                  <p className="mt-1 text-sm font-black text-white">{summary.mostUsedLeader.name}</p>
                </div>
              ) : null}
            </div>

            <div className="relative mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Favorite Colors</p>
                <p className="mt-2 text-sm font-black text-white">
                  {summary?.favoriteColors?.length ? summary.favoriteColors.join(" · ") : "Still charting"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Crew Reach</p>
                <p className="mt-2 text-sm font-black text-white">{followerCount} followers · {followingCount} following</p>
                <p className="mt-1 text-sm text-white/55">Reputation from the Grand Line social log.</p>
              </div>
            </div>

            <div className="relative mt-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Top Valuable Cards</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {summary?.topValuableCards?.length ? summary.topValuableCards.map((card) => (
                  <div key={card.cardId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <img
                      src={card.imageUrl || `/api/card-image?id=${encodeURIComponent(card.cardId)}`}
                      alt={card.name}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 text-sm font-black text-white">{card.name}</p>
                    <p className="text-xs text-white/50">{card.cardId}</p>
                    <p className="mt-1 text-sm font-black text-[var(--theme-accent-2)]">${card.price.toFixed(2)}</p>
                  </div>
                )) : <p className="text-sm text-white/45">No collection highlights synced yet.</p>}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(45deg,rgba(248,212,121,0.8)_1px,transparent_1px),linear-gradient(-45deg,rgba(248,212,121,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Voyage Timeline</p>
                <h2 className="mt-2 text-2xl font-black text-white">Captain&apos;s Log</h2>
              </div>
              <Swords className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="relative mt-5">
              <ActivityFeed activities={activities} emptyMessage="No public activity yet." />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_center,rgba(248,212,121,0.9)_1px,transparent_1.4px)] [background-size:18px_18px]" />
            <div className="flex items-end justify-between gap-3">
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Social Signals</p>
                <h2 className="mt-2 text-2xl font-black text-white">Crew Manifest</h2>
              </div>
              <Crown className="h-5 w-5 text-[var(--theme-accent-2)]" />
            </div>
            <div className="relative mt-5">
              <CollectionCompareButton username={profile.username || ""} />
            </div>
            <div className="relative mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-black text-white">Followers</p>
                {followers.length ? followers.map((row) => (
                  <Link key={`follower-${row.userId}`} href={row.username ? `/user/${row.username}` : "#"} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{row.displayName}</p>
                      <p className="text-xs text-white/45">@{row.username || "pirate"}</p>
                    </div>
                  </Link>
                )) : <p className="text-sm text-white/45">No followers yet.</p>}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-black text-white">Following</p>
                {following.length ? following.map((row) => (
                  <Link key={`following-${row.userId}`} href={row.username ? `/user/${row.username}` : "#"} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <ProfileAvatar avatarKey={row.avatarKey} displayName={row.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{row.displayName}</p>
                      <p className="text-xs text-white/45">@{row.username || "pirate"}</p>
                    </div>
                  </Link>
                )) : <p className="text-sm text-white/45">Not following anyone yet.</p>}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(0deg,transparent_24%,rgba(248,212,121,0.8)_25%,transparent_26%),linear-gradient(90deg,transparent_24%,rgba(248,212,121,0.35)_25%,transparent_26%)] [background-size:20px_20px]" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Route Planner</p>
              <h2 className="mt-2 text-2xl font-black text-white">Harbor Routes</h2>
            </div>
            <p className="mt-3 text-sm text-white/60">Open your collection, manage decks, or scout more captains from the community roster.</p>
            <div className="relative mt-5 grid gap-4 sm:grid-cols-3">
              <Link href="/collection" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                <p className="text-sm font-black text-white">Collection</p>
                <p className="mt-1 text-sm text-white/55">Browse cards and track holdings.</p>
              </Link>
              <Link href="/decks" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                <p className="text-sm font-black text-white">Crew Hangar</p>
                <p className="mt-1 text-sm text-white/55">Open saved decks and Deck Lab.</p>
              </Link>
              <Link href="/players" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                <p className="text-sm font-black text-white">Players Directory</p>
                <p className="mt-1 text-sm text-white/55">Find more public captains.</p>
              </Link>
            </div>
            <Link
              href="/players"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 transition-colors hover:border-[rgba(212,175,55,0.28)] hover:text-white"
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

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import BrandMark from "@/components/BrandMark";
import { fetchWithClientAuth } from "@/lib/client-auth";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/cloud/supabase";
import { AVATAR_PRESETS, sanitizeUsernameCandidate, validateUsername } from "@/lib/profile-config";
import { buildProfileSummary } from "@/lib/profile-summary";
import type { Card } from "@/lib/cards";
import type { CloudUser, Collection, Deck } from "@/lib/cloud/types";
import type { ProfileActivity, ProfileBadge, ProfileSummary, UserProfileRecord } from "@/lib/profile-types";

type LeaderOption = {
  id: string;
  name: string;
  setCode: string;
  color: string;
};

type WatchlistItem = {
  watchId: string;
  cardId: string;
};

type PriceEntry = {
  cardId: string;
  marketPrice: number | null;
  estimatedPrice: number;
};

type FollowRow = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarKey: string;
};

type AccountPayload = {
  profile: UserProfileRecord;
  summary: ProfileSummary | null;
  badges: ProfileBadge[];
  followerCount: number;
  followingCount: number;
  followers: FollowRow[];
  following: FollowRow[];
  activities: ProfileActivity[];
};

type Notice = {
  tone: "error" | "success";
  message: string;
};

type PersistedProfileSettings = {
  displayName: string;
  username: string | null;
  avatarKey: string;
  bio: string;
  favoriteLeaderId: string | null;
  profileVisibility: UserProfileRecord["profileVisibility"];
  showActivity: boolean;
  notificationPreferences: UserProfileRecord["notificationPreferences"];
  updatedAt: string;
};

const PROFILE_METADATA_KEY = "devilfruit_profile";
const PROFILE_LOCAL_STORAGE_PREFIX = "devilfruit_profile_settings:";

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function noticeClass(tone: Notice["tone"]) {
  return tone === "error"
    ? "rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
    : "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200";
}

function profileStorageKey(userId: string) {
  return `${PROFILE_LOCAL_STORAGE_PREFIX}${userId}`;
}

function defaultDisplayName(user: CloudUser | null) {
  const fullName = String(user?.fullName || "").trim();
  if (fullName) return fullName;
  const email = String(user?.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "Pirate";
}

function normalizePersistedProfileSettings(input: unknown): PersistedProfileSettings | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;

  return {
    displayName: String(value.displayName || "").trim(),
    username: value.username ? sanitizeUsernameCandidate(String(value.username)) : null,
    avatarKey: String(value.avatarKey || AVATAR_PRESETS[0].id).trim() || AVATAR_PRESETS[0].id,
    bio: String(value.bio || "").slice(0, 280),
    favoriteLeaderId: value.favoriteLeaderId ? String(value.favoriteLeaderId).trim().toUpperCase() : null,
    profileVisibility: value.profileVisibility === "private" ? "private" : "public",
    showActivity: value.showActivity !== false,
    notificationPreferences: {
      priceAlerts: Boolean((value.notificationPreferences as Record<string, unknown> | undefined)?.priceAlerts),
      newSetReleases: Boolean((value.notificationPreferences as Record<string, unknown> | undefined)?.newSetReleases),
      followerActivity: Boolean((value.notificationPreferences as Record<string, unknown> | undefined)?.followerActivity),
    },
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt.trim() ? value.updatedAt : new Date().toISOString(),
  };
}

function buildPersistedProfileSettings(
  user: CloudUser | null,
  form: {
    displayName: string;
    username: string;
    avatarKey: string;
    bio: string;
    favoriteLeaderId: string;
    profileVisibility: UserProfileRecord["profileVisibility"];
    showActivity: boolean;
    priceAlerts: boolean;
    newSetReleases: boolean;
    followerActivity: boolean;
  },
): PersistedProfileSettings {
  return {
    displayName: form.displayName.trim() || defaultDisplayName(user),
    username: form.username ? sanitizeUsernameCandidate(form.username) : null,
    avatarKey: form.avatarKey || AVATAR_PRESETS[0].id,
    bio: form.bio.slice(0, 280),
    favoriteLeaderId: form.favoriteLeaderId ? form.favoriteLeaderId.trim().toUpperCase() : null,
    profileVisibility: form.profileVisibility,
    showActivity: form.showActivity,
    notificationPreferences: {
      priceAlerts: form.priceAlerts,
      newSetReleases: form.newSetReleases,
      followerActivity: form.followerActivity,
    },
    updatedAt: new Date().toISOString(),
  };
}

function buildProfileFromPersisted(user: CloudUser | null, persisted: PersistedProfileSettings | null): UserProfileRecord {
  const nowIso = new Date().toISOString();
  return {
    userId: user?.id || "",
    email: user?.email || null,
    displayName: persisted?.displayName || defaultDisplayName(user),
    username: persisted?.username || null,
    avatarKey: persisted?.avatarKey || AVATAR_PRESETS[0].id,
    bio: persisted?.bio || "",
    favoriteLeaderId: persisted?.favoriteLeaderId || null,
    profileVisibility: persisted?.profileVisibility || "public",
    showActivity: persisted?.showActivity ?? true,
    featuredDeckIds: [],
    memberSince: nowIso,
    updatedAt: persisted?.updatedAt || nowIso,
    notificationPreferences: persisted?.notificationPreferences || {
      priceAlerts: false,
      newSetReleases: false,
      followerActivity: false,
    },
  };
}

function mergeProfileWithPersisted(base: UserProfileRecord, persisted: PersistedProfileSettings | null): UserProfileRecord {
  if (!persisted) return base;
  return {
    ...base,
    displayName: persisted.displayName || base.displayName,
    username: persisted.username ?? base.username,
    avatarKey: persisted.avatarKey || base.avatarKey,
    bio: persisted.bio,
    favoriteLeaderId: persisted.favoriteLeaderId ?? base.favoriteLeaderId,
    profileVisibility: persisted.profileVisibility,
    showActivity: persisted.showActivity,
    featuredDeckIds: base.featuredDeckIds || [],
    updatedAt: persisted.updatedAt || base.updatedAt,
    notificationPreferences: {
      ...base.notificationPreferences,
      ...persisted.notificationPreferences,
    },
  };
}

function profileToForm(profile: UserProfileRecord) {
  return {
    displayName: profile.displayName,
    username: profile.username || "",
    avatarKey: profile.avatarKey,
    bio: profile.bio,
    favoriteLeaderId: profile.favoriteLeaderId || "",
    profileVisibility: profile.profileVisibility,
    showActivity: profile.showActivity,
    priceAlerts: profile.notificationPreferences.priceAlerts,
    newSetReleases: profile.notificationPreferences.newSetReleases,
    followerActivity: profile.notificationPreferences.followerActivity,
  };
}

async function loadPersistedProfileSettings(userId: string): Promise<PersistedProfileSettings | null> {
  let localPersisted: PersistedProfileSettings | null = null;

  if (typeof window !== "undefined") {
    try {
      localPersisted = normalizePersistedProfileSettings(
        JSON.parse(window.localStorage.getItem(profileStorageKey(userId)) || "null"),
      );
    } catch {
      localPersisted = null;
    }
  }

  if (!hasSupabaseConfig()) {
    return localPersisted;
  }

  try {
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error) return localPersisted;
    const metadataPersisted = normalizePersistedProfileSettings(data.user?.user_metadata?.[PROFILE_METADATA_KEY]);
    if (metadataPersisted && typeof window !== "undefined") {
      window.localStorage.setItem(profileStorageKey(userId), JSON.stringify(metadataPersisted));
    }
    return metadataPersisted || localPersisted;
  } catch {
    return localPersisted;
  }
}

async function persistProfileSettings(userId: string, payload: PersistedProfileSettings) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(profileStorageKey(userId), JSON.stringify(payload));
  }

  if (!hasSupabaseConfig()) return;

  try {
    const { data } = await getSupabaseClient().auth.getUser();
    const nextMetadata =
      data.user?.user_metadata && typeof data.user.user_metadata === "object"
        ? { ...data.user.user_metadata, [PROFILE_METADATA_KEY]: payload }
        : { [PROFILE_METADATA_KEY]: payload };
    await getSupabaseClient().auth.updateUser({ data: nextMetadata });
  } catch {
    // local persisted copy still keeps the private account page stable
  }
}

function PasswordField({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (next: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 pr-12 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-white/45 hover:text-white"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    ready,
    signOut,
    updatePassword,
    hasCloud,
    loadDecks,
    loadCollection,
  } = useCloudSync();

  const [, setAccountData] = useState<AccountPayload | null>(null);
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [liveSummary, setLiveSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    username: "",
    avatarKey: AVATAR_PRESETS[0].id,
    bio: "",
    favoriteLeaderId: "",
    profileVisibility: "public" as UserProfileRecord["profileVisibility"],
    showActivity: true,
    priceAlerts: false,
    newSetReleases: false,
    followerActivity: false,
  });
  const [emailValue, setEmailValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const usernameSuggestion = useMemo(() => sanitizeUsernameCandidate(user?.fullName || user?.email || "pirate"), [user]);
  const ownProfileHref = "/account/profile";
  const publicProfileHref = profileForm.username ? `/user/${profileForm.username}` : null;

  useEffect(() => {
    if (!user || !hasCloud) return;
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      fetchWithClientAuth("/api/me/profile", { cache: "no-store" })
        .then(async (res) => (res.ok ? await res.json() : null))
        .catch(() => null),
      fetch("/api/leaders", { cache: "no-store" }).then((res) => res.json()),
      loadPersistedProfileSettings(user.id),
    ])
      .then(async ([profileJson, leaderJson, persistedProfile]) => {
        if (cancelled) return;

        const apiPayload = profileJson as AccountPayload | null;
        const fallbackProfile = buildProfileFromPersisted(user, persistedProfile);
        const nextProfile = mergeProfileWithPersisted(apiPayload?.profile || fallbackProfile, persistedProfile);

        setAccountData(
          apiPayload
            ? { ...apiPayload, profile: nextProfile }
            : {
                profile: nextProfile,
                summary: null,
                badges: [],
                followerCount: 0,
                followingCount: 0,
                followers: [],
                following: [],
                activities: [],
              },
        );
        setLeaders(Array.isArray(leaderJson.leaders) ? (leaderJson.leaders as LeaderOption[]) : []);

        setProfileForm(profileToForm(nextProfile));
        setEmailValue(nextProfile.email || "");

        const [decks, collection, watchlistJson, catalogJson] = await Promise.all([
          loadDecks(),
          loadCollection(),
          fetchWithClientAuth("/api/me/watchlist", { cache: "no-store" }).then((res) => (res.ok ? res.json() : { items: [] })),
          fetch("/api/cards?pageSize=5000", { cache: "no-store" }).then((res) => res.json()),
        ]);

        if (cancelled) return;

        const watchlistItems = Array.isArray(watchlistJson.items) ? (watchlistJson.items as WatchlistItem[]) : [];
        const cards = Array.isArray(catalogJson.results) ? (catalogJson.results as Card[]) : [];
        const collectionIds = Object.keys(collection);
        const priceMap = new Map<string, PriceEntry>();

        for (const group of chunk(collectionIds, 120)) {
          const priceJson = await fetch(`/api/cards/prices?ids=${encodeURIComponent(group.join(","))}`, { cache: "no-store" }).then((res) => res.json());
          const results = Array.isArray(priceJson.results) ? (priceJson.results as PriceEntry[]) : [];
          results.forEach((entry) => priceMap.set(entry.cardId.toUpperCase(), entry));
        }

        if (cancelled) return;

        const computed = buildProfileSummary({
          collection: collection as Collection,
          decks: decks as Deck[],
          watchlistCount: watchlistItems.length,
          tradeCount: 0,
          cards,
          priceMap,
        });

        setLiveSummary(computed);
        void fetchWithClientAuth("/api/me/profile/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: computed }),
        }).catch(() => {
          // summary sync is best-effort and should not blank the account page
        });
      })
      .catch(() => {
        if (!cancelled) setNotice({ tone: "error", message: "We could not load your account profile." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasCloud, loadCollection, loadDecks, user]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const nextUsername = sanitizeUsernameCandidate(profileForm.username);

    if (nextUsername && !validateUsername(nextUsername)) {
      setNotice({ tone: "error", message: "Username must use lowercase letters, numbers, or underscores and be 3-20 characters long." });
      return;
    }

    setSavingProfile(true);
    setNotice(null);

    try {
      const persistedProfile = buildPersistedProfileSettings(user, {
        ...profileForm,
        username: nextUsername || "",
      });

      const localProfile = buildProfileFromPersisted(user, persistedProfile);
      let syncedProfile = localProfile;

      try {
        const res = await fetchWithClientAuth("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: persistedProfile.displayName,
            username: persistedProfile.username,
            avatarKey: persistedProfile.avatarKey,
            bio: persistedProfile.bio,
            favoriteLeaderId: persistedProfile.favoriteLeaderId,
            profileVisibility: persistedProfile.profileVisibility,
            showActivity: persistedProfile.showActivity,
            notificationPreferences: persistedProfile.notificationPreferences,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          const message = String(json?.error || "Could not save profile settings.");
          if (res.status >= 400 && res.status < 500) {
            throw new Error(message);
          }
        }
        if (res.ok && json?.profile) {
          syncedProfile = mergeProfileWithPersisted(json.profile as UserProfileRecord, persistedProfile);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          /(username|taken|required|invalid|letters|numbers|underscores)/i.test(error.message)
        ) {
          throw error;
        }
        // allow private persistence to continue even if the public cache sync is unavailable
      }

      await persistProfileSettings(user.id, persistedProfile);

      setAccountData((current) =>
        current
          ? { ...current, profile: syncedProfile }
          : {
              profile: syncedProfile,
              summary: null,
              badges: [],
              followerCount: 0,
              followingCount: 0,
              followers: [],
              following: [],
              activities: [],
            },
      );
      setNotice({ tone: "success", message: "Profile settings saved." });
      setProfileForm(profileToForm(syncedProfile));
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not save profile settings." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleEmailSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseConfig()) {
      setNotice({ tone: "error", message: "Email changes are only available with Supabase auth." });
      return;
    }

    setEmailSaving(true);
    setNotice(null);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ email: emailValue.trim() });
      if (error) throw error;
      setNotice({ tone: "success", message: "Email change requested. Check your inbox to confirm the new address." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not update email." });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setNotice({ tone: "error", message: "Use at least 8 characters for the password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ tone: "error", message: "Password and confirmation do not match." });
      return;
    }

    setPasswordSaving(true);
    setNotice(null);
    try {
      await updatePassword({ password: newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ tone: "success", message: "Password updated." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not update password." });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleExportData() {
    if (!user) return;
    setExporting(true);
    setNotice(null);

    try {
      const [decks, collection, watchlistJson, profileJson] = await Promise.all([
        loadDecks(),
        loadCollection(),
        fetchWithClientAuth("/api/me/watchlist", { cache: "no-store" }).then((res) => res.json()),
        fetchWithClientAuth("/api/me/profile", { cache: "no-store" }).then((res) => res.json()),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        profile: profileJson.profile,
        summary: liveSummary || profileJson.summary,
        decks,
        collection,
        watchlist: profileJson.watchlist || watchlistJson.items || [],
        activities: profileJson.activities || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "devilfruittcg-account-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({ tone: "error", message: "Could not export account data." });
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setNotice({ tone: "error", message: 'Type "DELETE" to confirm account deletion.' });
      return;
    }

    setDeleting(true);
    setNotice(null);
    try {
      const res = await fetchWithClientAuth("/api/me/account", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(String(json?.error || "Could not delete account."));

      await signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not delete account." });
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setNotice(null);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Could not sign out." });
      setSigningOut(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-24 text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking account session...
      </div>
    );
  }

  if (!hasCloud || !user) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        <section className="journal-surface rounded-[2rem] p-6 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
            <ShieldCheck className="h-3.5 w-3.5" /> Account center
          </div>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <BrandMark compact subtitle="YOUR SAVED DEVILFRUITTCG TOOLS" />
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-lg font-black text-white">{hasCloud ? "You're not signed in" : "Accounts are not configured here yet"}</p>
            <p className="mt-2 text-sm text-white/60">
              {hasCloud ? "Sign in to manage your public profile, saved data, and account settings." : "This environment does not have account auth enabled yet."}
            </p>
            {hasCloud ? (
              <Link href="/login" className="luxury-action mt-4 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-[var(--obsidian-soft)]">
                Go to Login
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <section className="journal-surface rounded-[2rem] p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Private account
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <BrandMark compact subtitle="PROFILE, PRIVACY, AND CREW SETTINGS" />
          <div className="flex flex-wrap items-center gap-3">
            {publicProfileHref ? (
              <Link
                href={ownProfileHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-bold text-[var(--theme-accent-2)]"
              >
                View Profile
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={signingOut}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/75 transition-colors hover:text-white disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {signingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {notice ? <div className={`mt-5 ${noticeClass(notice.tone)}`}>{notice.message}</div> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="flex items-start gap-4">
              <ProfileAvatar avatarKey={profileForm.avatarKey} displayName={profileForm.displayName || user.fullName || user.email} size="xl" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Signed in as</p>
                <p className="mt-2 text-3xl font-black text-white">{profileForm.displayName || user.fullName || user.email || "Captain"}</p>
                <p className="mt-1 text-white/45">{user.email || "No email on record"}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={ownProfileHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-bold text-[var(--theme-accent-2)]"
                  >
                    View Profile
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {publicProfileHref ? (
                    <Link
                      href={publicProfileHref}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/75 hover:text-white"
                    >
                      Open Public URL
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="inline-flex min-h-11 items-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-bold text-amber-200">
                      Pick a username to activate your public profile
                    </div>
                  )}
                  <Link href="/players" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/75 hover:text-white">
                    Find Players
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <form id="profile-settings" onSubmit={handleProfileSave} className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Profile Settings</p>
                <h2 className="mt-2 text-2xl font-black text-white">Public Profile Setup</h2>
              </div>
              {savingProfile ? <Loader2 className="h-5 w-5 animate-spin text-white/45" /> : null}
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Display Name</span>
                <input
                  value={profileForm.displayName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Username</span>
                <input
                  value={profileForm.username}
                  onChange={(event) => setProfileForm((current) => ({ ...current, username: sanitizeUsernameCandidate(event.target.value) }))}
                  placeholder={usernameSuggestion || "captain_handle"}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                />
                <p className="mt-2 text-xs text-white/45">Used for your public URL: `devilfruittcg.gg/user/{profileForm.username || usernameSuggestion || "captain_handle"}`</p>
              </label>

              <div>
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Avatar</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setProfileForm((current) => ({ ...current, avatarKey: preset.id }))}
                      className={`rounded-2xl border p-3 text-left transition-colors ${
                        profileForm.avatarKey === preset.id ? "border-[var(--theme-accent-2)] bg-[var(--theme-accent)]/10" : "border-white/10 bg-black/20"
                      }`}
                    >
                      <ProfileAvatar avatarKey={preset.id} displayName={preset.label} size="md" />
                      <p className="mt-3 text-sm font-black text-white">{preset.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Bio</span>
                <textarea
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value.slice(0, 280) }))}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                />
                <p className="mt-2 text-xs text-white/45">{profileForm.bio.length}/280</p>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Favorite Leader</span>
                <select
                  value={profileForm.favoriteLeaderId}
                  onChange={(event) => setProfileForm((current) => ({ ...current, favoriteLeaderId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                >
                  <option value="">No favorite selected</option>
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} · {leader.id} · {leader.color}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Profile Visibility</span>
                  <select
                    value={profileForm.profileVisibility}
                    onChange={(event) => setProfileForm((current) => ({ ...current, profileVisibility: event.target.value as UserProfileRecord["profileVisibility"] }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Activity Feed</span>
                  <select
                    value={profileForm.showActivity ? "show" : "hide"}
                    onChange={(event) => setProfileForm((current) => ({ ...current, showActivity: event.target.value === "show" }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                  >
                    <option value="show">Show on public profile</option>
                    <option value="hide">Hide from public profile</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="luxury-action inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold text-[var(--obsidian-soft)] disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Profile Settings"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Account Settings</p>
          <h2 className="mt-2 text-2xl font-black text-white">Security & Access</h2>

          <form onSubmit={handleEmailSave} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Email</span>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <Mail className="h-4 w-4 text-white/45" />
                </div>
                <input
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--theme-accent-2)]"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={emailSaving}
              className="inline-flex min-h-11 items-center rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60"
            >
              {emailSaving ? "Saving..." : "Change Email"}
            </button>
          </form>

          <form onSubmit={handlePasswordSave} className="mt-8 space-y-4">
            <PasswordField
              id="new-password"
              label="New Password"
              value={newPassword}
              visible={showPassword}
              onChange={setNewPassword}
              onToggle={() => setShowPassword((current) => !current)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              visible={showConfirmPassword}
              onChange={setConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
            />
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex min-h-11 items-center rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60"
            >
              {passwordSaving ? "Saving..." : "Update Password"}
            </button>
          </form>

        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Notification Preferences</p>
          <h2 className="mt-2 text-2xl font-black text-white">Preferences</h2>
          <div className="mt-5 space-y-3">
            {[
              ["priceAlerts", "Price alerts"],
              ["newSetReleases", "New set releases"],
              ["followerActivity", "Follower activity"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(profileForm[key as keyof typeof profileForm])}
                  onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Data & Privacy</p>
          <h2 className="mt-2 text-2xl font-black text-white">Controls</h2>

          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={() => {
                void handleExportData();
              }}
              disabled={exporting}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export My Data
            </button>

            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-red-200">
                <Trash2 className="h-4 w-4" />
                <p className="text-sm font-black">Delete Account</p>
              </div>
              <p className="mt-2 text-sm text-red-100/80">
                This removes your saved profile data, follow graph, holdings, watchlist, and synced account records. Type DELETE to confirm.
              </p>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="DELETE"
                className="mt-3 w-full rounded-2xl border border-red-300/20 bg-black/25 px-4 py-3 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  void handleDeleteAccount();
                }}
                disabled={deleting}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300/20 bg-red-500/10 px-4 text-sm font-bold text-red-100 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
          Loading live collection and deck stats...
        </div>
      ) : null}
    </div>
  );
}

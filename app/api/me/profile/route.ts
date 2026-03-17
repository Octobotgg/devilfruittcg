import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/abuse-protection";
import {
  getFollowCountsSupabase,
  getUserProfileRecord,
  getUserProfileSummarySupabase,
  listFeaturedProfileDecksSupabase,
  listPublicProfileDecksSupabase,
  sanitizeFeaturedDeckIdsForUserSupabase,
  listFollowersSupabase,
  listFollowingSupabase,
  listUserProfileActivitiesSupabase,
  upsertUserProfileRecord,
  isUsernameInUse,
} from "@/lib/profile-store";
import { authErrorResponse, requireAuthenticatedSupabaseUser, requireAuthenticatedUser } from "@/lib/user-context";
import { DEFAULT_NOTIFICATION_PREFERENCES, type ProfileVisibility } from "@/lib/profile-types";
import { deriveProfileBadges } from "@/lib/profile-types";
import { sanitizeUsernameCandidate, validateUsername } from "@/lib/profile-config";

export const runtime = "nodejs";

const LEGACY_PROFILE_METADATA_KEY = "devilfruit_profile";

function extractLegacyProfileMetadata(userMetadata: Record<string, unknown>): {
  displayName?: string;
  username?: string | null;
  avatarKey?: string;
  bio?: string;
  favoriteLeaderId?: string;
  profileVisibility?: ProfileVisibility;
  showActivity?: boolean;
  featuredDeckIds?: string[];
  notificationPreferences?: typeof DEFAULT_NOTIFICATION_PREFERENCES;
} {
  const raw =
    userMetadata[LEGACY_PROFILE_METADATA_KEY] && typeof userMetadata[LEGACY_PROFILE_METADATA_KEY] === "object"
      ? (userMetadata[LEGACY_PROFILE_METADATA_KEY] as Record<string, unknown>)
      : {};

  return {
    displayName: raw.displayName ? String(raw.displayName).trim() : undefined,
    username: raw.username == null ? undefined : sanitizeUsernameCandidate(String(raw.username)),
    avatarKey: raw.avatarKey ? String(raw.avatarKey).trim() : undefined,
    bio: raw.bio ? String(raw.bio).slice(0, 280) : undefined,
    favoriteLeaderId: raw.favoriteLeaderId ? String(raw.favoriteLeaderId).trim().toUpperCase() : undefined,
    profileVisibility:
      raw.profileVisibility === "private"
        ? ("private" satisfies ProfileVisibility)
        : raw.profileVisibility === "public"
          ? ("public" satisfies ProfileVisibility)
          : undefined,
    showActivity: raw.showActivity === undefined ? undefined : raw.showActivity !== false,
    featuredDeckIds: Array.isArray(raw.featuredDeckIds)
      ? raw.featuredDeckIds.map((deckId) => String(deckId || "").trim()).filter(Boolean)
      : undefined,
    notificationPreferences:
      raw.notificationPreferences && typeof raw.notificationPreferences === "object"
        ? {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(raw.notificationPreferences as Record<string, unknown>),
          }
        : undefined,
  };
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:profile",
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimit.headers });
  }

  let userId = "";
  let email: string | null = null;
  let userMetadata: Record<string, unknown> = {};
  try {
    ({ id: userId, email, userMetadata } = await requireAuthenticatedSupabaseUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  const legacyProfile = extractLegacyProfileMetadata(userMetadata);
  const profile =
    (await getUserProfileRecord(userId)) ||
    (await upsertUserProfileRecord({
      userId,
      email,
      ...legacyProfile,
    }));
  const summary = await getUserProfileSummarySupabase(userId);
  const { followerCount, followingCount } = await getFollowCountsSupabase(userId);

  return NextResponse.json(
    {
      profile,
      summary,
      badges: summary ? deriveProfileBadges(summary) : [],
      followerCount,
      followingCount,
      followers: await listFollowersSupabase(userId, 12),
      following: await listFollowingSupabase(userId, 12),
      activities: await listUserProfileActivitiesSupabase(userId, { limit: 40 }),
      featuredDecks: await listFeaturedProfileDecksSupabase(userId),
      publicDecks: await listPublicProfileDecksSupabase(userId),
    },
    {
      status: 200,
      headers: {
        ...rateLimit.headers,
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(req: NextRequest) {
  const rateLimit = checkRateLimit(req, {
    key: "api:me:profile:write",
    max: 30,
    windowMs: 60_000,
    blockMs: 2 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimit.headers });
  }

  let userId = "";
  let email: string | null = null;
  try {
    ({ id: userId, email } = await requireAuthenticatedUser(req));
  } catch (error) {
    return authErrorResponse(error, rateLimit.headers);
  }

  try {
    const body = (await req.json()) as {
      displayName?: string | null;
      username?: string | null;
      avatarKey?: string | null;
      bio?: string | null;
      favoriteLeaderId?: string | null;
      profileVisibility?: "public" | "private";
      showActivity?: boolean;
      featuredDeckIds?: string[];
      notificationPreferences?: {
        priceAlerts?: boolean;
        newSetReleases?: boolean;
        followerActivity?: boolean;
      };
    };

    const requestedUsername =
      body.username == null ? undefined : sanitizeUsernameCandidate(String(body.username));

    if (requestedUsername !== undefined) {
      if (requestedUsername && !validateUsername(requestedUsername)) {
        return NextResponse.json(
          { error: "Username must be 3-20 characters and use only lowercase letters, numbers, and underscores." },
          { status: 400, headers: rateLimit.headers },
        );
      }

      if (requestedUsername && (await isUsernameInUse(requestedUsername, userId))) {
        return NextResponse.json(
          { error: "That username is already taken." },
          { status: 409, headers: rateLimit.headers },
        );
      }
    }

    let requestedFeaturedDeckIds: string[] | undefined;
    if (body.featuredDeckIds !== undefined) {
      if (!Array.isArray(body.featuredDeckIds)) {
        return NextResponse.json(
          { error: "Featured decks must be provided as an array." },
          { status: 400, headers: rateLimit.headers },
        );
      }

      requestedFeaturedDeckIds = Array.from(
        new Set(
          body.featuredDeckIds
            .map((deckId) => String(deckId || "").trim())
            .filter(Boolean),
        ),
      );

      if (requestedFeaturedDeckIds.length > 3) {
        return NextResponse.json(
          { error: "You can feature up to 3 decks on your profile." },
          { status: 400, headers: rateLimit.headers },
        );
      }

      const validFeaturedDeckIds = await sanitizeFeaturedDeckIdsForUserSupabase(userId, requestedFeaturedDeckIds);
      if (validFeaturedDeckIds.length !== requestedFeaturedDeckIds.length) {
        return NextResponse.json(
          { error: "Featured decks must come from your Crew Hangar." },
          { status: 400, headers: rateLimit.headers },
        );
      }

      requestedFeaturedDeckIds = validFeaturedDeckIds;
    }

    const profile = await upsertUserProfileRecord({
      userId,
      email,
      displayName: body.displayName,
      username: requestedUsername,
      avatarKey: body.avatarKey,
      bio: body.bio,
      favoriteLeaderId: body.favoriteLeaderId,
      profileVisibility: body.profileVisibility,
      showActivity: body.showActivity,
      featuredDeckIds: requestedFeaturedDeckIds,
      notificationPreferences: body.notificationPreferences
        ? {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...body.notificationPreferences,
          }
        : undefined,
    });

    return NextResponse.json(
      { ok: true, profile },
      {
        status: 200,
        headers: {
          ...rateLimit.headers,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(error) },
      { status: 400, headers: rateLimit.headers },
    );
  }
}

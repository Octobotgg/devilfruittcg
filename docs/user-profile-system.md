# User Profile System

This document describes the profile/account system added on top of the existing auth stack.

## Auth model

- Authentication continues to use the existing cloud auth flow exposed through `useCloudSync()`.
- Private profile APIs require a bearer token and resolve the current user through `lib/user-context.ts`.
- No new auth provider was introduced.

## Storage model

Profile and social data are stored in the local SQLite cache initialized in `lib/db.ts`.

### `user_profiles`

Stores user-editable public profile fields.

- `user_id` TEXT PRIMARY KEY
- `email` TEXT
- `display_name` TEXT
- `username` TEXT UNIQUE
- `avatar_key` TEXT
- `bio` TEXT
- `favorite_leader_id` TEXT
- `profile_visibility` TEXT (`public` or `private`)
- `show_activity` INTEGER
- `notification_preferences` TEXT JSON
- `member_since` INTEGER
- `updated_at` INTEGER

### `user_profile_summaries`

Stores cached public/private stats for fast profile reads.

- `user_id` TEXT PRIMARY KEY
- `summary_json` TEXT JSON
- `updated_at` INTEGER

### `user_profile_activities`

Stores timeline events for public/private activity feeds.

- `activity_id` TEXT PRIMARY KEY
- `user_id` TEXT
- `kind` TEXT
- `title` TEXT
- `detail` TEXT
- `card_id` TEXT NULL
- `deck_id` TEXT NULL
- `public_visible` INTEGER
- `dedupe_key` TEXT NULL
- `created_at` INTEGER

### `user_follows`

Stores follower relationships.

- `follower_user_id` TEXT
- `followee_user_id` TEXT
- `created_at` INTEGER
- PRIMARY KEY (`follower_user_id`, `followee_user_id`)

## Public routes

- `/user/[username]`
- `/players`
- `/api/users/search`
- `/api/users/[username]`
- `/api/users/[username]/follow`
- `/api/users/[username]/compare`

## Private routes

- `/account`
- `/api/me/profile`
- `/api/me/profile/sync`
- `/api/me/profile/activity`
- `/api/me/follows`
- `/api/me/account`

## Summary sync strategy

- Collection page pushes collection/wishlist/trade-aware summary updates.
- Deck Lab and Crew Hangar push deck summary updates and deck activity events.
- Account page recomputes a full summary from current saved data and syncs it back.

## Current limitations

- Avatar uploads are implemented as preset avatars, not file uploads.
- Linked login management is informational only.
- Two-factor authentication is not implemented.
- Full auth-user deletion requires `SUPABASE_SERVICE_ROLE_KEY`; without it, app data is deleted but the auth identity remains.

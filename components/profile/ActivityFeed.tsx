import { BadgeDollarSign, BookOpen, Heart, Layers3, Sparkles, Swords, UserPlus } from "lucide-react";
import type { ProfileActivity } from "@/lib/profile-types";

function iconForActivity(kind: ProfileActivity["kind"]) {
  if (kind === "collection_add") return <Layers3 className="h-4 w-4 text-[var(--color-ocean)]" />;
  if (kind === "deck_created" || kind === "deck_updated") return <BookOpen className="h-4 w-4 text-[var(--color-gold-dark)]" />;
  if (kind === "wishlist_add") return <Heart className="h-4 w-4 text-[var(--color-sunset)]" />;
  if (kind === "set_completed") return <Swords className="h-4 w-4 text-[var(--success)]" />;
  if (kind === "badge_earned") return <Sparkles className="h-4 w-4 text-[var(--color-gold-dark)]" />;
  if (kind === "followed_user") return <UserPlus className="h-4 w-4 text-[var(--color-ocean)]" />;
  return <BadgeDollarSign className="h-4 w-4 text-[var(--theme-accent-2)]" />;
}

function formatWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
}

type ActivityFeedProps = {
  activities: ProfileActivity[];
  emptyMessage: string;
};

export default function ActivityFeed({ activities, emptyMessage }: ActivityFeedProps) {
  if (!activities.length) {
    return <p className="text-sm text-[var(--color-text-light)]">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.activityId}
          className="profile-soft-tile relative flex items-start gap-3 overflow-hidden rounded-2xl p-4"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,rgba(212,160,84,0.55)_1px,transparent_1px),linear-gradient(-45deg,rgba(212,160,84,0.28)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(212,160,84,0.1)]">
            {iconForActivity(activity.kind)}
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-black text-[var(--color-navy)]">{activity.title}</p>
            <p className="mt-1 text-sm text-[var(--color-text-mid)]">{activity.detail}</p>
          </div>
          <p className="relative text-xs text-[var(--color-text-light)]">{formatWhen(activity.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

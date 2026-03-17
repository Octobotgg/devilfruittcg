import { BadgeDollarSign, BookOpen, Heart, Layers3, Sparkles, Swords, UserPlus } from "lucide-react";
import type { ProfileActivity } from "@/lib/profile-types";

function iconForActivity(kind: ProfileActivity["kind"]) {
  if (kind === "collection_add") return <Layers3 className="h-4 w-4 text-cyan-300" />;
  if (kind === "deck_created" || kind === "deck_updated") return <BookOpen className="h-4 w-4 text-amber-300" />;
  if (kind === "wishlist_add") return <Heart className="h-4 w-4 text-pink-300" />;
  if (kind === "set_completed") return <Swords className="h-4 w-4 text-emerald-300" />;
  if (kind === "badge_earned") return <Sparkles className="h-4 w-4 text-violet-300" />;
  if (kind === "followed_user") return <UserPlus className="h-4 w-4 text-blue-300" />;
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
    return <p className="text-sm text-white/45">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.activityId}
          className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(22,16,10,0.72),rgba(10,12,18,0.92))] p-4"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(45deg,rgba(248,212,121,0.8)_1px,transparent_1px),linear-gradient(-45deg,rgba(248,212,121,0.5)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#f8d479]/18 bg-black/25">
            {iconForActivity(activity.kind)}
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-sm font-black text-white">{activity.title}</p>
            <p className="mt-1 text-sm text-white/60">{activity.detail}</p>
          </div>
          <p className="relative text-xs text-white/35">{formatWhen(activity.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

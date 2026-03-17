import { Crown, Lock, Sparkles, Star } from "lucide-react";
import { PROFILE_BADGE_DEFINITIONS, type ProfileBadge } from "@/lib/profile-types";

type BadgeBoardProps = {
  badges: ProfileBadge[];
};

const BADGE_ICONS = {
  rookie_pirate: Crown,
  deck_builder: Sparkles,
  collector: Star,
  set_master: Crown,
  treasure_hunter: Sparkles,
  grand_line_explorer: Star,
} as const;

export default function BadgeBoard({ badges }: BadgeBoardProps) {
  const unlockedIds = new Set(badges.map((badge) => badge.id));
  const unlockedCount = PROFILE_BADGE_DEFINITIONS.filter((badge) => unlockedIds.has(badge.id)).length;
  const progress = PROFILE_BADGE_DEFINITIONS.length ? (unlockedCount / PROFILE_BADGE_DEFINITIONS.length) * 100 : 0;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Achievement Badges</p>
          <h2 className="mt-2 text-2xl font-black text-white">Bounty Board</h2>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Unlocked</p>
          <p className="mt-1 text-sm font-black text-[var(--theme-accent-2)]">{unlockedCount}/{PROFILE_BADGE_DEFINITIONS.length}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-white">Grand Line Progress</span>
          <span className="text-white/55">{Math.round(progress)}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(212,175,55,0.55),rgba(248,212,121,0.95))]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROFILE_BADGE_DEFINITIONS.map((badge) => {
          const unlocked = unlockedIds.has(badge.id);
          const Icon = BADGE_ICONS[badge.id];

          return (
            <div
              key={badge.id}
              title={badge.description}
              className={`rounded-[1.6rem] border p-4 transition-colors ${
                unlocked
                  ? "border-[#f8d479]/18 bg-[linear-gradient(180deg,rgba(34,24,14,0.82),rgba(12,12,16,0.94))]"
                  : "border-white/8 bg-white/[0.03] opacity-65 grayscale"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-[0_10px_24px_rgba(0,0,0,0.24)] ${
                    unlocked
                      ? "border-[#f8d479]/22 bg-black/25 text-[var(--theme-accent-2)]"
                      : "border-white/10 bg-black/20 text-white/40"
                  }`}
                >
                  {unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-white">{badge.label}</p>
                  <p className="mt-1 text-sm text-white/58">{badge.description}</p>
                  <p className={`mt-3 text-[11px] font-bold uppercase tracking-[0.12em] ${unlocked ? "text-[var(--theme-accent-2)]" : "text-white/38"}`}>
                    {unlocked ? "Claimed bounty" : "Locked"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export type AvatarPreset = {
  id: string;
  label: string;
  emoji: string;
  bgClassName: string;
  ringClassName: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "straw_hat",
    label: "Straw Hat",
    emoji: "👒",
    bgClassName: "bg-gradient-to-br from-amber-300 via-orange-400 to-red-500",
    ringClassName: "ring-amber-200/60",
  },
  {
    id: "jolly_roger",
    label: "Jolly Roger",
    emoji: "🏴‍☠️",
    bgClassName: "bg-gradient-to-br from-slate-700 via-slate-900 to-black",
    ringClassName: "ring-white/30",
  },
  {
    id: "gum_gum",
    label: "Gum Fruit",
    emoji: "🍈",
    bgClassName: "bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600",
    ringClassName: "ring-pink-200/50",
  },
  {
    id: "mera_mera",
    label: "Flame Fruit",
    emoji: "🔥",
    bgClassName: "bg-gradient-to-br from-orange-300 via-orange-500 to-red-600",
    ringClassName: "ring-orange-200/50",
  },
  {
    id: "navigator",
    label: "Navigator",
    emoji: "🧭",
    bgClassName: "bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-700",
    ringClassName: "ring-sky-200/50",
  },
  {
    id: "anchor",
    label: "Anchor",
    emoji: "⚓",
    bgClassName: "bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-700",
    ringClassName: "ring-emerald-200/50",
  },
];

export function validateUsername(username: string) {
  return USERNAME_REGEX.test(username);
}

export function sanitizeUsernameCandidate(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

export function getAvatarPreset(avatarKey?: string | null) {
  return AVATAR_PRESETS.find((preset) => preset.id === avatarKey) || AVATAR_PRESETS[0];
}

"use client";

import { getAvatarPreset } from "@/lib/profile-config";

type ProfileAvatarProps = {
  avatarKey?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASS: Record<NonNullable<ProfileAvatarProps["size"]>, string> = {
  sm: "h-10 w-10 text-lg",
  md: "h-14 w-14 text-2xl",
  lg: "h-20 w-20 text-3xl",
  xl: "h-28 w-28 text-5xl",
};

export default function ProfileAvatar({ avatarKey, displayName, size = "md" }: ProfileAvatarProps) {
  const preset = getAvatarPreset(avatarKey);
  const ariaLabel = displayName ? `${displayName} avatar` : preset.label;

  return (
    <div
      aria-label={ariaLabel}
      className={`${SIZE_CLASS[size]} ${preset.bgClassName} ${preset.ringClassName} inline-flex items-center justify-center rounded-[1.6rem] ring-2 ring-inset shadow-[0_18px_38px_rgba(0,0,0,0.3)]`}
    >
      <span aria-hidden="true">{preset.emoji}</span>
    </div>
  );
}

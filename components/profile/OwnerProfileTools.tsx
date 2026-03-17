"use client";

import Link from "next/link";
import { Edit3, Search, Settings } from "lucide-react";
import { useCloudSync } from "@/lib/cloud/useCloudSync";

type OwnerProfileToolsProps = {
  targetUserId: string;
};

export default function OwnerProfileTools({ targetUserId }: OwnerProfileToolsProps) {
  const { user } = useCloudSync();

  if (!user || user.id !== targetUserId) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/account/settings#profile-settings"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-bold text-[var(--theme-accent-2)]"
      >
        <Edit3 className="h-4 w-4" />
        Edit Profile
      </Link>
      <Link
        href="/account/settings"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 transition-colors hover:border-[rgba(212,175,55,0.28)] hover:text-white"
      >
        <Settings className="h-4 w-4" />
        Account Settings
      </Link>
      <Link
        href="/players"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 transition-colors hover:border-[rgba(212,175,55,0.28)] hover:text-white"
      >
        <Search className="h-4 w-4" />
        Find Players
      </Link>
    </div>
  );
}

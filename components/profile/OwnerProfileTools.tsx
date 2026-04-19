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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.34)] bg-[rgba(212,160,84,0.12)] px-4 text-sm font-bold text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.18)]"
      >
        <Edit3 className="h-4 w-4" />
        Edit Profile
      </Link>
      <Link
        href="/account/settings"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-4 text-sm font-bold text-[var(--color-text-mid)] transition-colors hover:border-[rgba(212,160,84,0.42)] hover:text-[var(--color-navy)]"
      >
        <Settings className="h-4 w-4" />
        Account Settings
      </Link>
      <Link
        href="/players"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.22)] bg-[rgba(255,249,235,0.72)] px-4 text-sm font-bold text-[var(--color-text-mid)] transition-colors hover:border-[rgba(212,160,84,0.42)] hover:text-[var(--color-navy)]"
      >
        <Search className="h-4 w-4" />
        Find Players
      </Link>
    </div>
  );
}

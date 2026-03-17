"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, LogIn, UserRound } from "lucide-react";
import { useCloudSync } from "@/lib/cloud/useCloudSync";

type AuthNavButtonProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function AuthNavButton({ mobile = false, onNavigate }: AuthNavButtonProps) {
  const { user, ready } = useCloudSync();

  const href = user ? "/account" : "/login";
  const label = user ? "My Account" : "Log In / Sign Up";

  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl border border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.1)] px-4 py-3 text-sm font-medium text-[var(--theme-accent-2)] transition-all hover:border-[rgba(212,175,55,0.48)] hover:bg-[rgba(212,175,55,0.14)]"
      >
        {ready ? (user ? <UserRound className="w-4 h-4" /> : <LogIn className="w-4 h-4" />) : <Loader2 className="w-4 h-4 animate-spin" />}
        {ready ? label : "Checking Account"}
      </Link>
    );
  }

  return (
    <Link href={href} className="hidden md:block">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="luxury-action flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-[var(--obsidian-soft)]"
      >
        {ready ? (user ? <UserRound className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />) : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {ready ? label : "Checking Account"}
      </motion.button>
    </Link>
  );
}

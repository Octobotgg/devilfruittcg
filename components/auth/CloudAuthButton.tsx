"use client";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { LogIn, LogOut, Cloud, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CloudAuthButton() {
  const { user, syncing, ready, signIn, signOut, hasCloud } = useCloudSync();
  if (!ready || !hasCloud) return null;

  if (syncing) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/40">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...
    </div>
  );

  if (user) return (
    <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-1.5 text-xs text-green-400 px-2 py-1 rounded-lg bg-green-400/10 border border-green-400/20">
        <Cloud className="w-3 h-3" />
        <span className="hidden sm:inline">{user.email || "Synced"}</span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );

  return (
    <motion.button
      onClick={signIn}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-[#F0C040]/30 hover:border-[#F0C040]/60 hover:bg-[#F0C040]/10 transition-all"
      title="Sign in to sync your decks & collection to the cloud"
    >
      <LogIn className="w-3.5 h-3.5 text-[#F0C040]" />
      <span>Sync</span>
    </motion.button>
  );
}

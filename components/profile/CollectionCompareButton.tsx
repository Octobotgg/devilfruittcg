"use client";

import { useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { useCloudSync } from "@/lib/cloud/useCloudSync";
import { fetchWithClientAuth } from "@/lib/client-auth";

type CompareResponse = {
  counts: {
    bothOwn: number;
    theyHave: number;
    youHave: number;
  };
};

type CollectionCompareButtonProps = {
  username: string;
};

export default function CollectionCompareButton({ username }: CollectionCompareButtonProps) {
  const { user } = useCloudSync();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);

  if (!user) return null;

  async function runCompare() {
    setLoading(true);
    try {
      const res = await fetchWithClientAuth(`/api/users/${encodeURIComponent(username)}/compare`);
      const json = (await res.json()) as CompareResponse;
      if (res.ok) setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          void runCompare();
        }}
        disabled={loading}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[rgba(212,160,84,0.28)] bg-[rgba(212,160,84,0.1)] px-4 text-sm font-bold text-[var(--color-gold-dark)] transition-colors hover:bg-[rgba(212,160,84,0.16)] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
        Compare Collections
      </button>

      {result ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="profile-paper-card rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">Both Own</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-navy)]">{result.counts.bothOwn}</p>
          </div>
          <div className="profile-paper-card rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">They Have</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-navy)]">{result.counts.theyHave}</p>
          </div>
          <div className="profile-paper-card rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-light)]">You Have</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-navy)]">{result.counts.youHave}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

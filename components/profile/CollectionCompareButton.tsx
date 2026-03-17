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
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-4 text-sm font-bold text-white/80 transition-colors hover:text-white disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
        Compare Collections
      </button>

      {result ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Both Own</p>
            <p className="mt-2 text-2xl font-black text-white">{result.counts.bothOwn}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">They Have</p>
            <p className="mt-2 text-2xl font-black text-white">{result.counts.theyHave}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">You Have</p>
            <p className="mt-2 text-2xl font-black text-white">{result.counts.youHave}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

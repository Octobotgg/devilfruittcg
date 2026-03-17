"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  readLastMarketState,
  resolveMarketBackTarget,
  writePendingMarketRestore,
} from "@/lib/market-navigation";

function decodeMarketParam(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function BackToMarketButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitMarketPath = decodeMarketParam(searchParams.get("market"));
  const fallbackHref = useMemo(() => resolveMarketBackTarget(explicitMarketPath), [explicitMarketPath]);

  const handleClick = useCallback(() => {
    const target = resolveMarketBackTarget(explicitMarketPath);
    const stored = readLastMarketState();

    if (stored && stored.path === target) {
      writePendingMarketRestore(stored);
    } else {
      writePendingMarketRestore({
        path: target,
        scrollY: 0,
        savedAt: Date.now(),
      });
    }

    router.push(target, { scroll: false });
  }, [explicitMarketPath, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/75 transition-all hover:bg-white/10 hover:text-white"
      aria-label="Back to market"
      data-market-target={fallbackHref}
    >
      Back to Market
    </button>
  );
}

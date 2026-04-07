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
      className="inline-flex items-center gap-2 rounded-full border border-[#d4a054]/35 bg-[#faf7f2] px-3.5 py-2 text-sm font-semibold text-[#2d6a8f] shadow-[0_10px_24px_rgba(27,40,56,0.08)] transition-all hover:-translate-y-[1px] hover:border-[#d4a054] hover:text-[#1b2838]"
      aria-label="Back to market"
      data-market-target={fallbackHref}
    >
      Back to Market
    </button>
  );
}

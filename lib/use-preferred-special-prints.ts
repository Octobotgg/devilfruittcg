"use client";

import { useEffect, useMemo, useState } from "react";

type PreferredSpecialPrintResult = {
  requestedId: string;
  baseId: string;
  preferredId: string | null;
};

type PreferredVariantType = "special_print" | "alt_art";

export function usePreferredSpecialPrintIds(ids: string[], enabled = true, variantType: PreferredVariantType = "special_print") {
  const normalizedIds = useMemo(
    () => Array.from(new Set(ids.map((id) => id.trim().toUpperCase()).filter(Boolean))).sort(),
    [ids],
  );
  const hasIds = normalizedIds.length > 0;
  const requestKey = normalizedIds.join(",");
  const [preferredIds, setPreferredIds] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !hasIds) {
      setPreferredIds(new Map());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({
          ids: requestKey,
          type: variantType,
        });
        const res = await fetch(`/api/cards/special-prints?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load special print variants");

        const json = await res.json();
        const next = new Map<string, string>();

        for (const item of (json.results || []) as PreferredSpecialPrintResult[]) {
          if (item?.baseId && item?.preferredId) {
            next.set(item.baseId.toUpperCase(), item.preferredId.toUpperCase());
          }
        }

        if (!cancelled) setPreferredIds(next);
      } catch {
        if (!cancelled) setPreferredIds(new Map());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, hasIds, requestKey, variantType]);

  return preferredIds;
}

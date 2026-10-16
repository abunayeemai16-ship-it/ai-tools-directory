"use client";

import { useEffect, useRef } from "react";

export function AdImpression({ ids }: { ids: string[] }) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const fresh = [...new Set(ids.filter(Boolean))].filter((id) => !seen.current.has(id));
    if (!fresh.length) return;
    for (const id of fresh) seen.current.add(id);
    void fetch("/api/ads/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: fresh }),
    }).catch(() => {
      // Impression tracking must never trip the Next.js overlay.
    });
  }, [ids]);

  return null;
}

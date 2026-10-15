"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RateTool({
  slug,
  rating,
  reviewCount,
  alreadyRated = false,
}: {
  slug: string;
  rating: number;
  reviewCount: number;
  alreadyRated?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const [current, setCurrent] = useState(rating);
  const [count, setCount] = useState(reviewCount);
  const [done, setDone] = useState(alreadyRated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function vote(stars: number) {
    if (done || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tools/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      const payload = (await res.json()) as {
        rating?: number;
        reviewCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Could not save rating");
      setCurrent(payload.rating ?? stars);
      setCount(payload.reviewCount ?? count + 1);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-medium">Rate this Tool (1–5 Stars)</p>
      <p className="mt-1 text-xs text-muted">
        {done
          ? "Thanks — your rating is saved in the live directory."
          : "Visitor ratings update the public score and review count in data/db.json."}
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((stars) => {
          const active = (hover || (done ? Math.round(current) : 0)) >= stars;
          return (
            <button
              key={stars}
              type="button"
              disabled={done || busy}
              aria-label={`Rate ${stars} stars`}
              onMouseEnter={() => setHover(stars)}
              onMouseLeave={() => setHover(0)}
              onClick={() => void vote(stars)}
              className="rounded-md p-0.5 disabled:cursor-default"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition",
                  active ? "fill-accent text-accent" : "text-line hover:text-accent",
                )}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-medium">{current.toFixed(1)} / 5</span>
        <span className="text-xs text-muted">({count} ratings)</span>
      </div>
      {error ? <p className="mt-2 text-xs text-rose">{error}</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Submission, SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubmissionsManager({ initial }: { initial: Submission[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, status: SubmissionStatus) {
    setBusy(id);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("fail");
      const updated = (await res.json()) as Submission;
      setRows((current) =>
        current.map((row) => (row.id === id ? updated : row)),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Queue</p>
        <h1 className="mt-1 font-serif text-3xl">Tool submissions</h1>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
            No submissions yet. Founder listings from /submit appear here.
          </p>
        ) : null}
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{row.name}</h2>
                  <StatusPill status={row.status} />
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px]",
                      row.tier === "featured"
                        ? "bg-accent/15 text-accent"
                        : "bg-white/5 text-muted",
                    )}
                  >
                    {row.tier === "featured" ? "Featured $49" : "Free listing"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {row.category} · {row.pricingModel} · {row.website}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6">{row.pitch}</p>
                <p className="mt-2 text-xs text-muted">
                  {row.email} · {row.submittedAt.slice(0, 10)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === row.id || row.status === "approved"}
                  onClick={() => update(row.id, "approved")}
                  className="rounded-full bg-mint px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === row.id || row.status === "rejected"}
                  onClick={() => update(row.id, "rejected")}
                  className="rounded-full bg-rose px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SubmissionStatus }) {
  const styles = {
    pending: "bg-accent/15 text-accent",
    approved: "bg-mint/15 text-mint",
    rejected: "bg-rose/15 text-rose",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] capitalize", styles[status])}>
      {status}
    </span>
  );
}

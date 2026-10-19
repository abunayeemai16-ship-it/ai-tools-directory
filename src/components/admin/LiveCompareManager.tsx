"use client";

import Link from "next/link";
import { useState } from "react";
import type { LiveComparisonRecord } from "@/lib/live-compare";
import { cn } from "@/lib/utils";

type Item = LiveComparisonRecord & { directory: { a: string | null; b: string | null } };

function statusLabel(item: Item) {
  if (!item.valid) return { text: "Rejected", className: "bg-rose/15 text-rose" };
  if (item.status === "drafted") return { text: "Drafted", className: "bg-mint/15 text-mint" };
  if (item.status === "dismissed") return { text: "Dismissed", className: "bg-white/5 text-muted" };
  return { text: "New", className: "bg-accent/15 text-accent" };
}

export function LiveCompareManager({ initial, enabled }: { initial: Item[]; enabled: boolean }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function act(item: Item, action: "draft" | "dismiss" | "restore" | "delete") {
    setBusy(item.key);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/live-compares", {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        item?: Item | null;
        draftSlug?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (action === "delete") {
        setItems((current) => current.filter((row) => row.key !== item.key));
      } else if (data.item) {
        const next = data.item;
        setItems((current) => current.map((row) => (row.key === item.key ? next : row)));
      }
      if (action === "draft") setNotice(`Saved as a comparison draft. Review and publish it in Ready Drafts.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const fresh = items.filter((item) => item.valid && item.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Demand</p>
        <h1 className="mt-1 font-serif text-3xl">Visitor compares</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Matchups visitors researched live on the Compare page. They are never published
          automatically and stay out of Google. Save the good ones as comparison drafts, then
          review and publish them from Ready Drafts. Both tools must be in the directory first.
          {fresh ? ` ${fresh} new to review.` : ""}
        </p>
        {!enabled ? (
          <p className="mt-3 max-w-3xl rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            Live web research is off. Add a GEMINI_PUBLIC_API_KEY environment variable in Vercel
            and redeploy to turn it on. Directory-only comparisons work without it.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? (
        <p className="text-sm text-mint">
          {notice}{" "}
          <Link href="/admin/drafts" className="underline">
            Open Ready Drafts
          </Link>
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
          No live comparisons yet. They appear here when visitors compare tools on the Compare page.
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const status = statusLabel(item);
          const missing = [!item.directory.a && item.toolA, !item.directory.b && item.toolB].filter(Boolean);
          return (
            <article key={item.key} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {item.toolA} vs {item.toolB}
                    </h2>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px]", status.className)}>
                      {status.text}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                      Asked {item.requests}×
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Typed as “{item.askedA}” vs “{item.askedB}” · researched{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  {item.valid ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6">{item.tagline}</p>
                  ) : (
                    <p className="mt-2 max-w-3xl text-sm text-rose">{item.reason}</p>
                  )}
                  {item.valid && missing.length ? (
                    <p className="mt-2 text-xs text-accent">
                      Not in the directory yet: {missing.join(", ")}.{" "}
                      <Link href="/admin/generate" className="underline">
                        Add in AI Studio
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.valid ? (
                    <button
                      type="button"
                      disabled={busy === item.key || missing.length > 0}
                      onClick={() => void act(item, "draft")}
                      className="rounded-full bg-mint px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-40"
                    >
                      {item.status === "drafted" ? "Update draft" : "Save as draft"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy === item.key}
                    onClick={() => void act(item, item.status === "dismissed" ? "restore" : "dismiss")}
                    className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-white disabled:opacity-40"
                  >
                    {item.status === "dismissed" ? "Restore" : "Dismiss"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === item.key}
                    onClick={() => void act(item, "delete")}
                    className="rounded-full border border-rose/30 px-3 py-1.5 text-sm text-rose disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {item.valid ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-muted hover:text-white">
                    View comparison
                  </summary>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <tbody>
                        {item.rows.map((row) => (
                          <tr key={row.feature} className="border-t border-line first:border-t-0 align-top">
                            <td className="px-3 py-2 font-medium">{row.feature}</td>
                            <td className={cn("px-3 py-2", row.winner === "a" && "text-mint")}>{row.a}</td>
                            <td className={cn("px-3 py-2", row.winner === "b" && "text-mint")}>{row.b}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.verdict}</p>
                  {item.sources.length ? (
                    <p className="mt-2 text-xs text-muted">
                      Sources:{" "}
                      {item.sources.map((source, position) => (
                        <span key={source.url}>
                          {position ? ", " : ""}
                          <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                            {source.title}
                          </a>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

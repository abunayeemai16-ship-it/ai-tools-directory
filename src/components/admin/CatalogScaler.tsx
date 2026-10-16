"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Sparkles } from "lucide-react";
import type { DirectoryCategory, PublishStatus } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";

type Progress = {
  librarySize: number;
  inDatabase: number;
  remaining: number;
  published: number;
  drafts: number;
  cap: number;
};

type Added = {
  slug: string;
  name: string;
  category: string;
  status: PublishStatus;
  officialUrl: string;
  pricingModel: string;
};

type ScaleResponse = {
  added?: Added[];
  count?: number;
  progress?: Progress;
  geminiUsed?: number;
  libraryUsed?: number;
  message?: string;
  error?: string;
};

export function CatalogScaler({
  categories,
  initialProgress,
  initialPreview = [],
  initialRemainingByCategory = {},
  initialGeminiReady = false,
}: {
  categories: DirectoryCategory[];
  initialProgress?: Progress | null;
  initialPreview?: { name: string; category: string; website: string }[];
  initialRemainingByCategory?: Record<string, number>;
  initialGeminiReady?: boolean;
}) {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<PublishStatus>("draft");
  const [progress, setProgress] = useState<Progress | null>(initialProgress ?? null);
  const [geminiReady, setGeminiReady] = useState(initialGeminiReady);
  const [preview, setPreview] = useState(initialPreview);
  const [remainingByCategory, setRemainingByCategory] = useState(initialRemainingByCategory);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [log, setLog] = useState<Added[]>([]);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/catalog-scale", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        progress?: Progress;
        geminiReady?: boolean;
        remainingPreview?: { name: string; category: string; website: string }[];
        remainingByCategory?: Record<string, number>;
      };
      if (data.progress) setProgress(data.progress);
      setGeminiReady(Boolean(data.geminiReady));
      setPreview(data.remainingPreview || []);
      setRemainingByCategory(data.remainingByCategory || {});
    } catch {
      // keep SSR snapshot
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const remainingForPick = useMemo(() => {
    if (!progress) return 0;
    if (category === "all") return progress.remaining;
    return remainingByCategory[category] || 0;
  }, [progress, category, remainingByCategory]);

  async function run(batch: number) {
    setBusy(batch);
    setError("");
    setNotice("");
    const looping = batch >= 500;
    let addedTotal = 0;
    let geminiUsed = 0;
    let libraryUsed = 0;
    try {
      for (let round = 0; round < 90; round += 1) {
        const res = await fetch("/api/admin/catalog-scale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, batch, status }),
        });
        const payload = (await res.json()) as ScaleResponse;
        if (!res.ok) throw new Error(payload.error || "Scale failed");
        if (payload.progress) setProgress(payload.progress);
        if (payload.added?.length) setLog((prev) => [...payload.added!, ...prev].slice(0, 80));
        addedTotal += payload.count ?? payload.added?.length ?? 0;
        geminiUsed += payload.geminiUsed ?? 0;
        libraryUsed += payload.libraryUsed ?? 0;
        const remaining =
          category === "all"
            ? payload.progress?.remaining ?? 0
            : remainingByCategory[category] ?? payload.progress?.remaining ?? 0;
        const atCap =
          (payload.progress?.inDatabase ?? 0) >= (payload.progress?.cap ?? 5000);
        if (payload.progress) {
          setNotice(
            `Added ${addedTotal} so far · ${payload.progress.inDatabase}/${payload.progress.cap} in db.`,
          );
        }
        if (!looping) break;
        if (!payload.count) break;
        if (atCap || remaining === 0) break;
      }
      setNotice(
        `Added ${addedTotal} tool${addedTotal === 1 ? "" : "s"}. Library expander: ${libraryUsed}. Gemini: ${geminiUsed}.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scale failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <Layers className="h-4 w-4 text-accent" />
            5000-Tool Catalog Scaler
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Pulls the next unused products from a curated library of real AI/SaaS tools.
            Batches of 25 use Gemini when a key is active, then fall back to the library
            expander so nothing is placeholder copy.
          </p>
        </div>
        {progress ? (
          <p className="rounded-full border border-line px-3 py-1 text-xs text-muted">
            {progress.inDatabase}/{progress.cap} in db · {progress.published} live · {progress.remaining} left in library
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-ink px-3 outline-none"
          >
            <option value="all">All Categories ({progress?.remaining ?? 0} left)</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name} ({remainingByCategory[item.slug] ?? 0} left)
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Save as</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PublishStatus)}
            className="h-11 w-full rounded-xl border border-line bg-ink px-3 outline-none"
          >
            <option value="draft">Ready Drafts (human approval)</option>
            <option value="published">Publish immediately</option>
          </select>
        </label>
        <div className="flex items-end text-xs text-muted">
          {geminiReady
            ? "+25 will try Gemini 2.5 Flash with library fallback. Larger batches use the library expander and keep going until the 5000-tool cap."
            : "No Gemini key active — batches use the curated library expander (still real products, complete SEO fields)."}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { n: 25, label: "+ Add Next 25 Real Tools" },
          { n: 50, label: "+ Add Next 50 Real Tools" },
          { n: 500, label: "+ Add Next 500 Tools" },
          { n: 5000, label: "Scale to 5000 Tools" },
        ].map((item) => (
          <button
            key={item.n}
            type="button"
            disabled={busy !== null || remainingForPick === 0}
            onClick={() => void run(item.n)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === item.n ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-mint">{notice}</p> : null}

      {preview.length ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Next unpublished library tools</p>
          <ul className="mt-2 grid gap-1 text-sm text-muted sm:grid-cols-2">
            {preview.slice(0, 12).map((item) => (
              <li key={`${item.website}-${item.name}`}>
                <span className="text-white">{item.name}</span>
                <span className="text-xs"> · {categoryLabel(item.category, categories)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {log.length ? (
        <div className="mt-5 overflow-x-auto">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Last added</p>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Tool</th>
                <th className="py-1 pr-3 font-medium">Category</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 font-medium">Official URL</th>
              </tr>
            </thead>
            <tbody>
              {log.map((item) => (
                <tr key={item.slug} className="border-t border-line">
                  <td className="py-1.5 pr-3">{item.name}</td>
                  <td className="py-1.5 pr-3 text-muted">{categoryLabel(item.category, categories)}</td>
                  <td className="py-1.5 pr-3">{item.status}</td>
                  <td className="py-1.5 font-mono text-xs text-blue">{item.officialUrl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

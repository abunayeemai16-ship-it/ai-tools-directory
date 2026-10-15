"use client";

import { useState } from "react";
import { Loader2, Sparkles, Swords } from "lucide-react";
import type { GeneratedComparison, GeneratedReview } from "@/lib/types";

export function GeneratorStudio() {
  const [input, setInput] = useState("");
  const [toolA, setToolA] = useState("");
  const [toolB, setToolB] = useState("");
  const [busy, setBusy] = useState<"review" | "vs" | "publish" | "auto" | null>(null);
  const [review, setReview] = useState<GeneratedReview | null>(null);
  const [comparison, setComparison] = useState<GeneratedComparison | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generateReview() {
    setBusy("review");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "review", input }),
      });
      const payload = (await res.json()) as GeneratedReview & { error?: string; source?: string };
      if (!res.ok) throw new Error(payload.error || "fail");
      setReview(payload);
      setNotice(
        payload.source === "fallback"
          ? "Structured fallback (no working Gemini key). Edit and save to Ready Drafts."
          : "Drafted with Gemini. Review, then send to Ready Drafts — it stays unpublished until you approve it.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generator failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generateVs() {
    setBusy("vs");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "compare", toolA, toolB }),
      });
      const payload = (await res.json()) as GeneratedComparison & { error?: string; source?: string };
      if (!res.ok) throw new Error(payload.error || "fail");
      setComparison(payload);
      setNotice(
        payload.source === "fallback"
          ? "Structured fallback (no working Gemini key). Edit and save to Ready Drafts."
          : "Drafted with Gemini. Review, then send to Ready Drafts — it stays unpublished until you approve it.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the comparison.");
    } finally {
      setBusy(null);
    }
  }

  async function publishReview(draft: GeneratedReview) {
    setBusy("publish");
    setError("");
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Publish failed");
      setNotice(`Sent ${draft.name} to Ready Drafts. It is not live until you approve it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function publishVs(draft: GeneratedComparison) {
    setBusy("publish");
    setError("");
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Publish failed");
      setNotice(`Sent ${draft.toolA} vs ${draft.toolB} to Ready Drafts. Human approval required.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Studio</p>
        <h1 className="mt-1 font-serif text-3xl">AI Auto-Generator</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Gemini 2.5 Flash using keys from API Keys &amp; Settings, with automatic
          failover. If no key is active, a structured fallback is used. Output
          always lands in Ready Drafts — never live until Approve &amp; Publish.
        </p>
        <button
          type="button"
          onClick={async () => {
            setBusy("auto");
            setError("");
            setNotice("");
            try {
              const res = await fetch("/api/admin/auto-draft", { method: "POST" });
              const payload = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(payload.error || "Auto-draft failed");
              setNotice("Daily drafts queued. Open Ready Drafts to review before they go live.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Auto-draft failed");
            } finally {
              setBusy(null);
            }
          }}
          disabled={busy !== null}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {busy === "auto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Auto-Generate Today&apos;s AI Drafts
        </button>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-accent" />
          Generate SEO review
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tool name or https://..."
            className="h-11 flex-1 rounded-xl border border-line bg-ink px-3 outline-none"
          />
          <button
            type="button"
            onClick={generateReview}
            disabled={busy !== null || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "review" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate SEO Review with AI
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-medium">
          <Swords className="h-4 w-4 text-accent" />
          Generate VS comparison
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
          <input
            value={toolA}
            onChange={(event) => setToolA(event.target.value)}
            className="h-11 rounded-xl border border-line bg-ink px-3 outline-none"
            placeholder="Tool A"
          />
          <span className="hidden text-center text-muted sm:block">vs</span>
          <input
            value={toolB}
            onChange={(event) => setToolB(event.target.value)}
            className="h-11 rounded-xl border border-line bg-ink px-3 outline-none"
            placeholder="Tool B"
          />
          <button
            type="button"
            onClick={generateVs}
            disabled={busy !== null || !toolA.trim() || !toolB.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent disabled:opacity-60"
          >
            {busy === "vs" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate VS Comparison
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}

      {review ? (
        <ReviewDraft
          review={review}
          busy={busy === "publish"}
          onChange={setReview}
          onPublish={() => void publishReview(review)}
        />
      ) : null}
      {comparison ? (
        <ComparisonDraft
          comparison={comparison}
          busy={busy === "publish"}
          onPublish={() => void publishVs(comparison)}
        />
      ) : null}
    </div>
  );
}

function ReviewDraft({
  review,
  busy,
  onChange,
  onPublish,
}: {
  review: GeneratedReview;
  busy: boolean;
  onChange: (review: GeneratedReview) => void;
  onPublish: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-mint/30 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-2xl">{review.name} draft</h3>
        <span className="rounded-full bg-mint/15 px-2 py-0.5 text-xs text-mint">
          Ready to publish
        </span>
      </div>
      <Field
        label="SEO title"
        value={review.seoTitle}
        onChange={(seoTitle) => onChange({ ...review, seoTitle })}
      />
      <Field
        label="Meta description"
        value={review.metaDescription}
        onChange={(metaDescription) => onChange({ ...review, metaDescription })}
      />
      <Field
        label="Short pitch"
        value={review.shortPitch}
        onChange={(shortPitch) => onChange({ ...review, shortPitch })}
      />
      <Field
        label="Overview"
        value={review.overview}
        onChange={(overview) => onChange({ ...review, overview })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <List label="Pros" items={review.pros} />
        <List label="Cons" items={review.cons} />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onPublish}
        className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Saving…" : "Send to Ready Drafts"}
      </button>
    </section>
  );
}

function ComparisonDraft({
  comparison,
  busy,
  onPublish,
}: {
  comparison: GeneratedComparison;
  busy: boolean;
  onPublish: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-blue/30 bg-surface p-5">
      <h3 className="font-serif text-2xl">
        {comparison.toolA} vs {comparison.toolB}
      </h3>
      <p className="text-sm text-muted">{comparison.tagline}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2">Feature</th>
              <th>{comparison.toolA}</th>
              <th>{comparison.toolB}</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.feature} className="border-t border-line">
                <td className="py-2">{row.feature}</td>
                <td>{row.a}</td>
                <td>{row.b}</td>
                <td className="text-accent">
                  {row.winner === "tie"
                    ? "Tie"
                    : row.winner === "a"
                      ? comparison.toolA
                      : comparison.toolB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-6">{comparison.verdict}</p>
      <button
        type="button"
        disabled={busy}
        onClick={onPublish}
        className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {busy ? "Saving…" : "Send comparison to Ready Drafts"}
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={label === "Overview" || label === "Meta description" ? 3 : 2}
        className="w-full rounded-xl border border-line bg-ink px-3 py-2"
      />
    </label>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

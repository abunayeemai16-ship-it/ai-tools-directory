"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileEdit, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import type { Comparison, DirectoryCategory, Tool } from "@/lib/types";

type DraftsPayload = {
  tools: Tool[];
  comparisons: Comparison[];
  count: number;
};

function uniqueDraftTools(tools: Tool[]) {
  const seen = new Set<string>();
  return tools.filter((tool) => {
    const key = tool.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueDraftComparisons(items: Comparison[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.toolASlug}::${item.toolBSlug}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function errorFrom(res: Response, fallback: string) {
  const text = await res.text();
  try {
    const payload = JSON.parse(text) as { error?: string };
    if (payload.error?.trim()) return payload.error.trim();
  } catch {
    /* use fallback */
  }
  return text.trim() || fallback;
}

function uniqueDrafts(payload: DraftsPayload): DraftsPayload {
  const tools = uniqueDraftTools(payload.tools);
  const comparisons = uniqueDraftComparisons(payload.comparisons);
  return { tools, comparisons, count: tools.length + comparisons.length };
}

export function ReadyDrafts({
  initial,
  categories = [],
}: {
  initial: DraftsPayload;
  categories?: DirectoryCategory[];
}) {
  const [data, setData] = useState(() => uniqueDrafts(initial));
  const [busy, setBusy] = useState<"auto" | string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openTool, setOpenTool] = useState<Tool | null>(null);
  const [openVs, setOpenVs] = useState<Comparison | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts", { cache: "no-store" });
      if (!res.ok) return;
      setData(uniqueDrafts((await res.json()) as DraftsPayload));
    } catch {
      // Draft poll can fail while Postgres is busy; keep the last list.
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function autoDraft() {
    setBusy("auto");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/auto-draft", { method: "POST" });
      const payload = (await res.json()) as { error?: string; source?: string; tools?: Tool[] };
      if (!res.ok) throw new Error(payload.error || "Auto-draft failed");
      const added = payload.tools?.length ?? 0;
      setNotice(
        added === 0
          ? "No new drafts — each tool already has a unique row in the queue or catalog."
          : payload.source === "gemini"
            ? "Gemini drafted new reviews into the queue. Human review required before they go live."
            : "Structured fallback drafts added (no active Gemini keys). Add keys in API Keys & Settings, then edit and approve before publish.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-draft failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Human in the loop</p>
          <h1 className="mt-1 font-serif text-3xl">Ready Drafts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            AI can draft. Google Scaled Content Abuse requires a human to edit,
            add an affiliate URL, and click Approve & Publish. Nothing in this
            queue is live until you do.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void autoDraft()}
          disabled={busy === "auto"}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {busy === "auto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Auto-Generate Today&apos;s AI Drafts
        </button>
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}

      <p className="text-sm text-muted">{data.count} pending · not indexed on the public site</p>

      <section className="space-y-3">
        <h2 className="font-medium">Tool reviews</h2>
        {data.tools.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            No tool drafts. Run auto-generate or send a review from AI Studio.
          </p>
        ) : (
          data.tools.map((tool) => (
            <DraftRow
              key={tool.slug || tool.name}
              title={tool.name}
              subtitle={`${categoryLabel(tool.category, categories)} · ${tool.seoTitle}`}
              onEdit={() => setOpenTool(tool)}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">VS comparisons</h2>
        {data.comparisons.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            No comparison drafts in the queue.
          </p>
        ) : (
          data.comparisons.map((item) => (
            <DraftRow
              key={item.slug || `${item.toolASlug}-vs-${item.toolBSlug}`}
              title={item.seoTitle}
              subtitle={item.tagline}
              onEdit={() => setOpenVs(item)}
            />
          ))
        )}
      </section>

      {openTool ? (
        <ToolEditor
          tool={openTool}
          categories={categories}
          busy={busy === openTool.slug}
          onClose={() => setOpenTool(null)}
          onChange={setOpenTool}
          onSave={async (action) => {
            setBusy(openTool.slug);
            setError("");
            try {
              if (action === "delete") {
                const res = await fetch(`/api/tools/${openTool.slug}`, { method: "DELETE" });
                if (!res.ok) throw new Error(await errorFrom(res, "Delete failed"));
              } else {
                const res = await fetch(`/api/tools/${openTool.slug}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    action === "publish" ? { ...openTool, action: "publish" } : openTool,
                  ),
                });
                if (!res.ok) throw new Error(await errorFrom(res, "Save failed"));
              }
              setOpenTool(null);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not update draft");
            } finally {
              setBusy(null);
            }
          }}
        />
      ) : null}

      {openVs ? (
        <ComparisonEditor
          comparison={openVs}
          busy={busy === openVs.slug}
          onClose={() => setOpenVs(null)}
          onChange={setOpenVs}
          onSave={async (action) => {
            setBusy(openVs.slug);
            setError("");
            try {
              if (action === "delete") {
                const res = await fetch(`/api/comparisons/${openVs.slug}`, { method: "DELETE" });
                if (!res.ok) throw new Error(await errorFrom(res, "Delete failed"));
              } else {
                const res = await fetch(`/api/comparisons/${openVs.slug}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    action === "publish" ? { ...openVs, action: "publish" } : openVs,
                  ),
                });
                if (!res.ok) throw new Error(await errorFrom(res, "Save failed"));
              }
              setOpenVs(null);
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not update draft");
            } finally {
              setBusy(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function DraftRow({
  title,
  subtitle,
  onEdit,
}: {
  title: string;
  subtitle: string;
  onEdit: () => void;
}) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-accent uppercase">
          Draft
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent"
        >
          <FileEdit className="h-3.5 w-3.5" />
          Preview &amp; edit
        </button>
      </div>
    </article>
  );
}

function ToolEditor({
  tool,
  categories,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  tool: Tool;
  categories: DirectoryCategory[];
  busy: boolean;
  onChange: (tool: Tool) => void;
  onClose: () => void;
  onSave: (action: "save" | "publish" | "delete") => void;
}) {
  return (
    <Drawer title={`${tool.name} draft`} onClose={onClose} busy={busy} onSave={onSave}>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">Category</span>
        <select
          value={tool.category}
          onChange={(event) => onChange({ ...tool, category: event.target.value })}
          className="h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
        >
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="SEO title" value={tool.seoTitle} onChange={(seoTitle) => onChange({ ...tool, seoTitle })} />
      <Field
        label="Meta description"
        value={tool.metaDescription}
        onChange={(metaDescription) => onChange({ ...tool, metaDescription })}
      />
      <Field
        label="Overview"
        value={tool.overview}
        rows={6}
        onChange={(overview) => onChange({ ...tool, overview })}
      />
      <Field
        label="Pros (one per line)"
        value={tool.pros.join("\n")}
        rows={4}
        onChange={(value) => onChange({ ...tool, pros: lines(value) })}
      />
      <Field
        label="Cons (one per line)"
        value={tool.cons.join("\n")}
        rows={3}
        onChange={(value) => onChange({ ...tool, cons: lines(value) })}
      />
      <Field
        label="Pricing (Name | Price | Period)"
        value={tool.pricingTiers.map((tier) => `${tier.name} | ${tier.price} | ${tier.period ?? ""}`).join("\n")}
        rows={3}
        onChange={(value) =>
          onChange({
            ...tool,
            pricingTiers: lines(value).map((row, index) => {
              const [name, price, period] = row.split("|").map((part) => part.trim());
              return {
                name: name || `Plan ${index + 1}`,
                price: price || "",
                period: period || undefined,
                features: tool.pricingTiers[index]?.features ?? [],
                highlighted: tool.pricingTiers[index]?.highlighted,
              };
            }),
          })
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Editorial rating (1–5)"
          value={String(tool.rating ?? "")}
          rows={1}
          onChange={(value) => onChange({ ...tool, rating: Number(value) || 0 })}
        />
        <Field
          label="Review count"
          value={String(tool.reviewCount ?? "")}
          rows={1}
          onChange={(value) => onChange({ ...tool, reviewCount: Number(value) || 0 })}
        />
      </div>
      <Field
        label="Official URL"
        value={tool.officialUrl || tool.website}
        onChange={(officialUrl) => onChange({ ...tool, officialUrl, website: officialUrl })}
      />
      <Field
        label="Affiliate link"
        value={tool.affiliateUrl}
        onChange={(affiliateUrl) => onChange({ ...tool, affiliateUrl })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Coupon code"
          value={tool.couponCode ?? ""}
          onChange={(couponCode) => onChange({ ...tool, couponCode })}
        />
        <Field
          label="Coupon discount"
          value={tool.couponDiscount ?? ""}
          onChange={(couponDiscount) => onChange({ ...tool, couponDiscount })}
        />
      </div>
    </Drawer>
  );
}

function ComparisonEditor({
  comparison,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  comparison: Comparison;
  busy: boolean;
  onChange: (comparison: Comparison) => void;
  onClose: () => void;
  onSave: (action: "save" | "publish" | "delete") => void;
}) {
  return (
    <Drawer title={comparison.seoTitle} onClose={onClose} busy={busy} onSave={onSave}>
      <Field
        label="SEO title"
        value={comparison.seoTitle}
        onChange={(seoTitle) => onChange({ ...comparison, seoTitle })}
      />
      <Field
        label="Meta description"
        value={comparison.metaDescription}
        onChange={(metaDescription) => onChange({ ...comparison, metaDescription })}
      />
      <Field
        label="Tagline"
        value={comparison.tagline}
        onChange={(tagline) => onChange({ ...comparison, tagline })}
      />
      <Field
        label="Verdict / overview"
        value={comparison.verdict}
        rows={5}
        onChange={(verdict) => onChange({ ...comparison, verdict })}
      />
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-ink-2 text-muted">
            <tr>
              <th className="px-3 py-2">Feature</th>
              <th>{comparison.toolASlug}</th>
              <th>{comparison.toolBSlug}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.feature} className="border-t border-line">
                <td className="px-3 py-2">{row.feature}</td>
                <td>{row.a}</td>
                <td>{row.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field
        label="Affiliate link"
        value={comparison.affiliateUrl}
        onChange={(affiliateUrl) => onChange({ ...comparison, affiliateUrl })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Coupon code"
          value={comparison.couponCode ?? ""}
          onChange={(couponCode) => onChange({ ...comparison, couponCode })}
        />
        <Field
          label="Coupon discount"
          value={comparison.couponDiscount ?? ""}
          onChange={(couponDiscount) => onChange({ ...comparison, couponDiscount })}
        />
      </div>
    </Drawer>
  );
}

function Drawer({
  title,
  children,
  busy,
  onClose,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  busy: boolean;
  onClose: () => void;
  onSave: (action: "save" | "publish" | "delete") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-line bg-ink-2">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        <div className="flex flex-wrap gap-2 border-t border-line p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave("publish")}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Approve &amp; Publish
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave("save")}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave("delete")}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-rose hover:bg-rose/10 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete Draft
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line bg-ink px-3 py-2"
      />
    </label>
  );
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

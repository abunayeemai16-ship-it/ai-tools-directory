"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { categoryLabel, hasActiveAffiliate } from "@/lib/categories";
import type { Commission, DirectoryCategory, PricingModel, PublishStatus, ToolStats } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PricingBadge } from "@/components/tools/PricingBadge";
import { StarRating } from "@/components/tools/StarRating";

const EMPTY_DEAL: {
  couponCode: string;
  dealText: string;
  couponDiscount: string;
  couponExpires: string;
} = {
  couponCode: "",
  dealText: "",
  couponDiscount: "",
  couponExpires: "",
};

type Filter = "all" | "active" | "pending";

type Payload = {
  tools: ToolStats[];
  categories: DirectoryCategory[];
  settings: { epc: number };
  commissions: Commission[];
};

type Draft = {
  name: string;
  slug: string;
  officialUrl: string;
  affiliateUrl: string;
  affiliateNetwork: string;
  commissionNote: string;
  couponCode: string;
  dealText: string;
  category: string;
  shortPitch: string;
  pricingModel: PricingModel;
  featured: boolean;
  status: PublishStatus;
  rating: string;
  reviewCount: string;
};

const emptyDraft = (category: string): Draft => ({
  name: "",
  slug: "",
  officialUrl: "",
  affiliateUrl: "",
  affiliateNetwork: "",
  commissionNote: "",
  couponCode: "",
  dealText: "",
  category,
  shortPitch: "",
  pricingModel: "Freemium",
  featured: false,
  status: "published",
  rating: "4.5",
  reviewCount: "48",
});

function fromTool(tool: ToolStats): Draft {
  return {
    name: tool.name,
    slug: tool.slug,
    officialUrl: tool.officialUrl || tool.website,
    affiliateUrl: tool.affiliateUrl || "",
    affiliateNetwork: tool.affiliateNetwork || "",
    commissionNote: tool.commissionNote || "",
    couponCode: tool.couponCode || "",
    dealText: tool.dealText || tool.couponDiscount || "",
    category: tool.category,
    shortPitch: tool.shortPitch,
    pricingModel: tool.pricingModel,
    featured: tool.featured,
    status: tool.status,
    rating: String(tool.rating || 4.5),
    reviewCount: String(tool.reviewCount || 48),
  };
}

export function AffiliateManager({ initial }: { initial?: Payload }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [epc, setEpc] = useState(String(initial?.settings.epc ?? 0));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [slug, setSlug] = useState("");
  const [tools, setTools] = useState<ToolStats[]>(initial?.tools ?? []);
  const [categories, setCategories] = useState<DirectoryCategory[]>(initial?.categories ?? []);
  const [commissions, setCommissions] = useState<Commission[]>(initial?.commissions ?? []);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; slug?: string; draft: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  /** Blocks blur-saves while a trash clear is in flight (stale inputs were re-POSTing old coupons). */
  const suppressInlineSave = useRef(false);
  /** Slugs whose deals were cleared in this session — ignore stale server echoes until they match. */
  const clearedDealSlugs = useRef(new Set<string>());
  const toolsRef = useRef(tools);
  toolsRef.current = tools;

  const load = useCallback(async () => {
    const res = await fetch("/api/affiliates", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Payload;
    const resurrected: string[] = [];
    setTools(
      data.tools.map((tool) => {
        if (!clearedDealSlugs.current.has(tool.slug)) return tool;
        if (!tool.couponCode && !tool.dealText && !tool.couponDiscount) {
          clearedDealSlugs.current.delete(tool.slug);
          return tool;
        }
        // Server still has the old coupon (racing blur-save) — keep UI cleared and re-PATCH.
        resurrected.push(tool.slug);
        return { ...tool, ...EMPTY_DEAL };
      }),
    );
    for (const slug of resurrected) {
      void fetch(`/api/tools/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...EMPTY_DEAL, clearDeal: true }),
      });
    }
    setCategories(data.categories ?? []);
    setCommissions(data.commissions);
    setEpc(String(data.settings.epc));
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const active = hasActiveAffiliate(tool);
      if (filter === "active" && !active) return false;
      if (filter === "pending" && active) return false;
      if (!q) return true;
      const label = categoryLabel(tool.category, categories);
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        tool.affiliateNetwork?.toLowerCase().includes(q) ||
        tool.couponCode?.toLowerCase().includes(q)
      );
    });
  }, [tools, query, filter, categories]);

  async function saveEpc() {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epc: Number(epc) }),
    });
    setStatus(res.ok ? "EPC saved" : "Could not save EPC");
    if (res.ok) void load();
  }

  async function logCommission() {
    const res = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), note, slug: slug || undefined }),
    });
    if (!res.ok) {
      setStatus("Commission not saved");
      return;
    }
    setAmount("");
    setNote("");
    setSlug("");
    setStatus("Commission logged");
    void load();
  }

  async function saveInline(tool: ToolStats, patch: Record<string, string>) {
    if (suppressInlineSave.current) return;
    const latest = toolsRef.current.find((item) => item.slug === tool.slug) ?? tool;
    const body: Record<string, string | number | boolean> = { ...patch };
    if (patch.rating !== undefined) body.rating = Number(patch.rating);
    if (patch.reviewCount !== undefined) body.reviewCount = Number(patch.reviewCount);
    // Blanking any deal field clears the whole package so /deals cannot resurrect a twin field.
    const dealKeys = ["couponCode", "dealText", "couponDiscount", "couponExpires"] as const;
    const touchingDeal = dealKeys.some((key) => key in patch);
    if (touchingDeal) {
      const incomingCode = String(
        "couponCode" in patch ? patch.couponCode : latest.couponCode ?? "",
      ).trim();
      const incomingDeal = String(
        "dealText" in patch
          ? patch.dealText
          : "couponDiscount" in patch
            ? patch.couponDiscount
            : latest.dealText || latest.couponDiscount || "",
      ).trim();
      // After trash-clear, ignore blur that would resurrect the old coupon unless the user typed again.
      if (clearedDealSlugs.current.has(tool.slug)) {
        if (!incomingCode && !incomingDeal) {
          Object.assign(body, EMPTY_DEAL);
          body.clearDeal = true;
        } else {
          // User is intentionally adding a new deal.
          clearedDealSlugs.current.delete(tool.slug);
          body.restoreDeal = true;
        }
      } else if (!incomingCode && !incomingDeal) {
        Object.assign(body, EMPTY_DEAL);
        body.clearDeal = true;
      } else if (incomingCode || incomingDeal) {
        body.restoreDeal = true;
      }
    }
    await fetch(`/api/tools/${tool.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    void load();
  }

  function hasDeal(tool: ToolStats) {
    return Boolean(tool.couponCode || tool.dealText || tool.couponDiscount);
  }

  function patchLocalDeal(slug: string, deal: Partial<typeof EMPTY_DEAL>) {
    setTools((prev) =>
      prev.map((item) => (item.slug === slug ? { ...item, ...deal } : item)),
    );
  }

  function releaseInlineSaveSoon() {
    window.setTimeout(() => {
      suppressInlineSave.current = false;
    }, 300);
  }

  /** Trash clears the deal/coupon when one is set; otherwise removes the tool listing. */
  async function removeDealOrTool(tool: ToolStats) {
    if (hasDeal(tool)) {
      if (!window.confirm(`Remove the deal & coupon from ${tool.name}? The tool listing stays.`)) {
        releaseInlineSaveSoon();
        return;
      }
      suppressInlineSave.current = true;
      clearedDealSlugs.current.add(tool.slug);
      patchLocalDeal(tool.slug, EMPTY_DEAL);
      try {
        const res = await fetch(`/api/tools/${tool.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...EMPTY_DEAL, clearDeal: true }),
        });
        setStatus(res.ok ? `Cleared deal on ${tool.name}` : "Could not clear deal");
        if (!res.ok) clearedDealSlugs.current.delete(tool.slug);
        await load();
      } finally {
        releaseInlineSaveSoon();
      }
      return;
    }
    if (!window.confirm("Delete this tool from the directory? This cannot be undone.")) {
      releaseInlineSaveSoon();
      return;
    }
    suppressInlineSave.current = true;
    try {
      const res = await fetch(`/api/tools/${tool.slug}`, { method: "DELETE" });
      setStatus(res.ok ? `Deleted ${tool.name}` : "Could not delete tool");
      if (res.ok) setTools((prev) => prev.filter((item) => item.slug !== tool.slug));
      await load();
    } finally {
      releaseInlineSaveSoon();
    }
  }

  async function saveModal(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        ...editing.draft,
        rating: Number(editing.draft.rating),
        reviewCount: Number(editing.draft.reviewCount),
      };
      if (editing.mode === "create") {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "manual", ...payload }),
        });
        if (!res.ok) throw new Error("Create failed");
        setStatus(`Added ${editing.draft.name}`);
      } else if (editing.slug) {
        const res = await fetch(`/api/tools/${editing.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Save failed");
        setStatus(`Updated ${editing.draft.name}`);
      }
      setEditing(null);
      await load();
    } catch {
      setStatus("Could not save tool");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = tools.filter((tool) => !hasActiveAffiliate(tool)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Revenue</p>
          <h1 className="mt-1 font-serif text-3xl">Affiliate Links & Tools</h1>
          <p className="mt-1 text-sm text-muted">
            {pendingCount} listing{pendingCount === 1 ? "" : "s"} still need a tracked affiliate URL.
            Public CTAs always go through /go/[slug].
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({ mode: "create", draft: emptyDraft(categories[0]?.slug || "writing-seo") })
          }
          className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink"
        >
          <Plus className="h-4 w-4" />
          Add New Tool / Software
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active", "pending"] as Filter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filter === item
                ? "border-accent bg-accent text-ink"
                : "border-line text-muted hover:text-white"
            }`}
          >
            {item === "all" ? "All" : item === "active" ? "Active Affiliate" : "Pending Affiliate"}
          </button>
        ))}
        <label className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, networks, codes"
            className="h-10 rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none"
          />
        </label>
      </div>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 lg:grid-cols-2">
        <div>
          <h2 className="font-medium">Earnings per click</h2>
          <p className="mt-1 text-sm text-muted">
            Revenue today / MTD = real clicks × EPC + logged commissions.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={epc}
              onChange={(event) => setEpc(event.target.value)}
              className="h-10 w-32 rounded-xl border border-line bg-ink px-3 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void saveEpc()}
              className="rounded-full bg-accent px-4 text-sm font-semibold text-ink"
            >
              Save EPC
            </button>
          </div>
        </div>
        <div>
          <h2 className="font-medium">Log confirmed commission</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              step="0.01"
              placeholder="Amount $"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-xl border border-line bg-ink px-3 text-sm outline-none"
            />
            <select
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="h-10 rounded-xl border border-line bg-ink px-3 text-sm outline-none"
            >
              <option value="">Any tool</option>
              {tools.map((tool) => (
                <option key={tool.slug} value={tool.slug}>
                  {tool.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-10 rounded-xl border border-line bg-ink px-3 text-sm outline-none sm:col-span-2"
            />
          </div>
          <button
            type="button"
            onClick={() => void logCommission()}
            className="mt-3 rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent"
          >
            Add commission
          </button>
        </div>
        {status ? <p className="text-xs text-mint lg:col-span-2">{status}</p> : null}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Affiliate / official</th>
              <th className="px-4 py-3">Network & deal</th>
              <th className="px-4 py-3">Today</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((tool) => {
              const active = hasActiveAffiliate(tool);
              return (
                <tr key={tool.slug} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-xs text-muted">
                      {categoryLabel(tool.category, categories)}
                      {tool.status === "draft" ? " · Draft" : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StarRating rating={tool.rating} />
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        defaultValue={tool.rating}
                        aria-label={`${tool.name} rating`}
                        onBlur={(event) =>
                          void saveInline(tool, { rating: event.target.value })
                        }
                        className="h-7 w-14 rounded-lg border border-line bg-ink px-1.5 text-xs"
                      />
                      <input
                        type="number"
                        min={0}
                        defaultValue={tool.reviewCount}
                        aria-label={`${tool.name} review count`}
                        onBlur={(event) =>
                          void saveInline(tool, { reviewCount: event.target.value })
                        }
                        className="h-7 w-16 rounded-lg border border-line bg-ink px-1.5 text-xs"
                      />
                    </div>
                    <PricingBadge model={tool.pricingModel} />
                    <p className="mt-1 font-mono text-[11px] text-blue">/go/{tool.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        active ? "bg-mint/15 text-mint" : "bg-accent/15 text-accent"
                      }`}
                    >
                      {active ? "Active Affiliate" : "Pending / No Link"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={tool.affiliateUrl}
                      placeholder="Affiliate URL"
                      onBlur={(event) => void saveInline(tool, { affiliateUrl: event.target.value })}
                      className="w-64 rounded-lg border border-line bg-ink px-2 py-1 text-[11px]"
                    />
                    <input
                      defaultValue={tool.officialUrl || tool.website}
                      placeholder="Official URL"
                      onBlur={(event) =>
                        void saveInline(tool, {
                          officialUrl: event.target.value,
                          website: event.target.value,
                        })
                      }
                      className="mt-1 w-64 rounded-lg border border-line bg-ink px-2 py-1 text-[11px] text-muted"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={tool.affiliateNetwork ?? ""}
                      placeholder="PartnerStack"
                      onBlur={(event) => void saveInline(tool, { affiliateNetwork: event.target.value })}
                      className="w-44 rounded-lg border border-line bg-ink px-2 py-1 text-xs"
                    />
                    <input
                      defaultValue={tool.commissionNote ?? ""}
                      placeholder="30% Recurring"
                      onBlur={(event) => void saveInline(tool, { commissionNote: event.target.value })}
                      className="mt-1 w-44 rounded-lg border border-line bg-ink px-2 py-1 text-xs"
                    />
                    <input
                      value={tool.couponCode ?? ""}
                      placeholder="Coupon code"
                      onChange={(event) =>
                        patchLocalDeal(tool.slug, { couponCode: event.target.value })
                      }
                      onBlur={(event) =>
                        void saveInline(tool, { couponCode: event.target.value })
                      }
                      className={`mt-1 w-28 rounded-lg border border-line bg-ink px-2 py-1 font-mono text-xs ${
                        tool.couponCode ? "text-accent" : "text-muted"
                      }`}
                    />
                    <input
                      value={tool.dealText || tool.couponDiscount || ""}
                      placeholder="Deal text"
                      onChange={(event) =>
                        patchLocalDeal(tool.slug, {
                          dealText: event.target.value,
                          couponDiscount: event.target.value,
                        })
                      }
                      onBlur={(event) =>
                        void saveInline(tool, {
                          dealText: event.target.value,
                          couponDiscount: event.target.value,
                        })
                      }
                      className="mt-1 w-44 rounded-lg border border-line bg-ink px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{formatNumber(tool.clicksToday)}</td>
                  <td className="px-4 py-3">{formatNumber(tool.clicksMonth)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/admin/ads?tool=${encodeURIComponent(tool.slug)}`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                      >
                        <Megaphone className="h-3 w-3" />
                        Run Partner Ad
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing({ mode: "edit", slug: tool.slug, draft: fromTool(tool) })}
                        className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        // Prevent input blur-save from firing with the old coupon before trash runs.
                        onMouseDown={() => {
                          suppressInlineSave.current = true;
                        }}
                        onClick={() => void removeDealOrTool(tool)}
                        className="rounded-full p-2 text-muted hover:bg-rose/15 hover:text-rose"
                        aria-label={
                          hasDeal(tool) ? `Remove deal from ${tool.name}` : `Delete ${tool.name}`
                        }
                        title={hasDeal(tool) ? "Remove deal & coupon" : "Delete tool"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Commission log</h2>
        {commissions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No commissions logged. Balance starts at $0.00.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {commissions.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 border-b border-line/60 py-2">
                <span>
                  {item.note}
                  {item.slug ? <span className="text-muted"> · {item.slug}</span> : null}
                </span>
                <span className="text-mint">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 pt-16">
          <form
            onSubmit={(event) => void saveModal(event)}
            className="w-full max-w-2xl space-y-4 rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {editing.mode === "create" ? "Add tool / software" : `Edit ${editing.draft.name}`}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Name"
                value={editing.draft.name}
                onChange={(name) => setEditing({ ...editing, draft: { ...editing.draft, name } })}
                required
              />
              <Field
                label="Slug"
                value={editing.draft.slug}
                onChange={(slugValue) => setEditing({ ...editing, draft: { ...editing.draft, slug: slugValue } })}
              />
              <Field
                label="Official URL"
                value={editing.draft.officialUrl}
                onChange={(officialUrl) => setEditing({ ...editing, draft: { ...editing.draft, officialUrl } })}
                required
              />
              <Field
                label="Affiliate URL"
                value={editing.draft.affiliateUrl}
                onChange={(affiliateUrl) => setEditing({ ...editing, draft: { ...editing.draft, affiliateUrl } })}
              />
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted">Category</span>
                <select
                  value={editing.draft.category}
                  onChange={(event) =>
                    setEditing({ ...editing, draft: { ...editing.draft, category: event.target.value } })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Affiliate network"
                value={editing.draft.affiliateNetwork}
                onChange={(affiliateNetwork) =>
                  setEditing({ ...editing, draft: { ...editing.draft, affiliateNetwork } })
                }
              />
              <Field
                label="Commission note"
                value={editing.draft.commissionNote}
                onChange={(commissionNote) =>
                  setEditing({ ...editing, draft: { ...editing.draft, commissionNote } })
                }
              />
              <Field
                label="Coupon code"
                value={editing.draft.couponCode}
                onChange={(couponCode) => setEditing({ ...editing, draft: { ...editing.draft, couponCode } })}
              />
              <Field
                label="Deal text"
                value={editing.draft.dealText}
                onChange={(dealText) => setEditing({ ...editing, draft: { ...editing.draft, dealText } })}
              />
              <Field
                label="Short pitch"
                value={editing.draft.shortPitch}
                onChange={(shortPitch) => setEditing({ ...editing, draft: { ...editing.draft, shortPitch } })}
              />
              <Field
                label="Rating (1–5)"
                value={editing.draft.rating}
                onChange={(rating) => setEditing({ ...editing, draft: { ...editing.draft, rating } })}
              />
              <Field
                label="Review count"
                value={editing.draft.reviewCount}
                onChange={(reviewCount) => setEditing({ ...editing, draft: { ...editing.draft, reviewCount } })}
              />
              <label className="block text-sm">
                <span className="text-muted">Pricing</span>
                <select
                  value={editing.draft.pricingModel}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, pricingModel: event.target.value as PricingModel },
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  <option>Free</option>
                  <option>Freemium</option>
                  <option>Paid</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.draft.featured}
                  onChange={(event) =>
                    setEditing({ ...editing, draft: { ...editing.draft, featured: event.target.checked } })
                  }
                />
                Featured
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.draft.status === "published"}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, status: event.target.checked ? "published" : "draft" },
                    })
                  }
                />
                Published
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save to database"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
      />
    </label>
  );
}

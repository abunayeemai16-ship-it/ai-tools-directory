"use client";

import { Megaphone, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AD_PLACEMENTS, PARTNERSHIP_TYPES, adCtr, campaignFromTool } from "@/lib/ads";
import type { AdCampaign, AdPlacement, AdStatus, DirectoryCategory, PartnershipType, Tool } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

type ToolOption = Pick<
  Tool,
  | "slug"
  | "name"
  | "category"
  | "status"
  | "affiliateUrl"
  | "officialUrl"
  | "couponCode"
  | "dealText"
  | "commissionNote"
  | "shortPitch"
>;

type AdRow = AdCampaign & { ctr?: number };

type Payload = {
  ads: AdRow[];
  tools: ToolOption[];
  categories: DirectoryCategory[];
};

type Draft = {
  title: string;
  partnerName: string;
  toolSlug: string;
  partnershipType: PartnershipType;
  placement: AdPlacement;
  targetCategory: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  targetUrl: string;
  couponCode: string;
  badgeText: string;
  commissionOrFeeNote: string;
  fixedFeeEarned: string;
  status: AdStatus;
  startDate: string;
  endDate: string;
  alsoPublishTool: boolean;
};

const emptyDraft = (): Draft => ({
  title: "",
  partnerName: "",
  toolSlug: "",
  partnershipType: "Associate Partner (VIP Affiliate %)",
  placement: "hero_banner",
  targetCategory: "",
  headline: "",
  subheadline: "",
  ctaText: "Try Partner Tool Free",
  targetUrl: "",
  couponCode: "",
  badgeText: "Official Associate Partner",
  commissionOrFeeNote: "",
  fixedFeeEarned: "",
  status: "active",
  startDate: "",
  endDate: "",
  alsoPublishTool: false,
});

function fromAd(ad: AdCampaign): Draft {
  return {
    title: ad.title,
    partnerName: ad.partnerName,
    toolSlug: ad.toolSlug,
    partnershipType: ad.partnershipType,
    placement: ad.placement,
    targetCategory: ad.targetCategory,
    headline: ad.headline,
    subheadline: ad.subheadline,
    ctaText: ad.ctaText,
    targetUrl: ad.targetUrl,
    couponCode: ad.couponCode,
    badgeText: ad.badgeText,
    commissionOrFeeNote: ad.commissionOrFeeNote,
    fixedFeeEarned: ad.fixedFeeEarned ? String(ad.fixedFeeEarned) : "",
    status: ad.status,
    startDate: ad.startDate.slice(0, 10),
    endDate: ad.endDate.slice(0, 10),
    alsoPublishTool: false,
  };
}

function draftFromTool(tool: ToolOption): Draft {
    const seed = campaignFromTool(tool);
  return {
    ...emptyDraft(),
    title: seed.title || "",
    partnerName: seed.partnerName || "",
    toolSlug: seed.toolSlug || "",
    partnershipType: seed.partnershipType || "Associate Partner (VIP Affiliate %)",
    placement: seed.placement || "hero_banner",
    targetCategory: seed.targetCategory || "",
    headline: seed.headline || "",
    subheadline: seed.subheadline || "",
    ctaText: seed.ctaText || "Try Partner Tool Free",
    targetUrl: seed.targetUrl || "",
    couponCode: seed.couponCode || "",
    badgeText: seed.badgeText || "Official Associate Partner",
    commissionOrFeeNote: seed.commissionOrFeeNote || "",
  };
}

function placementLabel(value: AdPlacement) {
  return AD_PLACEMENTS.find((item) => item.value === value)?.label || value;
}

function statusTone(status: AdStatus) {
  if (status === "active") return "bg-mint/15 text-mint";
  if (status === "paused") return "bg-accent/15 text-accent";
  return "bg-rose/15 text-rose";
}

export function AdsManager({
  initial,
  initialToolSlug = "",
}: {
  initial: Payload;
  initialToolSlug?: string;
}) {
  const [ads, setAds] = useState<AdRow[]>(initial.ads);
  const [tools, setTools] = useState<ToolOption[]>(initial.tools);
  const [categories, setCategories] = useState<DirectoryCategory[]>(initial.categories);
  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    id?: string;
    draft: Draft;
  } | null>(() => {
    if (!initialToolSlug) return null;
    const tool = initial.tools.find((item) => item.slug === initialToolSlug);
    if (!tool) return null;
    return { mode: "create", draft: draftFromTool(tool) };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ads", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Payload;
      setAds(data.ads);
      setTools(data.tools);
      setCategories(data.categories);
    } catch {
      // Ads poll can fail while the catalog is busy.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);


  const totals = useMemo(() => {
    const impressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const clicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const live = ads.filter((ad) => ad.status === "active").length;
    return { impressions, clicks, live, ctr: impressions ? Math.round((clicks / impressions) * 1000) / 10 : 0 };
  }, [ads]);

  function applyTool(slug: string, current: Draft): Draft {
    const tool = tools.find((item) => item.slug === slug);
    if (!tool) return { ...current, toolSlug: slug, alsoPublishTool: false };
    const seeded = draftFromTool(tool);
    return {
      ...current,
      ...seeded,
      placement: current.placement,
      status: current.status,
      startDate: current.startDate,
      endDate: current.endDate,
      alsoPublishTool: false,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...editing.draft,
        fixedFeeEarned: Number(editing.draft.fixedFeeEarned) || 0,
      };
      const res = await fetch(
        editing.mode === "edit" && editing.id ? `/api/admin/ads/${editing.id}` : "/api/admin/ads",
        {
          method: editing.mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save campaign");
      setEditing(null);
      setNotice(editing.mode === "edit" ? "Campaign updated" : "Campaign launched");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(ad: AdRow, status: AdStatus) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function remove(ad: AdRow) {
    if (!window.confirm(`Delete “${ad.title}”? Real impression and click counts will be removed.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete campaign");
      setNotice("Campaign deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Monetization</p>
          <h1 className="mt-1 font-serif text-3xl">Ad Runs &amp; Partners</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Launch Associate Partner and paid sponsorship placements. Impressions, clicks, and CTR
            are counted from real visitors only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: "create", draft: emptyDraft() })}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Live runs" value={String(totals.live)} />
        <Stat label="Impressions" value={formatNumber(totals.impressions)} />
        <Stat label="Clicks" value={formatNumber(totals.clicks)} />
        <Stat label="CTR" value={`${totals.ctr}%`} />
      </div>

      {notice ? <p className="text-sm text-mint">{notice}</p> : null}
      {error ? <p className="text-sm text-rose">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Impr.</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">CTR</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ads.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted">
                  No campaigns yet. Create one when a vendor makes you an Associate Partner or
                  pays for a sponsored run.
                </td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr key={ad.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium">{ad.title}</p>
                    <p className="text-xs text-muted">
                      {ad.partnerName}
                      {ad.toolSlug ? ` · /tool/${ad.toolSlug}` : " · external partner"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{placementLabel(ad.placement)}</td>
                  <td className="px-4 py-3 text-xs">{ad.partnershipType}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(ad.status)}`}>
                      {ad.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatNumber(ad.impressions)}</td>
                  <td className="px-4 py-3">{formatNumber(ad.clicks)}</td>
                  <td className="px-4 py-3">{adCtr(ad)}%</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {ad.status === "active" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void setStatus(ad, "paused")}
                          className="rounded-full p-2 text-muted hover:text-accent"
                          aria-label={`Pause ${ad.title}`}
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void setStatus(ad, "active")}
                          className="rounded-full p-2 text-muted hover:text-mint"
                          aria-label={`Resume ${ad.title}`}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing({ mode: "edit", id: ad.id, draft: fromAd(ad) })}
                        className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(ad)}
                        className="rounded-full p-2 text-muted hover:bg-rose/15 hover:text-rose"
                        aria-label={`Delete ${ad.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 pt-12">
          <form
            onSubmit={(event) => void save(event)}
            className="w-full max-w-3xl space-y-4 rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-2xl">
                <Megaphone className="h-5 w-5 text-accent" />
                {editing.mode === "create" ? "New partner campaign" : "Edit campaign"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Campaign title"
                value={editing.draft.title}
                onChange={(title) => setEditing({ ...editing, draft: { ...editing.draft, title } })}
                required
              />
              <Field
                label="Partner name"
                value={editing.draft.partnerName}
                onChange={(partnerName) =>
                  setEditing({ ...editing, draft: { ...editing.draft, partnerName } })
                }
                required
              />
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted">Link existing directory tool</span>
                <select
                  value={editing.draft.toolSlug}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: applyTool(event.target.value, editing.draft),
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  <option value="">External partner (not listed yet)</option>
                  {tools.map((tool) => (
                    <option key={tool.slug} value={tool.slug}>
                      {tool.name} {tool.status === "draft" ? "(draft)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!editing.draft.toolSlug ? (
                <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editing.draft.alsoPublishTool}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, alsoPublishTool: event.target.checked },
                      })
                    }
                  />
                  Also add / publish this partner as a directory tool
                </label>
              ) : null}
              <label className="block text-sm">
                <span className="text-muted">Partnership type</span>
                <select
                  value={editing.draft.partnershipType}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: {
                        ...editing.draft,
                        partnershipType: event.target.value as PartnershipType,
                      },
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  {PARTNERSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted">Placement</span>
                <select
                  value={editing.draft.placement}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, placement: event.target.value as AdPlacement },
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  {AD_PLACEMENTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {editing.draft.placement === "category_sponsor" ? (
                <label className="block text-sm sm:col-span-2">
                  <span className="text-muted">Target category</span>
                  <select
                    value={editing.draft.targetCategory}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        draft: { ...editing.draft, targetCategory: event.target.value },
                      })
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Field
                label="Headline"
                value={editing.draft.headline}
                onChange={(headline) =>
                  setEditing({ ...editing, draft: { ...editing.draft, headline } })
                }
                required
              />
              <Field
                label="CTA text"
                value={editing.draft.ctaText}
                onChange={(ctaText) =>
                  setEditing({ ...editing, draft: { ...editing.draft, ctaText } })
                }
              />
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted">Subheadline</span>
                <textarea
                  value={editing.draft.subheadline}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, subheadline: event.target.value },
                    })
                  }
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none"
                />
              </label>
              <Field
                label="Affiliate / partner URL"
                value={editing.draft.targetUrl}
                onChange={(targetUrl) =>
                  setEditing({ ...editing, draft: { ...editing.draft, targetUrl } })
                }
                required={!editing.draft.toolSlug && !editing.draft.alsoPublishTool}
              />
              <Field
                label="Coupon code"
                value={editing.draft.couponCode}
                onChange={(couponCode) =>
                  setEditing({ ...editing, draft: { ...editing.draft, couponCode } })
                }
              />
              <Field
                label="Badge text"
                value={editing.draft.badgeText}
                onChange={(badgeText) =>
                  setEditing({ ...editing, draft: { ...editing.draft, badgeText } })
                }
              />
              <Field
                label="Commission or fee note"
                value={editing.draft.commissionOrFeeNote}
                onChange={(commissionOrFeeNote) =>
                  setEditing({ ...editing, draft: { ...editing.draft, commissionOrFeeNote } })
                }
              />
              {editing.draft.partnershipType === "Paid Sponsorship ($)" ? (
                <Field
                  label="Fixed fee earned ($)"
                  value={editing.draft.fixedFeeEarned}
                  onChange={(fixedFeeEarned) =>
                    setEditing({ ...editing, draft: { ...editing.draft, fixedFeeEarned } })
                  }
                />
              ) : null}
              <label className="block text-sm">
                <span className="text-muted">Status</span>
                <select
                  value={editing.draft.status}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      draft: { ...editing.draft, status: event.target.value as AdStatus },
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="ended">ended</option>
                </select>
              </label>
              <Field
                label="Start date (optional)"
                value={editing.draft.startDate}
                onChange={(startDate) =>
                  setEditing({ ...editing, draft: { ...editing.draft, startDate } })
                }
                type="date"
              />
              <Field
                label="End date (optional, auto-expires)"
                value={editing.draft.endDate}
                onChange={(endDate) =>
                  setEditing({ ...editing, draft: { ...editing.draft, endDate } })
                }
                type="date"
              />
            </div>

            {error ? <p className="text-sm text-rose">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save campaign"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none"
      />
    </label>
  );
}

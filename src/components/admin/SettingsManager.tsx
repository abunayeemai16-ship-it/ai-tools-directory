"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, KeyRound, Loader2, Shield, Trash2 } from "lucide-react";
import type { GeminiKeyPublic } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusLabel: Record<GeminiKeyPublic["status"], string> = {
  active: "Active",
  quota_exceeded: "Quota Exceeded",
  invalid: "Invalid",
};

function badgeClass(key: GeminiKeyPublic) {
  if (!key.enabled) return "bg-surface-2 text-muted";
  if (key.status === "active") return "bg-mint/15 text-mint";
  if (key.status === "quota_exceeded") return "bg-accent/15 text-accent";
  return "bg-rose/15 text-rose";
}

function usedLabel(value: string | null) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function SettingsManager({ initialKeys }: { initialKeys: GeminiKeyPublic[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [serperApiKey, setSerperApiKey] = useState("");
  const [googleCseKey, setGoogleCseKey] = useState("");
  const [googleCseCx, setGoogleCseCx] = useState("");
  const [homeSeoTitle, setHomeSeoTitle] = useState("");
  const [homeSeoDescription, setHomeSeoDescription] = useState("");
  const [serperMasked, setSerperMasked] = useState("");
  const [cseMasked, setCseMasked] = useState("");

  const load = useCallback(async () => {
    const [keysRes, settingsRes] = await Promise.all([
      fetch("/api/admin/keys", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    if (keysRes.ok) {
      const data = (await keysRes.json()) as { keys?: GeminiKeyPublic[] };
      setKeys(data.keys ?? []);
    }
    if (settingsRes.ok) {
      const data = (await settingsRes.json()) as {
        siteDomain?: string;
        homeSeoTitle?: string;
        homeSeoDescription?: string;
        serperMasked?: string;
        cseMasked?: string;
        cseCx?: string;
      };
      setSiteDomain(data.siteDomain || "");
      setHomeSeoTitle(data.homeSeoTitle || "");
      setHomeSeoDescription(data.homeSeoDescription || "");
      setSerperMasked(data.serperMasked || "");
      setCseMasked(data.cseMasked || "");
      setGoogleCseCx(data.cseCx || "");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(ok: string, fail?: string) {
    if (fail) {
      setError(fail);
      setNotice("");
    } else {
      setNotice(ok);
      setError("");
    }
  }

  async function addKey(event: React.FormEvent) {
    event.preventDefault();
    setBusy("add");
    setError("");
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, key: apiKey }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not save key");
      setLabel("");
      setApiKey("");
      flash("API key saved to data/db.json");
      await load();
    } catch (err) {
      flash("", err instanceof Error ? err.message : "Could not save key");
    } finally {
      setBusy(null);
    }
  }

  async function toggleKey(key: GeminiKeyPublic) {
    setBusy(key.id);
    try {
      const res = await fetch(`/api/admin/keys/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !key.enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await load();
    } catch (err) {
      flash("", err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(null);
    }
  }

  async function testKey(id: string) {
    setBusy(`test-${id}`);
    setError("");
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: "POST" });
      const payload = (await res.json()) as GeminiKeyPublic & { error?: string };
      if (!res.ok) throw new Error(payload.error || "Test failed");
      if (payload.status === "active") {
        flash(`${payload.label} reached Gemini 2.5 Flash`);
      } else {
        flash("", `${payload.label}: ${payload.lastError || statusLabel[payload.status]}`);
      }
      await load();
    } catch (err) {
      flash("", err instanceof Error ? err.message : "Test failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function removeKey(id: string) {
    setBusy(`del-${id}`);
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      flash("Key deleted");
      await load();
    } catch (err) {
      flash("", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (nextPassword !== confirmPassword) {
      flash("", "New passwords do not match");
      return;
    }
    setBusy("password");
    try {
      const res = await fetch("/api/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPassword, next: nextPassword }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not change password");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      flash("Admin password updated. Other sessions were signed out.");
    } catch (err) {
      flash("", err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Control plane</p>
        <h1 className="mt-1 font-serif text-3xl">API Keys & Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Gemini keys and the admin password live in <code className="text-accent">data/db.json</code>.
          Calls to gemini-2.5-flash rotate across active keys and fail over on 429 or errors.
        </p>
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <h2 className="font-medium">Gemini API key manager</h2>
        </div>

        <form
          onSubmit={(event) => void addKey(event)}
          className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_2fr_auto]"
        >
          <label className="text-sm">
            <span className="text-muted">Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder='Key 1 - Personal'
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">API key</span>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="AIza..."
              autoComplete="off"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "add"}
            className="self-end rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "add" ? "Saving…" : "Add key"}
          </button>
        </form>

        {keys.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
            No keys yet. Add at least one Gemini key so AI Studio and auto-draft can call 2.5 Flash.
          </p>
        ) : (
          <ul className="space-y-3">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{key.label}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", badgeClass(key))}>
                      {key.enabled ? statusLabel[key.status] : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm text-muted">{key.maskedKey}</p>
                  <p className="mt-1 text-xs text-muted">
                    {key.usageCount} uses · last used {usedLabel(key.lastUsedAt)}
                    {key.lastError ? ` · ${key.lastError}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleKey(key)}
                    disabled={busy === key.id}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-white"
                  >
                    {key.enabled ? "Set inactive" : "Set active"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void testKey(key.id)}
                    disabled={busy === `test-${key.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-white"
                  >
                    {busy === `test-${key.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Test key
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeKey(key.id)}
                    disabled={busy === `del-${key.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-rose/30 px-3 py-1.5 text-xs text-rose"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <h2 className="font-medium">Web SEO & rank tracking</h2>
        </div>
        <p className="text-sm text-muted">
          Production domain plus an optional free{" "}
          <a className="text-accent" href="https://serper.dev" target="_blank" rel="noreferrer">
            Serper.dev
          </a>{" "}
          key (or Google Custom Search) unlock live SERP checks. Keys stay in data/db.json — never dummy ranks.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy("seo");
            setError("");
            try {
              const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  siteDomain,
                  homeSeoTitle,
                  homeSeoDescription,
                  googleCseCx,
                  ...(serperApiKey ? { serperApiKey } : {}),
                  ...(googleCseKey ? { googleCseKey } : {}),
                }),
              });
              if (!res.ok) throw new Error("Could not save SEO settings");
              setSerperApiKey("");
              setGoogleCseKey("");
              flash("SEO settings saved");
              await load();
            } catch (err) {
              flash("", err instanceof Error ? err.message : "Could not save SEO settings");
            } finally {
              setBusy(null);
            }
          }}
          className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2"
        >
          <label className="text-sm sm:col-span-2">
            <span className="text-muted">Production domain</span>
            <input
              value={siteDomain}
              onChange={(event) => setSiteDomain(event.target.value)}
              placeholder="myaidirectory.com"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted">Homepage SEO title</span>
            <input
              value={homeSeoTitle}
              onChange={(event) => setHomeSeoTitle(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted">Homepage meta description</span>
            <textarea
              value={homeSeoDescription}
              onChange={(event) => setHomeSeoDescription(event.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Serper.dev API key {serperMasked ? `(saved ${serperMasked})` : ""}</span>
            <input
              value={serperApiKey}
              onChange={(event) => setSerperApiKey(event.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">Google CSE key {cseMasked ? `(saved ${cseMasked})` : ""}</span>
            <input
              value={googleCseKey}
              onChange={(event) => setGoogleCseKey(event.target.value)}
              placeholder="Optional fallback"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-muted">Google CSE cx</span>
            <input
              value={googleCseCx}
              onChange={(event) => setGoogleCseCx(event.target.value)}
              placeholder="Search engine ID"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "seo"}
            className="sm:col-span-2 w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "seo" ? "Saving…" : "Save SEO settings"}
          </button>
        </form>
      </section>

      <section className="max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h2 className="font-medium">Admin password</h2>
        </div>
        <form
          onSubmit={(event) => void changePassword(event)}
          className="space-y-3 rounded-2xl border border-line bg-surface p-4"
        >
          <label className="block text-sm">
            <span className="text-muted">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">New password</span>
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              minLength={8}
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "password"}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "password" ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}

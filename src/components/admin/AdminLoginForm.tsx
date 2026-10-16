"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const text = await res.text();
      let payload: { error?: string; ok?: boolean } = {};
      if (text) {
        try {
          payload = JSON.parse(text) as { error?: string; ok?: boolean };
        } catch {
          throw new Error("Login failed. The server did not return JSON.");
        }
      }
      if (!res.ok) {
        throw new Error(payload.error || (text ? "Incorrect password" : "Login failed. Try again."));
      }
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-[0_0_80px_rgba(255,176,32,0.08)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-ink">
          <Lock className="h-4 w-4" />
        </span>
        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted">Forge Admin</p>
        <h1 className="mt-1 font-serif text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Cookie session. Default password until you change it in API Keys &amp; Settings.
        </p>
        <label className="mt-6 block text-sm">
          <span className="text-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue
        </button>
      </form>
    </div>
  );
}

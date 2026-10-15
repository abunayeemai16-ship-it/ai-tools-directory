"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DirectoryCategory } from "@/lib/types";

type Row = DirectoryCategory & { toolCount: number };

export function CategoriesManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { categories?: Row[] };
    setRows(data.categories ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not add category");
      setName("");
      setSlug("");
      setNotice("Category saved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${editing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, slug: editing.slug }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not update");
      setEditing(null);
      setNotice("Category updated. Tools using it were remapped if the slug changed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete “${row.name}”? Tools in this category will be moved.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${row.slug}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not delete");
      setNotice(`Deleted ${row.name}. Tools were moved to another category.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Taxonomy</p>
        <h1 className="mt-1 font-serif text-3xl">Categories</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          These names power the public filter chips, AI Studio, submissions, and
          every tool record in data/db.json.
        </p>
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}

      <form
        onSubmit={(event) => void add(event)}
        className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="text-sm">
          <span className="text-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Legal & Compliance"
            required
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Slug (optional)</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="legal-compliance"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-end inline-flex items-center justify-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.slug}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center"
          >
            {editing?.slug === row.slug ? (
              <form onSubmit={(event) => void saveEdit(event)} className="flex flex-1 flex-wrap gap-2">
                <input
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  className="h-10 min-w-[160px] flex-1 rounded-xl border border-line bg-ink px-3 text-sm outline-none"
                />
                <input
                  value={editing.slug}
                  onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
                  className="h-10 min-w-[140px] rounded-xl border border-line bg-ink px-3 font-mono text-sm outline-none"
                />
                <button type="submit" className="rounded-full bg-accent px-3 text-sm font-semibold text-ink">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-line px-3 text-sm text-muted"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.name}</p>
                  <p className="font-mono text-xs text-muted">{row.slug}</p>
                </div>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                  {row.toolCount} tool{row.toolCount === 1 ? "" : "s"}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="rounded-full border border-line p-2 text-muted hover:text-white"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    className="rounded-full border border-rose/30 p-2 text-rose"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

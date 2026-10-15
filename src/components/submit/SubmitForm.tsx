"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { DirectoryCategory, ListingTier, PricingModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubmitForm({ categories }: { categories: DirectoryCategory[] }) {
  const [tier, setTier] = useState<ListingTier>("free");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setStatus("saving");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          website: form.get("website"),
          category: form.get("category"),
          pitch: form.get("pitch"),
          pricingModel: form.get("pricingModel") as PricingModel,
          email: form.get("email"),
          tier,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setMessage(
        tier === "featured"
          ? "Featured listing queued. We will email invoice details for the $49 boost."
          : "Submitted. Reviews typically take 2–4 business days.",
      );
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Could not submit right now. Try again in a moment.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-mint/30 bg-mint/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-mint" />
        <h2 className="mt-3 font-serif text-2xl">You are in the queue</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <button
          type="button"
          className="mt-6 rounded-full border border-line px-4 py-2 text-sm"
          onClick={() => setStatus("idle")}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTier("free")}
          className={cn(
            "rounded-2xl border p-5 text-left transition",
            tier === "free" ? "border-accent bg-accent/10" : "border-line bg-surface",
          )}
        >
          <p className="text-sm text-muted">Standard listing</p>
          <p className="mt-1 font-serif text-2xl">Free</p>
          <p className="mt-2 text-sm text-muted">Editorial review. Appears if approved.</p>
        </button>
        <button
          type="button"
          onClick={() => setTier("featured")}
          className={cn(
            "rounded-2xl border p-5 text-left transition",
            tier === "featured" ? "border-accent bg-accent/10" : "border-line bg-surface",
          )}
        >
          <p className="inline-flex items-center gap-1 text-sm text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Featured
          </p>
          <p className="mt-1 font-serif text-2xl">$49</p>
          <p className="mt-2 text-sm text-muted">
            Homepage badge, comparison priority, 30-day deal slot.
          </p>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tool name" name="name" placeholder="Northstar AI" required />
        <Field label="Website" name="website" type="url" placeholder="https://" required />
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Category</span>
          <select
            name="category"
            required
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none"
            defaultValue={categories[0]?.slug}
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Pricing model</span>
          <select
            name="pricingModel"
            required
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none"
            defaultValue="Freemium"
          >
            <option>Free</option>
            <option>Freemium</option>
            <option>Paid</option>
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">Short pitch</span>
        <textarea
          name="pitch"
          required
          rows={4}
          placeholder="One or two sentences on who it is for and what it uniquely does."
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none"
        />
      </label>
      <Field label="Founder email" name="email" type="email" placeholder="you@company.com" required />

      {status === "error" ? <p className="text-sm text-rose">{message}</p> : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-2 disabled:opacity-60"
      >
        {status === "saving"
          ? "Submitting…"
          : tier === "featured"
            ? "Submit featured listing · $49"
            : "Submit for free listing"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none"
      />
    </label>
  );
}

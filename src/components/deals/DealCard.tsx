"use client";

import { Check, Copy, Ticket } from "lucide-react";
import { useState } from "react";
import { categoryLabel } from "@/lib/categories";
import type { DirectoryCategory, Tool } from "@/lib/types";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { PricingBadge } from "@/components/tools/PricingBadge";

export function DealCard({
  tool,
  categories = [],
}: {
  tool: Tool;
  categories?: DirectoryCategory[];
}) {
  const [copied, setCopied] = useState(false);

  async function copyAndVisit() {
    if (tool.couponCode) {
      try {
        await navigator.clipboard.writeText(tool.couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(true);
      }
    }
    window.location.href = `/go/${tool.slug}`;
  }

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToolLogo name={tool.name} category={tool.category} color={tool.brandColor} />
          <div>
            <h3 className="font-semibold">{tool.name}</h3>
            <p className="text-xs text-muted">{categoryLabel(tool.category, categories)}</p>
          </div>
        </div>
        <PricingBadge model={tool.pricingModel} />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{tool.shortPitch}</p>
      <div className="mt-4 rounded-xl border border-dashed border-accent/40 bg-accent/8 px-3 py-3">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-accent">
          <Ticket className="h-3.5 w-3.5" />
          Coupon
        </p>
        <p className="mt-1 font-mono text-lg tracking-wide">{tool.couponCode}</p>
        <p className="text-sm text-mint">{tool.dealText || tool.couponDiscount}</p>
        {tool.couponExpires ? (
          <p className="mt-1 text-xs text-muted">Expires {tool.couponExpires}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={copyAndVisit}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-2"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied — sending you over" : "Copy Coupon & Visit"}
      </button>
    </article>
  );
}

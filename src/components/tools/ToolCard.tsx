import Link from "next/link";
import { BadgeCheck, Sparkles } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import type { DirectoryCategory, Tool } from "@/lib/types";
import { formatNumber, starsLabel } from "@/lib/utils";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import { PricingBadge } from "@/components/tools/PricingBadge";
import { StarRating } from "@/components/tools/StarRating";
import { ToolLogo } from "@/components/tools/ToolLogo";

export function ToolCard({
  tool,
  categories = [],
  spotlight = false,
  spotlightLabel = "Partner Spotlight",
}: {
  tool: Tool;
  categories?: DirectoryCategory[];
  spotlight?: boolean;
  spotlightLabel?: string;
}) {
  return (
    <article
      className={`group flex flex-col rounded-2xl border bg-surface p-5 transition ${
        spotlight
          ? "border-accent/60 shadow-[0_0_28px_rgba(255,176,32,0.22)] ring-1 ring-accent/40"
          : "border-line hover:border-accent/40 hover:bg-surface-2"
      }`}
    >
      <div className="flex items-start gap-3">
        <ToolLogo name={tool.name} category={tool.category} color={tool.brandColor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/tool/${tool.slug}`} className="truncate text-base font-semibold hover:text-accent">
              {tool.name}
            </Link>
            {spotlight ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-ink">
                <Sparkles className="h-3 w-3" />
                {spotlightLabel}
              </span>
            ) : tool.featured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                <BadgeCheck className="h-3 w-3" />
                Featured
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PricingBadge model={tool.pricingModel} />
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              {categoryLabel(tool.category, categories)}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 flex-1 text-sm leading-6 text-muted">
        {tool.shortPitch}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <StarRating rating={tool.rating} />
          <span className="font-medium">{starsLabel(tool.rating)}</span>
          <span className="text-xs text-muted">({formatNumber(tool.reviewCount)})</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <AffiliateButton slug={tool.slug} className="flex-1" />
        <Link
          href={`/tool/${tool.slug}`}
          className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-white/20 hover:text-white"
        >
          Review
        </Link>
      </div>
    </article>
  );
}

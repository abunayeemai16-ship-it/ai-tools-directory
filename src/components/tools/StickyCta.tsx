"use client";

import { AdImpression } from "@/components/ads/AdImpression";
import { PartnerSidebar } from "@/components/ads/PartnerSidebar";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import type { AdCampaign, DirectoryCard } from "@/lib/types";
import { ToolLogo } from "@/components/tools/ToolLogo";

export function StickyCta({ tool, promos = [] }: { tool: DirectoryCard; promos?: AdCampaign[] }) {
  return (
    <>
      <AdImpression ids={promos.map((ad) => ad.id)} />
      <div className="pb-20 lg:hidden">
        <PartnerSidebar ads={promos} track={false} />
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_0_0_1px_rgba(255,176,32,0.08)]">
            <div className="flex items-center gap-3">
              <ToolLogo name={tool.name} category={tool.category} color={tool.brandColor} size="sm" />
              <div>
                <p className="font-semibold">{tool.name}</p>
                <p className="text-xs text-muted">{tool.pricingModel} · {tool.rating.toFixed(1)}★</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{tool.bestFor}</p>
            <AffiliateButton
              slug={tool.slug}
              label="Visit Website / Claim Deal"
              className="mt-4 w-full"
            />
            {tool.couponCode ? (
              <p className="mt-3 text-center text-xs text-mint">
                Code {tool.couponCode} · {tool.dealText || tool.couponDiscount}
              </p>
            ) : null}
            <p className="mt-3 text-center text-[11px] text-muted">
              We may earn a commission. Rankings are editorial.
            </p>
          </div>
          <PartnerSidebar ads={promos} track={false} />
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 p-3 backdrop-blur lg:hidden">
        <AffiliateButton
          slug={tool.slug}
          label="Visit Website / Claim Deal"
          className="w-full"
        />
      </div>
    </>
  );
}

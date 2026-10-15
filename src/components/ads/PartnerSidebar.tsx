import { ArrowUpRight, Megaphone } from "lucide-react";
import { AdImpression } from "@/components/ads/AdImpression";
import { CouponCopy } from "@/components/ads/CouponCopy";
import type { AdCampaign } from "@/lib/types";

export function PartnerSidebar({ ads, track = true }: { ads: AdCampaign[]; track?: boolean }) {
  if (!ads.length) return null;
  return (
    <div className="space-y-3">
      {track ? <AdImpression ids={ads.map((ad) => ad.id)} /> : null}
      {ads.map((ad) => (
        <article
          key={ad.id}
          className="rounded-2xl border border-accent/35 bg-gradient-to-b from-[#1a1408] to-surface p-5"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
            <Megaphone className="h-3 w-3" />
            {ad.badgeText || "Partner Promo"}
          </span>
          <h3 className="mt-3 font-serif text-xl text-white">{ad.headline}</h3>
          {ad.subheadline ? (
            <p className="mt-1 text-sm leading-6 text-muted">{ad.subheadline}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted">{ad.partnerName}</p>
          {ad.couponCode ? <CouponCopy code={ad.couponCode} className="mt-3" /> : null}
          <a
            href={`/go/ad/${ad.id}`}
            rel="nofollow sponsored"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent-2"
          >
            {ad.ctaText || "Claim Partner Deal"}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </article>
      ))}
    </div>
  );
}

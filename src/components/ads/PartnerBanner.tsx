import { ArrowUpRight, Sparkles } from "lucide-react";
import { AdImpression } from "@/components/ads/AdImpression";
import { CouponCopy } from "@/components/ads/CouponCopy";
import type { AdCampaign } from "@/lib/types";

export function PartnerBanner({ ads }: { ads: AdCampaign[] }) {
  if (!ads.length) return null;
  return (
    <div className="space-y-3">
      <AdImpression ids={ads.map((ad) => ad.id)} />
      {ads.map((ad) => (
        <article
          key={ad.id}
          className="relative overflow-hidden rounded-2xl border border-accent/35 bg-gradient-to-r from-[#1a1408] via-ink-2 to-[#24180a] p-5 shadow-[0_0_40px_rgba(255,176,32,0.12)] sm:p-6"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-accent uppercase">
                <Sparkles className="h-3 w-3" />
                {ad.badgeText || "Sponsored"}
              </span>
              <h3 className="mt-2 font-serif text-2xl tracking-tight text-white sm:text-3xl">
                {ad.headline}
              </h3>
              {ad.subheadline ? (
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{ad.subheadline}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {ad.partnerName}
                {ad.partnershipType ? ` · ${ad.partnershipType}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              {ad.couponCode ? <CouponCopy code={ad.couponCode} /> : null}
              <a
                href={`/go/ad/${ad.id}`}
                rel="nofollow sponsored"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-2"
              >
                {ad.ctaText || "Try Partner Tool Free"}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

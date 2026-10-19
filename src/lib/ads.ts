import type { AdCampaign, AdPlacement, Tool } from "@/lib/types";

export const PARTNERSHIP_TYPES: AdCampaign["partnershipType"][] = [
  "Associate Partner (VIP Affiliate %)",
  "Paid Sponsorship ($)",
  "Featured Exchange",
];

export const AD_PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: "hero_banner", label: "Hero banner (homepage spotlight)" },
  { value: "pinned_grid", label: "Pinned #1 card in directory grid" },
  { value: "category_sponsor", label: "Category sponsor banner" },
  { value: "review_sidebar", label: "Review page partner promo" },
];

export function adCtr(ad: Pick<AdCampaign, "impressions" | "clicks">) {
  if (!ad.impressions) return 0;
  return Math.round((ad.clicks / ad.impressions) * 1000) / 10;
}

/** Paid through the Advertise page and still waiting for the admin to activate it. */
export function isNewPaidBooking(ad: Pick<AdCampaign, "paymentRef" | "status" | "endDate">) {
  return Boolean(ad.paymentRef) && ad.status === "paused" && !ad.endDate;
}

export function isAdLive(ad: AdCampaign, now = Date.now()) {
  if (ad.status !== "active") return false;
  if (ad.startDate) {
    const start = new Date(ad.startDate).getTime();
    if (Number.isFinite(start) && start > now) return false;
  }
  if (ad.endDate) {
    const end = new Date(ad.endDate).getTime();
    if (Number.isFinite(end) && end < now) return false;
  }
  return Boolean(ad.targetUrl?.trim());
}

export function campaignFromTool(
  tool: Pick<Tool, "name" | "slug" | "category" | "shortPitch"> & {
    dealText?: string;
    affiliateUrl?: string;
    officialUrl?: string;
    website?: string;
    couponCode?: string;
    commissionNote?: string;
  },
): Partial<AdCampaign> {
  return {
    title: `${tool.name} Partner Spotlight`,
    partnerName: tool.name,
    toolSlug: tool.slug,
    partnershipType: "Associate Partner (VIP Affiliate %)",
    placement: "hero_banner",
    targetCategory: tool.category,
    headline: `Official Associate Partner: ${tool.name}`,
    subheadline: tool.dealText || tool.shortPitch,
    ctaText: "Try Partner Tool Free",
    targetUrl: tool.affiliateUrl || tool.officialUrl || tool.website || "",
    couponCode: tool.couponCode || "",
    badgeText: "Official Associate Partner",
    commissionOrFeeNote: tool.commissionNote || "",
    status: "active",
  };
}

/** Strips buyer contact and payment references before an ad is sent to the browser. */
export function publicAd(ad: AdCampaign): AdCampaign {
  const copy: AdCampaign = { ...ad, commissionOrFeeNote: "" };
  delete copy.paymentRef;
  delete copy.contactEmail;
  return copy;
}

export function liveAds(ads: AdCampaign[], placement?: AdPlacement, category?: string) {
  return ads
    .filter((ad) => {
      if (!isAdLive(ad)) return false;
      if (placement && ad.placement !== placement) return false;
      if (placement === "category_sponsor" && category && ad.targetCategory !== category) {
        return false;
      }
      return true;
    })
    .map(publicAd);
}

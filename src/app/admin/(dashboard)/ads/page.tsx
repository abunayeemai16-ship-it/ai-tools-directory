import type { Metadata } from "next";
import { AdsManager } from "@/components/admin/AdsManager";
import { adCtr } from "@/lib/ads";
import { listAds, listAllTools, listCategories } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Ad Runs & Partners",
};

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  await live();
  const [{ tool: initialToolSlug }, ads, tools, categories] = await Promise.all([
    searchParams,
    listAds(),
    listAllTools(),
    listCategories(),
  ]);
  return (
    <AdsManager
      initialToolSlug={initialToolSlug || ""}
      initial={{
        ads: ads.map((ad) => ({ ...ad, ctr: adCtr(ad) })),
        tools: tools.map((item) => ({
          slug: item.slug,
          name: item.name,
          category: item.category,
          status: item.status,
          affiliateUrl: item.affiliateUrl,
          officialUrl: item.officialUrl || item.website,
          couponCode: item.couponCode || "",
          dealText: item.dealText || "",
          commissionNote: item.commissionNote || "",
          shortPitch: item.shortPitch,
        })),
        categories,
      }}
    />
  );
}

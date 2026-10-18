import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/public-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { base, toolSlugs, comparisonSlugs } = await getSitemapData();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/deals`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/advertise`, changeFrequency: "monthly", priority: 0.5 },
    ...toolSlugs.map((slug) => ({
      url: `${base}/tool/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...comparisonSlugs.map((slug) => ({
      url: `${base}/compare/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

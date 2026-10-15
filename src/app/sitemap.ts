import type { MetadataRoute } from "next";
import { listComparisons, listTools, readDb } from "@/lib/db";
import { live } from "@/lib/live";
import { siteOrigin } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await live();
  const [db, tools, comparisons] = await Promise.all([
    readDb(),
    listTools(),
    listComparisons(),
  ]);
  const base = siteOrigin(db.settings.siteDomain);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/compare`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/deals`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.5 },
    ...tools.map((tool) => ({
      url: `${base}/tool/${tool.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...comparisons.map((item) => ({
      url: `${base}/compare/${item.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

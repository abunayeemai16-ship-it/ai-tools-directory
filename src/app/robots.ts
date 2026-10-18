import type { MetadataRoute } from "next";
import { getSiteBase } from "@/lib/public-data";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteBase();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

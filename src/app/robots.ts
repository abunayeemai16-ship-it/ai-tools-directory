import type { MetadataRoute } from "next";
import { readDb } from "@/lib/db";
import { live } from "@/lib/live";
import { siteOrigin } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await live();
  const db = await readDb();
  const base = siteOrigin(db.settings.siteDomain);
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

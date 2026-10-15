import type { Metadata } from "next";
import { SeoManager } from "@/components/admin/SeoManager";
import {
  getFeaturedTools,
  getRankChecks,
  listCategories,
  listComparisons,
  listTools,
  publicSeoSettings,
  readDb,
} from "@/lib/db";
import { live } from "@/lib/live";
import { auditComparisonPage, auditHomepage, auditToolPage } from "@/lib/seo";
import { isLocalOrUnsetDomain, siteOrigin } from "@/lib/site";

export const instant = false;

export const metadata: Metadata = {
  title: "Web SEO",
};

export default async function SeoPage() {
  await live();
  const [db, tools, comparisons, featured, categories, rankChecks] = await Promise.all([
    readDb(),
    listTools(),
    listComparisons(),
    getFeaturedTools(),
    listCategories(),
    getRankChecks(),
  ]);
  const settings = publicSeoSettings(db.settings);
  const pages = [
    auditHomepage({
      title: settings.homeSeoTitle,
      description: settings.homeSeoDescription,
      toolCount: tools.length,
      featuredCount: featured.length,
      categoryCount: categories.length,
    }),
    ...tools.map((tool) => auditToolPage(tool)),
    ...comparisons.map((item) => {
      const toolA = tools.find((tool) => tool.slug === item.toolASlug);
      const toolB = tools.find((tool) => tool.slug === item.toolBSlug);
      return auditComparisonPage(item, toolA, toolB);
    }),
  ].sort((a, b) => a.score - b.score);

  return (
    <SeoManager
      initial={{
        pages,
        rankChecks,
        settings,
        local: isLocalOrUnsetDomain(settings.siteDomain),
        publicOrigin: siteOrigin(settings.siteDomain),
        index: {
          sitemapOk: true,
          robotsOk: true,
          sitemapUrls: 4 + tools.length + comparisons.length,
          sitemapPath: "/sitemap.xml",
          robotsPath: "/robots.txt",
        },
      }}
    />
  );
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  getFeaturedTools,
  getRankChecks,
  listCategories,
  listComparisons,
  listTools,
  publicSeoSettings,
  readDb,
} from "@/lib/db";
import { auditComparisonPage, auditHomepage, auditToolPage } from "@/lib/seo";
import { isLocalOrUnsetDomain, siteOrigin } from "@/lib/site";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const origin = new URL(request.url).origin;
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
    ...(await Promise.all(
      comparisons.map(async (item) => {
        const toolA = tools.find((tool) => tool.slug === item.toolASlug);
        const toolB = tools.find((tool) => tool.slug === item.toolBSlug);
        return auditComparisonPage(item, toolA, toolB);
      }),
    )),
  ].sort((a, b) => a.score - b.score);

  let sitemapOk = false;
  let robotsOk = false;
  let sitemapUrls = 0;
  try {
    const sitemapRes = await fetch(`${origin}/sitemap.xml`, { cache: "no-store" });
    sitemapOk = sitemapRes.ok;
    if (sitemapOk) {
      const xml = await sitemapRes.text();
      sitemapUrls = (xml.match(/<loc>/g) || []).length;
    }
  } catch {
    sitemapOk = false;
  }
  try {
    const robotsRes = await fetch(`${origin}/robots.txt`, { cache: "no-store" });
    robotsOk = robotsRes.ok;
  } catch {
    robotsOk = false;
  }

  return NextResponse.json({
    pages,
    rankChecks,
    settings,
    local: isLocalOrUnsetDomain(settings.siteDomain),
    publicOrigin: siteOrigin(settings.siteDomain),
    index: {
      sitemapOk,
      robotsOk,
      sitemapUrls,
      sitemapPath: "/sitemap.xml",
      robotsPath: "/robots.txt",
    },
  });
}

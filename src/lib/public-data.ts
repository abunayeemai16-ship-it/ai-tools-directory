import { cacheLife, cacheTag } from "next/cache";
import { liveAds } from "@/lib/ads";
import type { AdvertiseStats } from "@/lib/advertise";
import { PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import {
  featuredAvailability,
  isPublished,
  loadPublicDb,
  loadPublicTool,
  loadTrafficSummary,
} from "@/lib/db";
import { siteOrigin } from "@/lib/site";
import type { Tool } from "@/lib/types";

/*
 * Every public page reads through this module. The two "use cache" loaders below are the
 * only places that touch Supabase; pages built from them are prerendered and served from
 * Vercel's cache, regenerating at most hourly or when directory content changes
 * (PUBLIC_CACHE_TAG is revalidated by db.ts writes).
 */

async function publicCatalog() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  const { db, live } = await loadPublicDb();
  // A snapshot fallback must not stay cached for an hour.
  if (live) cacheLife("hours");
  else cacheLife("minutes");
  const tools = db.tools.filter(isPublished);
  const published = new Set(tools.map((tool) => tool.slug));
  return {
    seo: { title: db.settings.homeSeoTitle, description: db.settings.homeSeoDescription },
    base: siteOrigin(db.settings.siteDomain),
    categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    tools: tools.map(toDealCard),
    comparisons: db.comparisons.filter(
      (item) =>
        isPublished(item) && published.has(item.toolASlug) && published.has(item.toolBSlug),
    ),
    ads: liveAds(db.ads),
    availability: featuredAvailability(db),
  };
}

async function publicTool(card: Tool) {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAG);
  return (await loadPublicTool(card)) ?? null;
}

async function trafficSummary() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  const summary = await loadTrafficSummary();
  if (summary.live) cacheLife("hours");
  else cacheLife("minutes");
  return summary;
}

/** Only the fields cards render; long review text and affiliate data stay on the server. */
function toCard(tool: Tool): Tool {
  return {
    slug: tool.slug,
    name: tool.name,
    website: "",
    officialUrl: tool.officialUrl || tool.website,
    affiliateUrl: "",
    shortPitch: tool.shortPitch,
    overview: "",
    category: tool.category,
    pricingModel: tool.pricingModel,
    rating: tool.rating,
    reviewCount: tool.reviewCount,
    featured: tool.featured,
    brandColor: tool.brandColor,
    founded: "",
    bestFor: tool.bestFor,
    features: [],
    pros: [],
    cons: [],
    pricingTiers: [],
    faqs: [],
    seoTitle: "",
    metaDescription: "",
    conversionNote: "",
    status: tool.status,
    createdAt: "",
  };
}

function toDealCard(tool: Tool): Tool {
  return {
    ...toCard(tool),
    dealText: tool.dealText,
    couponCode: tool.couponCode,
    couponDiscount: tool.couponDiscount,
    couponExpires: tool.couponExpires,
  };
}

type Catalog = Awaited<ReturnType<typeof publicCatalog>>;

function comparisonPair(catalog: Catalog, toolASlug: string, toolBSlug: string) {
  const toolA = catalog.tools.find((tool) => tool.slug === toolASlug);
  const toolB = catalog.tools.find((tool) => tool.slug === toolBSlug);
  return toolA && toolB ? { toolA: toCard(toolA), toolB: toCard(toolB) } : null;
}

export async function getHomeSeo() {
  return (await publicCatalog()).seo;
}

export async function getHomeData() {
  const catalog = await publicCatalog();
  return {
    tools: catalog.tools.map(toCard),
    featured: catalog.tools.filter((tool) => tool.featured).slice(0, 6).map(toCard),
    categories: catalog.categories,
    ads: catalog.ads,
  };
}

/** Slugs prerendered at build time; every other review renders on first visit, then stays cached. */
export async function getPopularToolSlugs(limit = 30) {
  const { tools } = await publicCatalog();
  return [...tools]
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        b.reviewCount - a.reviewCount ||
        b.rating - a.rating,
    )
    .slice(0, limit)
    .map((tool) => tool.slug);
}

export async function getToolPageData(slug: string) {
  const catalog = await publicCatalog();
  const card = catalog.tools.find((tool) => tool.slug === slug);
  if (!card) return null;
  const tool = await publicTool(card);
  if (!tool) return null;
  return {
    tool,
    sidebarTool: card,
    related: catalog.tools
      .filter((item) => item.slug !== slug && item.category === card.category)
      .slice(0, 3)
      .map(toCard),
    categories: catalog.categories,
    promoAds: catalog.ads.filter((ad) => ad.placement === "review_sidebar"),
  };
}

export async function getCompareHubData() {
  const catalog = await publicCatalog();
  return catalog.comparisons.flatMap((comparison) => {
    const pair = comparisonPair(catalog, comparison.toolASlug, comparison.toolBSlug);
    return pair ? [{ comparison, ...pair }] : [];
  });
}

export async function getComparisonSlugs() {
  return (await publicCatalog()).comparisons.map((item) => item.slug);
}

export async function getComparisonPageData(slug: string) {
  const catalog = await publicCatalog();
  const comparison = catalog.comparisons.find((item) => item.slug === slug);
  if (!comparison) return null;
  const pair = comparisonPair(catalog, comparison.toolASlug, comparison.toolBSlug);
  return pair ? { comparison, ...pair } : null;
}

export async function getDealsData() {
  const catalog = await publicCatalog();
  return {
    deals: catalog.tools.filter((tool) => Boolean(tool.couponCode || tool.dealText)),
    categories: catalog.categories,
  };
}

export async function getPublicCategories() {
  return (await publicCatalog()).categories;
}

export async function getAdvertiseData() {
  const [catalog, traffic] = await Promise.all([publicCatalog(), trafficSummary()]);
  const stats: AdvertiseStats = {
    publishedTools: catalog.tools.length,
    categories: catalog.categories.length,
    pageviews30d: traffic.pageviews30d,
    visitors30d: traffic.visitors30d,
    topCountries: traffic.topCountries,
  };
  return { stats, availability: catalog.availability };
}

export async function getSitemapData() {
  const catalog = await publicCatalog();
  return {
    base: catalog.base,
    toolSlugs: catalog.tools.map((tool) => tool.slug),
    comparisonSlugs: catalog.comparisons.map((item) => item.slug),
  };
}

export async function getSiteBase() {
  return (await publicCatalog()).base;
}

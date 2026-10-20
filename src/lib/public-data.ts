import { cacheLife, cacheTag } from "next/cache";
import { liveAds } from "@/lib/ads";
import { sponsoredPlacement, type AdvertiseStats } from "@/lib/advertise";
import { ADVERTISE_CACHE_TAG, PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { toolFinder } from "@/lib/compare";
import {
  featuredAvailability,
  isPublished,
  loadPublicDb,
  loadPublicTool,
  loadTrafficSummary,
} from "@/lib/db";
import { siteOrigin } from "@/lib/site";
import type { DirectoryCard, Tool } from "@/lib/types";

/*
 * Every public page reads through this module. The "use cache" loaders below are the
 * only places that touch Supabase; pages built from them are prerendered and served from
 * Vercel's CDN. Cache Components replaces `export const revalidate` (which errors here):
 * `cacheLife("days")` revalidates in the background after 24h, or sooner when
 * PUBLIC_CACHE_TAG is invalidated by catalog writes in db.ts.
 */

async function publicCatalog() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  const { db, live } = await loadPublicDb();
  // Live Postgres: 24h CDN. Build/empty snapshot stays short so defaults like $149 never pin for a day.
  if (live) cacheLife("days");
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
    placement: sponsoredPlacement(db.settings),
    renderedAt: Date.now(),
  };
}

async function publicTool(card: DirectoryCard) {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  const { tool, live } = await loadPublicTool(card);
  if (live) cacheLife("days");
  else cacheLife("minutes");
  return tool ?? null;
}

async function trafficSummary() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  const summary = await loadTrafficSummary();
  // Advertise-page stats; weekly is enough and avoids daily forge_events scans.
  if (summary.live) cacheLife("weeks");
  else cacheLife("minutes");
  return summary;
}

/**
 * Price, offer, and slot availability for /advertise.
 * Kept off the 24h catalog cache: CDN s-maxage ignores revalidateTag until TTL ends, so a
 * long TTL made admin "Sponsored placement" saves look like they never applied.
 */
async function advertiseCheckout() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  cacheTag(ADVERTISE_CACHE_TAG);
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  const { db } = await loadPublicDb();
  return {
    placement: sponsoredPlacement(db.settings),
    availability: featuredAvailability(db),
    renderedAt: Date.now(),
    publishedTools: db.tools.filter(isPublished).length,
    categoryCount: db.categories.length,
  };
}

/** Only the fields cards render; long review text and affiliate data stay on the server. */
function toCard(tool: Tool): DirectoryCard {
  return {
    slug: tool.slug,
    name: tool.name,
    website: "",
    officialUrl: tool.officialUrl || tool.website,
    shortPitch: tool.shortPitch,
    bestFor: tool.bestFor,
    category: tool.category,
    pricingModel: tool.pricingModel,
    rating: tool.rating,
    reviewCount: tool.reviewCount,
    featured: tool.featured,
    brandColor: tool.brandColor,
  };
}

function toDealCard(tool: Tool): DirectoryCard {
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
  return toolA && toolB ? { toolA, toolB } : null;
}

export async function getHomeSeo() {
  return (await publicCatalog()).seo;
}

export async function getHomeData() {
  const catalog = await publicCatalog();
  return {
    tools: catalog.tools,
    featured: catalog.tools.filter((tool) => tool.featured).slice(0, 6),
    categories: catalog.categories,
    ads: catalog.ads,
  };
}

/** Slugs prerendered at build time; every other review renders on first visit, then stays cached. */
export async function getPopularToolSlugs(limit = 120) {
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
      .slice(0, 3),
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

/** Tool names for the compare box suggestions, plus published pairs to jump straight to. */
export async function getCompareSearchData() {
  const catalog = await publicCatalog();
  return {
    tools: catalog.tools
      .map((tool) => ({ name: tool.name, slug: tool.slug }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    pairs: catalog.comparisons
      .filter((item) => comparisonPair(catalog, item.toolASlug, item.toolBSlug))
      .map((item) => ({ slug: item.slug, a: item.toolASlug, b: item.toolBSlug })),
  };
}

/** Directory data for a visitor-chosen pair; either side is null when it is not listed. */
export async function getCustomCompareData(a: string, b: string) {
  const catalog = await publicCatalog();
  const findTool = toolFinder(catalog.tools);
  const cardA = findTool(a);
  const cardB = findTool(b);
  const existing =
    cardA && cardB
      ? catalog.comparisons.find(
          (item) =>
            (item.toolASlug === cardA.slug && item.toolBSlug === cardB.slug) ||
            (item.toolASlug === cardB.slug && item.toolBSlug === cardA.slug),
        )
      : undefined;
  const [toolA, toolB] = await Promise.all([
    cardA ? publicTool(cardA) : null,
    cardB ? publicTool(cardB) : null,
  ]);
  return { toolA, toolB, existingSlug: existing?.slug ?? null, categories: catalog.categories };
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
  const [checkout, traffic] = await Promise.all([advertiseCheckout(), trafficSummary()]);
  const stats: AdvertiseStats = {
    publishedTools: checkout.publishedTools,
    categories: checkout.categoryCount,
    pageviews30d: traffic.pageviews30d,
    visitors30d: traffic.visitors30d,
    topCountries: traffic.topCountries,
  };
  return {
    stats,
    availability: checkout.availability,
    placement: checkout.placement,
    renderedAt: checkout.renderedAt,
  };
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

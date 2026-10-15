import { catalogSlug, expandCatalogEntry } from "@/lib/data/catalog";
import type { CatalogEntry } from "@/lib/data/catalog-types";
import { generateReviewWithGemini, hasUsableGeminiKey } from "@/lib/gemini";
import type { GeneratedReview, PublishStatus, Tool } from "@/lib/types";
import { clampRating, clampReviewCount, slugify } from "@/lib/utils";

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function mergeReview(entry: CatalogEntry, review: GeneratedReview, status: PublishStatus): Tool {
  const fallback = expandCatalogEntry(entry, { status });
  const slug = catalogSlug(entry);
  const overview =
    wordCount(review.overview || "") >= 180 ? review.overview : fallback.overview;
  const features =
    (review.features?.length || 0) >= 6 ? review.features : fallback.features;
  const pros = (review.pros?.length || 0) >= 4 ? review.pros : fallback.pros;
  const cons = (review.cons?.length || 0) >= 4 ? review.cons : fallback.cons;
  const faqs = (review.faqs?.length || 0) >= 4 ? review.faqs : fallback.faqs;
  const pricingTiers =
    (review.pricingTiers?.length || 0) >= 3 ? review.pricingTiers : fallback.pricingTiers;
  return {
    ...fallback,
    ...review,
    slug,
    name: entry.name,
    website: entry.website,
    officialUrl: entry.website,
    affiliateUrl:
      review.affiliateUrl && review.affiliateUrl !== entry.website ? review.affiliateUrl : "",
    category: entry.category,
    pricingModel: review.pricingModel || entry.pricingModel,
    rating: clampRating(review.rating ?? fallback.rating, slug),
    reviewCount: clampReviewCount(review.reviewCount ?? fallback.reviewCount, slug),
    featured: Boolean(entry.featured),
    brandColor: review.brandColor || fallback.brandColor,
    founded: review.founded || entry.founded,
    bestFor: review.bestFor || entry.bestFor,
    shortPitch: review.shortPitch || entry.shortPitch,
    overview,
    features,
    pros,
    cons,
    faqs,
    pricingTiers,
    seoTitle: review.seoTitle || fallback.seoTitle,
    metaDescription: review.metaDescription || fallback.metaDescription,
    status,
    createdAt: new Date().toISOString(),
  };
}

export async function hydrateCatalogEntry(
  entry: CatalogEntry,
  status: PublishStatus,
  useGemini: boolean,
): Promise<{ tool: Tool; source: "gemini" | "library" }> {
  const fallback = expandCatalogEntry(entry, { status });
  if (!useGemini) return { tool: fallback, source: "library" };
  const ready = await hasUsableGeminiKey();
  if (!ready) return { tool: fallback, source: "library" };

  try {
    const review = await Promise.race([
      generateReviewWithGemini(
        `${entry.name} official site ${entry.website} category ${entry.category}. Write a 2026 editorial review.`,
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini timed out")), 22_000);
      }),
    ]);
    return { tool: mergeReview(entry, review, status), source: "gemini" };
  } catch {
    return { tool: fallback, source: "library" };
  }
}

export function uniqueSlug(name: string, taken: Set<string>) {
  let slug = slugify(name);
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

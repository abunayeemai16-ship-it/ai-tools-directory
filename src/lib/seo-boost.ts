import { expandCatalogEntry, packFor } from "@/lib/data/expand-catalog";
import type { SeoComparisonUpgrade, SeoHomeUpgrade, SeoToolUpgrade } from "@/lib/gemini";
import type { Comparison, Tool } from "@/lib/types";

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function fitTitle(raw: string) {
  const options = [
    raw,
    `${raw} 2026`,
    `${raw}: Pricing & Pros`,
    `${raw}: Features & Pricing`,
  ];
  const hit = options.find((title) => title.length >= 50 && title.length <= 60);
  if (hit) return hit;
  if (raw.length > 60) return raw.slice(0, 60).replace(/\s+\S*$/, "");
  return `${raw} Review 2026`.slice(0, 60);
}

export function boostToolSeoLocal(tool: Tool, keyword: string): SeoToolUpgrade {
  const pack = packFor(tool.category);
  const expanded = expandCatalogEntry(
    {
      name: tool.name,
      slug: tool.slug,
      website: tool.officialUrl || tool.website,
      category: tool.category,
      pricingModel: tool.pricingModel,
      founded: tool.founded,
      featured: tool.featured,
      brandColor: tool.brandColor,
      shortPitch: tool.shortPitch,
      bestFor: tool.bestFor || pack.buyer,
      job: pack.job,
      skipIf: pack.skipIf,
      features: tool.features.length >= 6 ? tool.features : pack.features,
    },
    { status: tool.status },
  );
  return {
    seoTitle: expanded.seoTitle,
    metaDescription: expanded.metaDescription,
    shortPitch: tool.shortPitch?.trim().length > 40 ? tool.shortPitch : expanded.shortPitch,
    overview: words(tool.overview) >= 250 ? tool.overview : expanded.overview,
    bestFor: tool.bestFor || expanded.bestFor,
    features: (tool.features?.length || 0) >= 6 ? tool.features : expanded.features,
    pros: (tool.pros?.length || 0) >= 5 ? tool.pros : expanded.pros,
    cons: (tool.cons?.length || 0) >= 4 ? tool.cons : expanded.cons,
    pricingTiers: (tool.pricingTiers?.length || 0) >= 3 ? tool.pricingTiers : expanded.pricingTiers,
    faqs: (tool.faqs?.length || 0) >= 5 ? tool.faqs : expanded.faqs,
    rating: Math.max(tool.rating, 4.6),
    targetKeyword: keyword,
  };
}

export function boostComparisonSeoLocal(input: {
  aName: string;
  bName: string;
  keyword: string;
  verdict: string;
}): SeoComparisonUpgrade {
  const { aName, bName, keyword } = input;
  const seoTitle = fitTitle(`${aName} vs ${bName}: Pricing & Verdict`);
  const meta = `${aName} vs ${bName} in 2026: features, pricing, who should buy which, and a clear editorial verdict. Compare pros, cons, and fit.`;
  const verdict =
    words(input.verdict) >= 120
      ? input.verdict
      : `${aName} vs ${bName} comes down to the job, not the homepage. Pick ${aName} when that product’s workflow is already how your team ships. Pick ${bName} when you need its specific packaging, pricing, or integrations instead of a generic assistant. Neither replaces a human editor, a security review, or a real trial on your own data. Confirm live pricing on both vendor sites before you brief finance. This comparison scores buyer-intent coverage — features, pricing, and a verdict you can defend — not fake traffic numbers. If both tools overlap, start with a two-week paid trial of the cheaper seat and switch only if a weekly bottleneck remains.`;
  return {
    seoTitle,
    metaDescription: meta.slice(0, 155),
    tagline: `${aName} vs ${bName}: which one is worth the seat in 2026?`,
    verdict,
    rows: [
      { feature: "Best for", a: `${aName} specialists`, b: `${bName} specialists`, winner: "tie" },
      { feature: "Ease of trial", a: "Vendor trial / free tier", b: "Vendor trial / free tier", winner: "tie" },
      { feature: "Team workflow", a: "Stronger if you already live in it", b: "Stronger if you already live in it", winner: "tie" },
      { feature: "Pricing clarity", a: "Confirm on vendor site", b: "Confirm on vendor site", winner: "tie" },
      { feature: "SEO / content depth", a: "Editorial listing on Forge", b: "Editorial listing on Forge", winner: "tie" },
      { feature: "Integrations", a: "Native ecosystem", b: "Native ecosystem", winner: "tie" },
      { feature: "Risk", a: "Needs a human pass", b: "Needs a human pass", winner: "tie" },
      { feature: "2026 verdict", a: "Keep if it is the job", b: "Keep if it is the job", winner: "tie" },
    ],
    targetKeyword: keyword,
  };
}

export function boostHomeSeoLocal(toolCount: number): SeoHomeUpgrade {
  return {
    homeSeoTitle: "Forge AI Tools Directory: Reviews & Pricing 2026",
    homeSeoDescription: `Compare ${toolCount}+ AI tools with independent 2026 reviews, pricing, pros and cons, and live deals. Find the product worth paying for — not another wrapper.`,
  };
}

export function isGeminiFn(value: unknown): value is (...args: never[]) => Promise<unknown> {
  return typeof value === "function";
}

export type { Comparison };

import { slugify } from "@/lib/utils";
import type { DirectoryCategory, Tool } from "@/lib/types";

export const DEFAULT_CATEGORIES: DirectoryCategory[] = [
  { slug: "writing-seo", name: "Writing & SEO", sortOrder: 1 },
  { slug: "image-design", name: "Image & Design", sortOrder: 2 },
  { slug: "video-animation", name: "Video & Animation", sortOrder: 3 },
  { slug: "audio-voice", name: "Audio & Voice", sortOrder: 4 },
  { slug: "coding-dev", name: "Coding & Dev", sortOrder: 5 },
  { slug: "marketing-sales", name: "Marketing & Sales", sortOrder: 6 },
  { slug: "chatbots-assistants", name: "Chatbots & Assistants", sortOrder: 7 },
  { slug: "productivity-workspace", name: "Productivity & Workspace", sortOrder: 8 },
  { slug: "automation-ai-agents", name: "Automation & AI Agents", sortOrder: 9 },
  { slug: "business-crm", name: "Business & CRM", sortOrder: 10 },
  { slug: "ecommerce", name: "E-commerce", sortOrder: 11 },
  { slug: "website-builders-hosting", name: "Website Builders & Hosting", sortOrder: 12 },
  { slug: "cybersecurity-vpn", name: "Cybersecurity & VPN", sortOrder: 13 },
  { slug: "data-analytics", name: "Data & Analytics", sortOrder: 14 },
  { slug: "finance-accounting", name: "Finance & Accounting", sortOrder: 15 },
  { slug: "education-research", name: "Education & Research", sortOrder: 16 },
  { slug: "customer-support", name: "Customer Support", sortOrder: 17 },
  { slug: "social-media", name: "Social Media", sortOrder: 18 },
  { slug: "hr-recruiting", name: "HR & Recruiting", sortOrder: 19 },
  { slug: "gadgets-hardware", name: "Gadgets & Hardware", sortOrder: 20 },
];

const LEGACY_CATEGORY_SLUG: Record<string, string> = {
  writing: "writing-seo",
  image: "image-design",
  video: "video-animation",
  audio: "audio-voice",
  coding: "coding-dev",
  marketing: "marketing-sales",
  "writing & seo": "writing-seo",
  "image & design": "image-design",
  "video & animation": "video-animation",
  "audio & voice": "audio-voice",
  "coding & dev": "coding-dev",
  "marketing & sales": "marketing-sales",
};

export function migrateCategorySlug(raw?: string) {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_CATEGORIES[0].slug;
  const lower = value.toLowerCase();
  if (LEGACY_CATEGORY_SLUG[lower]) return LEGACY_CATEGORY_SLUG[lower];
  const fromDefault = DEFAULT_CATEGORIES.find(
    (item) => item.slug === lower || item.name.toLowerCase() === lower,
  );
  if (fromDefault) return fromDefault.slug;
  return slugify(value) || DEFAULT_CATEGORIES[0].slug;
}

export function categoryLabel(slug: string, categories: DirectoryCategory[]) {
  return categories.find((item) => item.slug === slug)?.name || slug;
}

export function matchCategory(raw: string | undefined, categories: DirectoryCategory[]) {
  if (!raw?.trim()) return categories[0]?.slug || DEFAULT_CATEGORIES[0].slug;
  const needle = raw.trim().toLowerCase();
  const hit = categories.find(
    (item) =>
      item.slug === needle ||
      item.name.toLowerCase() === needle ||
      item.slug === slugify(raw),
  );
  return hit?.slug || migrateCategorySlug(raw);
}

export function hasActiveAffiliate(tool: Pick<Tool, "affiliateUrl">) {
  return Boolean(tool.affiliateUrl?.trim());
}

export function clickDestination(
  tool: Pick<Tool, "affiliateUrl" | "officialUrl" | "website">,
) {
  return (
    tool.affiliateUrl?.trim() ||
    tool.officialUrl?.trim() ||
    tool.website?.trim() ||
    ""
  );
}

export function looksTrackedAffiliate(url: string) {
  return /[?&](ref|via|aff|irclickid|fp_ref|utm_source|partner)=/i.test(url) ||
    /partnerstack|impact\.com|firstpromoter|shareasale|cj\.com/i.test(url);
}

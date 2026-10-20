export type Category = string;

export type DirectoryCategory = {
  slug: string;
  name: string;
  sortOrder: number;
};
export type PricingModel = "Free" | "Freemium" | "Paid";
export type ListingTier = "free" | "featured";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type PublishStatus = "draft" | "published";

export type PricingTier = {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
};

export type FAQ = {
  question: string;
  answer: string;
};

/** Card fields shipped to the homepage / deals grid — keeps Fast Origin Transfer small. */
export type DirectoryCard = {
  slug: string;
  name: string;
  officialUrl: string;
  website: string;
  shortPitch: string;
  bestFor: string;
  category: Category;
  pricingModel: PricingModel;
  rating: number;
  reviewCount: number;
  featured: boolean;
  brandColor: string;
  dealText?: string;
  couponCode?: string;
  couponDiscount?: string;
  couponExpires?: string;
};

export type Tool = {
  slug: string;
  name: string;
  website: string;
  officialUrl: string;
  affiliateUrl: string;
  affiliateNetwork?: string;
  commissionNote?: string;
  dealText?: string;
  shortPitch: string;
  overview: string;
  category: Category;
  pricingModel: PricingModel;
  rating: number;
  reviewCount: number;
  featured: boolean;
  brandColor: string;
  founded: string;
  bestFor: string;
  features: string[];
  pros: string[];
  cons: string[];
  pricingTiers: PricingTier[];
  faqs: FAQ[];
  seoTitle: string;
  metaDescription: string;
  conversionNote: string;
  couponCode?: string;
  couponDiscount?: string;
  couponExpires?: string;
  targetKeyword?: string;
  status: PublishStatus;
  createdAt: string;
  jsonLd?: Record<string, unknown>;
};

export type ToolStats = Tool & {
  clicksToday: number;
  clicksMonth: number;
  clicksTotal: number;
};

export type ComparisonRow = {
  feature: string;
  a: string;
  b: string;
  winner: "a" | "b" | "tie";
};

export type Comparison = {
  slug: string;
  toolASlug: string;
  toolBSlug: string;
  tagline: string;
  verdict: string;
  overallWinner: "a" | "b" | "tie";
  rows: ComparisonRow[];
  seoTitle: string;
  metaDescription: string;
  affiliateUrl: string;
  couponCode?: string;
  couponDiscount?: string;
  targetKeyword?: string;
  status: PublishStatus;
  createdAt: string;
  jsonLd?: Record<string, unknown>;
};

export type Submission = {
  id: string;
  name: string;
  website: string;
  category: Category;
  pitch: string;
  pricingModel: PricingModel;
  email: string;
  tier: ListingTier;
  status: SubmissionStatus;
  submittedAt: string;
};

export type CountryStat = {
  country: string;
  code: string;
  visitors: number;
  share: number;
};

export type GeneratedReview = {
  name: string;
  slug: string;
  website: string;
  officialUrl?: string;
  affiliateUrl?: string;
  category: Category;
  seoTitle: string;
  metaDescription: string;
  shortPitch: string;
  overview: string;
  bestFor?: string;
  founded?: string;
  brandColor?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  features: string[];
  pros: string[];
  cons: string[];
  pricingModel: PricingModel;
  pricingTiers: PricingTier[];
  faqs: FAQ[];
  schema?: Record<string, unknown>;
};

export type GeneratedComparison = {
  slug: string;
  toolA: string;
  toolB: string;
  toolASlug: string;
  toolBSlug: string;
  tagline: string;
  verdict: string;
  overallWinner: "a" | "b" | "tie";
  rows: ComparisonRow[];
  seoTitle?: string;
  metaDescription?: string;
  affiliateUrl?: string;
  schema?: Record<string, unknown>;
};

export type AnalyticsSession = {
  id: string;
  country: string;
  firstSeen: string;
  lastSeen: string;
};

export type PageviewEvent = {
  id: string;
  path: string;
  sessionId: string;
  country: string;
  timestamp: string;
};

export type ClickEvent = {
  id: string;
  slug: string;
  country: string;
  timestamp: string;
};

export type Commission = {
  id: string;
  amount: number;
  note: string;
  slug?: string;
  timestamp: string;
};

export type GeminiKeyHealth = "active" | "quota_exceeded" | "invalid";

export type GeminiApiKey = {
  id: string;
  label: string;
  key: string;
  enabled: boolean;
  status: GeminiKeyHealth;
  usageCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export type GeminiKeyPublic = Omit<GeminiApiKey, "key"> & {
  maskedKey: string;
};

export type RankCompetitor = {
  title: string;
  url: string;
};

export type RankSnapshot = {
  path: string;
  keyword: string;
  position: number | null;
  inTop100: boolean;
  checkedAt: string;
  top3: RankCompetitor[];
  source: "serper" | "cse" | "skipped";
  message?: string;
};

export type SeoPageAudit = {
  path: string;
  kind: "home" | "tool" | "compare";
  slug?: string;
  name: string;
  keyword: string;
  score: number;
  issues: string[];
  checks: { label: string; pass: boolean; detail: string; weight: number }[];
};

export type PartnershipType =
  | "Associate Partner (VIP Affiliate %)"
  | "Paid Sponsorship ($)"
  | "Featured Exchange";

export type AdPlacement =
  | "hero_banner"
  | "pinned_grid"
  | "category_sponsor"
  | "review_sidebar";

export type AdStatus = "active" | "paused" | "ended";

export type AdCampaign = {
  id: string;
  title: string;
  partnerName: string;
  toolSlug: string;
  partnershipType: PartnershipType;
  placement: AdPlacement;
  targetCategory: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  targetUrl: string;
  couponCode: string;
  badgeText: string;
  commissionOrFeeNote: string;
  fixedFeeEarned: number;
  feePosted: boolean;
  status: AdStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  /** Paid self-serve bookings: run length applied when the admin activates the campaign. */
  paidDays?: number;
  paymentRef?: string;
  contactEmail?: string;
};

export type AppSettings = {
  epc: number;
  adminPasswordHash: string;
  sessionSecret: string;
  siteDomain: string;
  serperApiKey: string;
  googleCseKey: string;
  googleCseCx: string;
  homeSeoTitle: string;
  homeSeoDescription: string;
  sponsoredName: string;
  sponsoredPrice: number;
  sponsoredDays: number;
  /** 0 when no offer is set. */
  sponsoredOfferPrice: number;
  sponsoredOfferStart: string;
  sponsoredOfferEnd: string;
  /** Core-catalog slugs removed in admin; ensureCoreCatalog must not resurrect them. */
  removedToolSlugs: string[];
  /** Tool slugs whose deals/coupons were cleared; cannot be revived by a stale catalog write. */
  clearedDealSlugs: string[];
  /** One-shot: remove these from clearedDealSlugs on the next catalog upsert (intentional restore). */
  restoredDealSlugs?: string[];
};

export type Database = {
  settings: AppSettings;
  geminiKeys: GeminiApiKey[];
  categories: DirectoryCategory[];
  tools: Tool[];
  comparisons: Comparison[];
  submissions: Submission[];
  sessions: AnalyticsSession[];
  pageviews: PageviewEvent[];
  clicks: ClickEvent[];
  commissions: Commission[];
  rankChecks: RankSnapshot[];
  ads: AdCampaign[];
};

export type TrafficPoint = {
  label: string;
  value: number;
};

export type AnalyticsOverview = {
  liveVisitors: number;
  clicksToday: number;
  clicksMonth: number;
  epc: number;
  commissionsToday: number;
  commissionsMonth: number;
  estimatedRevenueToday: number;
  estimatedRevenueMonth: number;
  topCountry: CountryStat | null;
  countries: CountryStat[];
  traffic: {
    daily: TrafficPoint[];
    weekly: TrafficPoint[];
    monthly: TrafficPoint[];
  };
};

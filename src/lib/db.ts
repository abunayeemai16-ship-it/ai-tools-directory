import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_CATEGORIES,
  looksTrackedAffiliate,
  migrateCategorySlug,
} from "@/lib/categories";
import { DEFAULT_ADMIN_PASSWORD, hashPassword, maskGeminiKey, newSessionSecret } from "@/lib/crypto-auth";
import { CORE_CATALOG, catalogSlug, expandCatalogEntry } from "@/lib/data/catalog";
import { comparisons as seedComparisons } from "@/lib/data/comparisons";
import { seedComparisonDrafts, seedToolDrafts } from "@/lib/data/seed-drafts";
import catalogSnapshotSeed from "@/lib/data/catalog-snapshot.json";
import { tools as seedTools } from "@/lib/data/tools";
import { clampRating, clampReviewCount, slugify } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { isAdLive, isNewPaidBooking, publicAd } from "@/lib/ads";
import { PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import {
  sponsoredPlacement,
  type AdvertiseAvailability,
  type AdvertiseOrderInput,
  type AdvertiseStats,
  type SponsoredPlacement,
} from "@/lib/advertise";
import type {
  AdCampaign,
  AdPlacement,
  AdStatus,
  AppSettings,
  ClickEvent,
  Commission,
  Comparison,
  Database,
  DirectoryCategory,
  GeminiApiKey,
  GeminiKeyHealth,
  GeminiKeyPublic,
  GeneratedComparison,
  GeneratedReview,
  PageviewEvent,
  PartnershipType,
  PublishStatus,
  RankSnapshot,
  Submission,
  SubmissionStatus,
  Tool,
} from "@/lib/types";
import {
  DEFAULT_HOME_DESCRIPTION,
  DEFAULT_HOME_TITLE,
} from "@/lib/site";

function usesPostgres() {
  return Boolean((process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim());
}

async function postgresStore() {
  if (!usesPostgres()) {
    throw new Error("DATABASE_URL is not set");
  }
  return import("./postgres-store");
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");
// Heartbeats rewrite this file often. Keep it out of data/ and .next so Turbopack
// does not treat analytics I/O as a source change (compile/reload loop).
const ANALYTICS_PATH = path.join(
  process.cwd(),
  "node_modules",
  ".cache",
  "forge",
  "analytics.json",
);
const LIVE_WINDOW_MS = 45_000;

let memory: Database | null = null;
let writeChain: Promise<unknown> = Promise.resolve();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastCatalogSnap = "";
let lastAnalyticsSnap = "";
let vercelPersistWarned = false;
// Postgres: memory is reused until the row's updated_at changes. Checking costs one tiny query.
const VERSION_CHECK_MS = 30_000;
const ANALYTICS_CHECK_MS = 60_000;
let catalogVersion: string | null = null;
let analyticsVersion: string | null = null;
let catalogCheckedAt = 0;
let analyticsCheckedAt = 0;

function applyAnalytics(db: Database, slice: Partial<Pick<Database, "sessions" | "pageviews" | "clicks">>) {
  if (Array.isArray(slice.sessions)) db.sessions = slice.sessions;
  if (Array.isArray(slice.pageviews)) db.pageviews = slice.pageviews;
  if (Array.isArray(slice.clicks)) db.clicks = slice.clicks;
}

function contentSnapshot(db: Database) {
  return JSON.stringify([
    db.settings,
    db.geminiKeys,
    db.categories,
    db.tools,
    db.comparisons,
    db.submissions,
    db.commissions,
    db.rankChecks,
    db.ads,
  ]);
}

function revalidatePublicPages() {
  try {
    revalidateTag(PUBLIC_CACHE_TAG, { expire: 0 });
  } catch {
    // Outside a request scope (build, scripts): nothing cached to invalidate.
  }
}

function analyticsSnapshot(db: Database) {
  return JSON.stringify({
    sessions: db.sessions,
    pageviews: db.pageviews,
  });
}

async function writeIfChanged(filePath: string, snapshot: string, last: string) {
  if (snapshot === last) return last;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, snapshot, "utf8");
    return snapshot;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || process.env.VERCEL) {
      if (!vercelPersistWarned) {
        vercelPersistWarned = true;
        console.warn(
          "[forge] File database is not writable. Set DATABASE_URL to your Supabase Postgres URI on Vercel.",
        );
      }
      return snapshot;
    }
    throw error;
  }
}

function catalogSnapshot(db: Database) {
  return JSON.stringify(
    {
      settings: db.settings,
      geminiKeys: db.geminiKeys,
      categories: db.categories,
      tools: db.tools,
      comparisons: db.comparisons,
      submissions: db.submissions,
      clicks: db.clicks,
      commissions: db.commissions,
      rankChecks: db.rankChecks,
      ads: db.ads,
      sessions: db.sessions,
      pageviews: db.pageviews,
    },
    null,
    2,
  );
}

async function persistCatalog() {
  if (!memory) return;
  const snap = catalogSnapshot(memory);
  if (snap === lastCatalogSnap) return;
  try {
    if (usesPostgres()) {
      const { savePostgresCatalog } = await postgresStore();
      const version = await savePostgresCatalog(JSON.parse(snap) as Record<string, unknown>);
      if (version) catalogVersion = version;
      lastCatalogSnap = snap;
      return;
    }
    lastCatalogSnap = await writeIfChanged(DB_PATH, snap, lastCatalogSnap);
  } catch (error) {
    console.error("[forge] persistCatalog failed", error);
    lastCatalogSnap = snap;
  }
}

async function persistAnalytics() {
  // Postgres analytics are written event-by-event in SQL; never overwrite the row from memory.
  if (!memory || usesPostgres()) return;
  const snap = analyticsSnapshot(memory);
  if (snap === lastAnalyticsSnap) return;
  try {
    lastAnalyticsSnap = await writeIfChanged(ANALYTICS_PATH, snap, lastAnalyticsSnap);
  } catch (error) {
    console.error("[forge] persistAnalytics failed", error);
    lastAnalyticsSnap = snap;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeChain = writeChain.then(
      () => persistAnalytics(),
      () => undefined,
    );
  }, 5_000);
}

function publishedStamp() {
  return "2026-01-15T00:00:00.000Z";
}

export function isPublished(item: { status?: PublishStatus }) {
  return item.status !== "draft";
}

function normalizeCategory(raw: Partial<DirectoryCategory>, index = 0): DirectoryCategory {
  const name = raw.name?.trim() || "Untitled";
  return {
    slug: slugify(raw.slug || name) || `category-${index + 1}`,
    name,
    sortOrder: Number(raw.sortOrder) || index + 1,
  };
}

function normalizeTool(raw: Partial<Tool> & Pick<Tool, "slug" | "name">): Tool {
  const officialUrl = raw.officialUrl?.trim() || raw.website?.trim() || "";
  let affiliateUrl = (raw.affiliateUrl || "").trim();
  if (affiliateUrl && affiliateUrl === officialUrl && !looksTrackedAffiliate(affiliateUrl)) {
    affiliateUrl = "";
  }
  if (affiliateUrl && affiliateUrl === raw.website && !looksTrackedAffiliate(affiliateUrl)) {
    affiliateUrl = "";
  }
  return {
    slug: raw.slug,
    name: raw.name,
    website: officialUrl,
    officialUrl,
    affiliateUrl,
    affiliateNetwork: raw.affiliateNetwork || "",
    commissionNote: raw.commissionNote || "",
    dealText: raw.dealText || raw.couponDiscount || "",
    shortPitch: raw.shortPitch || "",
    overview: raw.overview || raw.shortPitch || "",
    category: migrateCategorySlug(raw.category),
    pricingModel: raw.pricingModel || "Freemium",
    rating: clampRating(raw.rating, raw.slug),
    reviewCount: clampReviewCount(raw.reviewCount, raw.slug),
    featured: Boolean(raw.featured),
    brandColor: raw.brandColor || "#FFB020",
    founded: raw.founded || String(new Date().getFullYear()),
    bestFor: raw.bestFor || raw.shortPitch || "",
    features: raw.features ?? [],
    pros: raw.pros ?? [],
    cons: raw.cons ?? [],
    pricingTiers: raw.pricingTiers ?? [],
    faqs: raw.faqs ?? [],
    seoTitle: raw.seoTitle || `${raw.name} Review`,
    metaDescription: raw.metaDescription || (raw.shortPitch || "").slice(0, 155),
    conversionNote: raw.conversionNote || "",
    couponCode: raw.couponCode,
    couponDiscount: raw.dealText || raw.couponDiscount,
    couponExpires: raw.couponExpires,
    targetKeyword: raw.targetKeyword || "",
    status: raw.status === "draft" ? "draft" : "published",
    createdAt: raw.createdAt || publishedStamp(),
    jsonLd: raw.jsonLd,
  };
}

function normalizeComparison(
  raw: Partial<Comparison> & Pick<Comparison, "slug" | "toolASlug" | "toolBSlug">,
): Comparison {
  const title = `${raw.toolASlug} vs ${raw.toolBSlug}`;
  return {
    slug: raw.slug,
    toolASlug: raw.toolASlug,
    toolBSlug: raw.toolBSlug,
    tagline: raw.tagline || title,
    verdict: raw.verdict || "",
    overallWinner: raw.overallWinner === "b" || raw.overallWinner === "tie" ? raw.overallWinner : "a",
    rows: raw.rows ?? [],
    seoTitle: raw.seoTitle || `${title} 2026`,
    metaDescription: raw.metaDescription || raw.tagline || title,
    affiliateUrl: raw.affiliateUrl || "",
    couponCode: raw.couponCode,
    couponDiscount: raw.couponDiscount,
    targetKeyword: raw.targetKeyword || "",
    status: raw.status === "draft" ? "draft" : "published",
    createdAt: raw.createdAt || publishedStamp(),
    jsonLd: raw.jsonLd,
  };
}

function toolNameKey(value: string) {
  return value.trim().toLowerCase();
}

function comparisonPairKey(item: { toolASlug: string; toolBSlug: string }) {
  return `${item.toolASlug}::${item.toolBSlug}`;
}

function uniqueLatest<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function pruneDuplicateDrafts(db: Database) {
  let dirty = false;
  const draftToolsNewestFirst = [...db.tools]
    .filter((tool) => tool.status === "draft")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const keepTools = uniqueLatest(draftToolsNewestFirst, (tool) => toolNameKey(tool.name));
  const keepToolSlugs = new Set(keepTools.map((tool) => tool.slug));
  const droppedTools = draftToolsNewestFirst.filter((tool) => !keepToolSlugs.has(tool.slug));
  if (droppedTools.length) {
    const rewrite = new Map(
      droppedTools.map((tool) => {
        const kept = keepTools.find((item) => toolNameKey(item.name) === toolNameKey(tool.name));
        return [tool.slug, kept?.slug || tool.slug] as const;
      }),
    );
    for (const comparison of db.comparisons) {
      comparison.toolASlug = rewrite.get(comparison.toolASlug) || comparison.toolASlug;
      comparison.toolBSlug = rewrite.get(comparison.toolBSlug) || comparison.toolBSlug;
    }
    const drop = new Set(droppedTools.map((tool) => tool.slug));
    db.tools = db.tools.filter((tool) => !drop.has(tool.slug));
    dirty = true;
  }

  const draftComparisonsNewestFirst = [...db.comparisons]
    .filter((item) => item.status === "draft")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const keepComparisons = uniqueLatest(draftComparisonsNewestFirst, comparisonPairKey);
  const keepComparisonSlugs = new Set(keepComparisons.map((item) => item.slug));
  const nextComparisons = db.comparisons.filter(
    (item) => item.status !== "draft" || keepComparisonSlugs.has(item.slug),
  );
  if (nextComparisons.length !== db.comparisons.length) {
    db.comparisons = nextComparisons;
    dirty = true;
  }
  return dirty;
}

function injectSeedDrafts(db: Database) {
  let added = false;
  for (const draft of seedToolDrafts) {
    const taken = db.tools.some(
      (tool) =>
        tool.slug === draft.slug ||
        toolNameKey(tool.name) === toolNameKey(draft.name),
    );
    if (taken) continue;
    db.tools.push(normalizeTool(draft));
    added = true;
  }
  for (const draft of seedComparisonDrafts) {
    const taken = db.comparisons.some(
      (item) =>
        item.slug === draft.slug ||
        comparisonPairKey(item) === comparisonPairKey(draft),
    );
    if (taken) continue;
    db.comparisons.push(normalizeComparison(draft));
    added = true;
  }
  return added;
}

function ensureCoreCatalog(db: Database) {
  let dirty = false;
  const bySlug = new Map(db.tools.map((tool) => [tool.slug, tool]));
  const byName = new Map(db.tools.map((tool) => [tool.name.trim().toLowerCase(), tool]));

  for (const entry of CORE_CATALOG) {
    const slug = catalogSlug(entry);
    const existing = bySlug.get(slug) || byName.get(entry.name.trim().toLowerCase());
    if (existing) {
      if (existing.category !== entry.category) {
        existing.category = entry.category;
        dirty = true;
      }
      if (!existing.officialUrl?.trim()) {
        existing.officialUrl = entry.website;
        existing.website = entry.website;
        dirty = true;
      }
      continue;
    }
    const tool = expandCatalogEntry(entry, { status: "published" });
    db.tools.push(tool);
    bySlug.set(tool.slug, tool);
    byName.set(tool.name.trim().toLowerCase(), tool);
    dirty = true;
  }

  const canonical = new Map(
    CORE_CATALOG.map((entry) => [entry.name.trim().toLowerCase(), catalogSlug(entry)]),
  );
  for (const tool of db.tools) {
    const want = canonical.get(tool.name.trim().toLowerCase());
    if (want && tool.slug !== want && tool.status === "published") {
      tool.status = "draft";
      dirty = true;
    }
  }
  return dirty;
}

function normalizeSettings(raw?: Partial<AppSettings> | null): AppSettings {
  const sponsored = sponsoredPlacement(raw);
  return {
    epc: Number(raw?.epc) || 0,
    adminPasswordHash: String(raw?.adminPasswordHash || ""),
    sessionSecret: String(raw?.sessionSecret || ""),
    siteDomain: String(raw?.siteDomain || "").trim(),
    serperApiKey: String(raw?.serperApiKey || "").trim(),
    googleCseKey: String(raw?.googleCseKey || "").trim(),
    googleCseCx: String(raw?.googleCseCx || "").trim(),
    homeSeoTitle: String(raw?.homeSeoTitle || DEFAULT_HOME_TITLE).trim() || DEFAULT_HOME_TITLE,
    homeSeoDescription:
      String(raw?.homeSeoDescription || DEFAULT_HOME_DESCRIPTION).trim() || DEFAULT_HOME_DESCRIPTION,
    sponsoredName: sponsored.name,
    sponsoredPrice: sponsored.price,
    sponsoredDays: sponsored.days,
    sponsoredOfferPrice: sponsored.offer?.price ?? 0,
    sponsoredOfferStart: sponsored.offer?.startsAt ?? "",
    sponsoredOfferEnd: sponsored.offer?.endsAt ?? "",
  };
}

function normalizeAd(raw: Partial<AdCampaign> & Pick<AdCampaign, "id" | "title">): AdCampaign {
  const status: AdStatus =
    raw.status === "paused" || raw.status === "ended" ? raw.status : "active";
  const partnershipType: PartnershipType =
    raw.partnershipType === "Paid Sponsorship ($)" ||
    raw.partnershipType === "Featured Exchange"
      ? raw.partnershipType
      : "Associate Partner (VIP Affiliate %)";
  const placement: AdPlacement =
    raw.placement === "pinned_grid" ||
    raw.placement === "category_sponsor" ||
    raw.placement === "review_sidebar"
      ? raw.placement
      : "hero_banner";
  return {
    id: raw.id,
    title: raw.title.trim(),
    partnerName: raw.partnerName?.trim() || raw.title.trim(),
    toolSlug: raw.toolSlug?.trim() || "",
    partnershipType,
    placement,
    targetCategory: raw.targetCategory?.trim() || "",
    headline: raw.headline?.trim() || raw.title.trim(),
    subheadline: raw.subheadline?.trim() || "",
    ctaText: raw.ctaText?.trim() || "Try Partner Tool Free",
    targetUrl: raw.targetUrl?.trim() || "",
    couponCode: raw.couponCode?.trim() || "",
    badgeText: raw.badgeText?.trim() || "Sponsored",
    commissionOrFeeNote: raw.commissionOrFeeNote?.trim() || "",
    fixedFeeEarned: Math.max(0, Number(raw.fixedFeeEarned) || 0),
    feePosted: Boolean(raw.feePosted),
    status,
    startDate: raw.startDate || "",
    endDate: raw.endDate || "",
    impressions: Math.max(0, Math.round(Number(raw.impressions) || 0)),
    clicks: Math.max(0, Math.round(Number(raw.clicks) || 0)),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    ...(Number(raw.paidDays) > 0 ? { paidDays: Math.round(Number(raw.paidDays)) } : {}),
    ...(raw.paymentRef?.trim() ? { paymentRef: raw.paymentRef.trim() } : {}),
    ...(raw.contactEmail?.trim() ? { contactEmail: raw.contactEmail.trim() } : {}),
  };
}

function expireAds(db: Database) {
  const now = Date.now();
  let dirty = false;
  for (const ad of db.ads) {
    if (ad.status === "active" && ad.endDate) {
      const end = new Date(ad.endDate).getTime();
      if (Number.isFinite(end) && end < now) {
        ad.status = "ended";
        ad.updatedAt = new Date().toISOString();
        dirty = true;
      }
    }
  }
  return dirty;
}

function maybePostAdFee(db: Database, ad: AdCampaign) {
  if (ad.feePosted) return;
  if (ad.partnershipType !== "Paid Sponsorship ($)") return;
  if (!(ad.fixedFeeEarned > 0) || ad.status !== "active") return;
  db.commissions.push({
    id: newId("com"),
    amount: ad.fixedFeeEarned,
    note: `Sponsored ad run: ${ad.title}`,
    slug: ad.toolSlug || undefined,
    timestamp: new Date().toISOString(),
  });
  ad.feePosted = true;
}

function normalizeRankCheck(raw: Partial<RankSnapshot> & Pick<RankSnapshot, "path">): RankSnapshot {
  return {
    path: raw.path,
    keyword: raw.keyword || "",
    position: typeof raw.position === "number" ? raw.position : null,
    inTop100: Boolean(raw.inTop100),
    checkedAt: raw.checkedAt || new Date().toISOString(),
    top3: Array.isArray(raw.top3) ? raw.top3 : [],
    source: raw.source === "cse" || raw.source === "serper" ? raw.source : "skipped",
    message: raw.message,
  };
}

function normalizeGeminiKey(raw: Partial<GeminiApiKey> & Pick<GeminiApiKey, "key">): GeminiApiKey {
  const status: GeminiKeyHealth =
    raw.status === "quota_exceeded" || raw.status === "invalid" ? raw.status : "active";
  return {
    id: raw.id || newId("gkey"),
    label: raw.label?.trim() || "Gemini key",
    key: raw.key.trim(),
    enabled: raw.enabled !== false,
    status,
    usageCount: Number(raw.usageCount) || 0,
    lastUsedAt: raw.lastUsedAt || null,
    lastError: raw.lastError || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function toPublicGeminiKey(key: GeminiApiKey): GeminiKeyPublic {
  const { key: _secret, ...rest } = key;
  return { ...rest, maskedKey: maskGeminiKey(key.key) };
}

function snapshotCatalog() {
  const raw = catalogSnapshotSeed as Partial<Database>;
  const tools = Array.isArray(raw.tools) ? raw.tools.map((tool) => normalizeTool(tool)) : [];
  if (tools.length < 100) return null;
  return {
    tools,
    comparisons: Array.isArray(raw.comparisons)
      ? raw.comparisons.map((item) => normalizeComparison(item))
      : [],
    categories:
      Array.isArray(raw.categories) && raw.categories.length
        ? raw.categories.map((item, index) => normalizeCategory(item, index))
        : DEFAULT_CATEGORIES.map((item) => ({ ...item })),
  };
}

function emptyDb(): Database {
  const snap = snapshotCatalog();
  const db: Database = {
    settings: normalizeSettings({ epc: 0 }),
    geminiKeys: [],
    categories: snap?.categories ?? DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    tools: snap?.tools ?? seedTools.map((tool) => normalizeTool(tool)),
    comparisons: snap?.comparisons ?? seedComparisons.map((item) => normalizeComparison(item)),
    submissions: [],
    sessions: [],
    pageviews: [],
    clicks: [],
    commissions: [],
    rankChecks: [],
    ads: [],
  };
  if (!snap) injectSeedDrafts(db);
  ensureCoreCatalog(db);
  return db;
}

function normalizeDb(raw: Partial<Database> | null): Database {
  const toolsIn = Array.isArray(raw?.tools) ? raw.tools : [];
  const hasTools = toolsIn.length > 0;
  const fallback = hasTools ? null : snapshotCatalog();
  const db: Database = {
    settings: normalizeSettings(raw?.settings),
    geminiKeys: Array.isArray(raw?.geminiKeys)
      ? raw.geminiKeys
          .filter((item) => item?.key)
          .map((item) => normalizeGeminiKey(item))
      : [],
    categories:
      Array.isArray(raw?.categories) && raw.categories.length
        ? raw.categories
            .map((item, index) => normalizeCategory(item, index))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    tools: hasTools
      ? toolsIn.map((tool) => normalizeTool(tool))
      : fallback?.tools ?? seedTools.map((tool) => normalizeTool(tool)),
    comparisons: Array.isArray(raw?.comparisons)
      ? raw.comparisons.map((item) => normalizeComparison(item))
      : fallback?.comparisons ?? seedComparisons.map((item) => normalizeComparison(item)),
    submissions: Array.isArray(raw?.submissions) ? raw.submissions : [],
    sessions: Array.isArray(raw?.sessions) ? raw.sessions : [],
    pageviews: Array.isArray(raw?.pageviews) ? raw.pageviews : [],
    clicks: Array.isArray(raw?.clicks) ? raw.clicks : [],
    commissions: Array.isArray(raw?.commissions) ? raw.commissions : [],
    rankChecks: Array.isArray(raw?.rankChecks)
      ? raw.rankChecks.filter((item) => item?.path).map((item) => normalizeRankCheck(item))
      : [],
    ads: Array.isArray(raw?.ads)
      ? raw.ads.filter((item) => item?.id && item?.title).map((item) => normalizeAd(item))
      : [],
  };
  injectSeedDrafts(db);
  ensureCoreCatalog(db);
  return db;
}

async function readAnalyticsSlice() {
  try {
    const text = await readFile(ANALYTICS_PATH, "utf8");
    const raw = JSON.parse(text) as Partial<Database>;
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : null,
      pageviews: Array.isArray(raw.pageviews) ? raw.pageviews : null,
    };
  } catch {
    return { sessions: null, pageviews: null };
  }
}

async function seedFromLocalFile(): Promise<Database> {
  try {
    const text = await readFile(DB_PATH, "utf8");
    return normalizeDb(JSON.parse(text) as Partial<Database>);
  } catch {
    return emptyDb();
  }
}

async function applyRuntimeDefaults(db: Database) {
  let dirty = false;
  if (!db.settings.adminPasswordHash) {
    db.settings.adminPasswordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    dirty = true;
  }
  if (!db.settings.sessionSecret) {
    db.settings.sessionSecret = newSessionSecret();
    dirty = true;
  }
  if (!db.categories.length) {
    db.categories = DEFAULT_CATEGORIES.map((item) => ({ ...item }));
    dirty = true;
  }
  if (ensureCoreCatalog(db)) dirty = true;
  if (pruneDuplicateDrafts(db)) dirty = true;
  if (!Array.isArray(db.ads)) {
    db.ads = [];
    dirty = true;
  }
  if (!Array.isArray(db.sessions)) {
    db.sessions = [];
    dirty = true;
  }
  if (!Array.isArray(db.pageviews)) {
    db.pageviews = [];
    dirty = true;
  }
  return dirty;
}

async function hydrateFromRaw(raw: Partial<Database> | null) {
  if (usesPostgres()) {
    const missing = !raw;
    const db = raw ? normalizeDb(raw) : emptyDb();
    const dirty = (await applyRuntimeDefaults(db)) || missing;
    return { db, dirty };
  }
  const missing = !raw;
  const db = raw ? normalizeDb(raw) : await seedFromLocalFile();
  const dirty = (await applyRuntimeDefaults(db)) || missing;
  return { db, dirty };
}

async function readFileDb(): Promise<Database> {
  if (usesPostgres()) {
    catalogCheckedAt = analyticsCheckedAt = performance.now();
    try {
      const store = await postgresStore();
      const catalog = await store.loadCatalog();
      const analytics = await store.loadAnalytics();
      const { db } = await hydrateFromRaw(catalog.value);
      applyAnalytics(db, analytics.value ?? {});
      catalogVersion = catalog.version;
      analyticsVersion = analytics.version;
      lastCatalogSnap = "__postgres__";
      lastAnalyticsSnap = analyticsSnapshot(db);
      return db;
    } catch (error) {
      console.error("[forge] Postgres catalog load failed, using bundled snapshot", error);
      const db = emptyDb();
      catalogVersion = analyticsVersion = null;
      lastCatalogSnap = "__snapshot__";
      lastAnalyticsSnap = analyticsSnapshot(db);
      return db;
    }
  }
  try {
    const text = await readFile(DB_PATH, "utf8");
    const raw = JSON.parse(text) as Partial<Database>;
    const db = normalizeDb(raw);
    const analytics = await readAnalyticsSlice();
    if (analytics.sessions) db.sessions = analytics.sessions;
    if (analytics.pageviews) db.pageviews = analytics.pageviews;
    lastCatalogSnap = catalogSnapshot(db);
    if (
      !Array.isArray(raw.categories) ||
      raw.categories.length === 0 ||
      (raw.tools?.length || 0) !== db.tools.length ||
      !Array.isArray(raw.ads) ||
      !Array.isArray(raw.sessions) ||
      !Array.isArray(raw.pageviews)
    ) {
      lastCatalogSnap = "";
    }
    return db;
  } catch {
    return emptyDb();
  }
}

async function ensureMemory() {
  if (process.env.VERCEL && !usesPostgres() && !vercelPersistWarned) {
    vercelPersistWarned = true;
    console.warn(
      "[forge] DATABASE_URL is not set on Vercel. Set it to your Supabase Postgres URI so data persists.",
    );
  }
  if (!memory) {
    memory = await readFileDb();
  } else if (usesPostgres() && performance.now() - catalogCheckedAt > VERSION_CHECK_MS) {
    await refreshCatalogIfChanged();
  }
  const dirty = await applyRuntimeDefaults(memory);
  if (dirty && !process.env.VERCEL) await persistCatalog();
  return memory;
}

async function refreshCatalogIfChanged() {
  catalogCheckedAt = performance.now();
  try {
    const store = await postgresStore();
    const versions = await store.readStoreVersions();
    if (versions.catalog === catalogVersion) return;
    const catalog = await store.loadCatalog();
    const { db } = await hydrateFromRaw(catalog.value);
    if (memory) applyAnalytics(db, memory);
    memory = db;
    catalogVersion = catalog.version;
    lastCatalogSnap = "__postgres__";
  } catch (error) {
    console.error("[forge] Postgres catalog refresh failed, keeping cached copy", error);
  }
}

async function refreshAnalyticsIfChanged() {
  if (!usesPostgres() || !memory) return;
  if (performance.now() - analyticsCheckedAt < ANALYTICS_CHECK_MS) return;
  analyticsCheckedAt = performance.now();
  try {
    const store = await postgresStore();
    const versions = await store.readStoreVersions();
    if (versions.analytics === analyticsVersion) return;
    const analytics = await store.loadAnalytics();
    applyAnalytics(memory, analytics.value ?? {});
    analyticsVersion = analytics.version;
  } catch (error) {
    console.error("[forge] Postgres analytics refresh failed, keeping cached copy", error);
  }
}

type WriteOptions = {
  immediate?: boolean;
  /** Set false for writes that never change public pages (clicks, submissions, admin-only data). */
  publicChange?: boolean;
};

export function withDb<T>(
  fn: (db: Database) => T | Promise<T>,
  options?: WriteOptions,
): Promise<T> {
  const run = writeChain.then(async () => {
    if (usesPostgres() && options?.immediate !== false) {
      const cached = memory;
      let working = null as Database | null;
      let changed = false;
      try {
        const { withCatalogTransaction } = await postgresStore();
        const outcome = await withCatalogTransaction(catalogVersion, async (raw, reuseCached) => {
          let db: Database;
          if (reuseCached && cached) {
            db = cached;
          } else {
            db = (await hydrateFromRaw(raw)).db;
            if (cached) applyAnalytics(db, cached);
          }
          working = db;
          const before = contentSnapshot(db);
          const result = await fn(db);
          changed = contentSnapshot(db) !== before;
          return { result, next: changed ? db : null };
        });
        memory = working;
        // A skipped write leaves memory ahead of Postgres; force a reload next time.
        catalogVersion = changed && !outcome.written ? null : outcome.version;
        catalogCheckedAt = performance.now();
        lastCatalogSnap = "__postgres__";
        if (outcome.written && options?.publicChange !== false) revalidatePublicPages();
        return outcome.result;
      } catch (error) {
        if (working === cached) {
          // The in-memory copy may hold uncommitted edits; reload on next access.
          memory = null;
          catalogVersion = null;
        }
        const message = error instanceof Error ? error.message : "Database write failed";
        if (/Cannot find module ['"]pg['"]/i.test(message)) {
          throw new Error("Postgres driver was not bundled. Retry after the latest deploy.");
        }
        throw error instanceof Error ? error : new Error(message);
      }
    }
    const db = await ensureMemory();
    const result = await fn(db);
    memory = db;
    if (options?.immediate === false) {
      if (!usesPostgres()) scheduleFlush();
    } else {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await persistCatalog();
      await persistAnalytics();
      if (options?.publicChange !== false) revalidatePublicPages();
    }
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function readDb(): Promise<Database> {
  const run = writeChain.then(() => ensureMemory());
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Like readDb, plus fresh sessions, pageviews, and clicks (admin analytics only). */
export function readDbWithAnalytics(): Promise<Database> {
  const run = writeChain.then(async () => {
    const db = await ensureMemory();
    await refreshAnalyticsIfChanged();
    return memory ?? db;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function listAllTools() {
  const db = await readDb();
  return db.tools;
}

/*
 * Public-page loaders. Callers wrap these in "use cache", so they must not await
 * module-level promises (writeChain, shared loaders): a cached scope awaiting a promise
 * created in another scope hangs during prerendering.
 */

// `next build` prerenders many pages at once; on Vercel each worker gets a one-connection pool,
// so builds use the bundled snapshot (cached for minutes) and real data replaces it at runtime.
function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Published catalog with tools reduced to card fields (see loadPublicCatalog).
 * `live` is false when the bundled snapshot was used instead of Postgres.
 */
export async function loadPublicDb(): Promise<{ db: Database; live: boolean }> {
  if (!usesPostgres()) return { db: await ensureMemory(), live: true };
  if (isBuildPhase()) return { db: emptyDb(), live: false };
  try {
    const { loadPublicCatalog } = await postgresStore();
    const loaded = await loadPublicCatalog();
    if (!loaded.value) return { db: emptyDb(), live: false };
    return { db: normalizeDb(loaded.value), live: true };
  } catch (error) {
    console.error("[forge] Postgres public catalog load failed, using bundled snapshot", error);
    return { db: emptyDb(), live: false };
  }
}

/**
 * Full review record and whether it came from Postgres. Throws when Postgres fails,
 * so a broken render is never cached.
 */
type PublicToolCard = Pick<Tool, "slug" | "category" | "officialUrl" | "website">;

export async function loadPublicTool(card: PublicToolCard): Promise<{ tool: Tool | undefined; live: boolean }> {
  if (!usesPostgres() || isBuildPhase()) return snapshotTool(card);
  const { loadCatalogTool } = await postgresStore();
  const { tool, ready } = await loadCatalogTool(card.slug);
  if (!ready) return snapshotTool(card);
  return { tool: liveTool(card, tool), live: true };
}

async function snapshotTool(card: PublicToolCard): Promise<{ tool: Tool | undefined; live: boolean }> {
  const db = usesPostgres() ? emptyDb() : await ensureMemory();
  const tool = db.tools.find((item) => item.slug === card.slug);
  return { tool: tool && isPublished(tool) ? tool : undefined, live: !usesPostgres() };
}

/** Published tool for /go redirects, read from its own row instead of the full catalog. */
export async function getRedirectTool(slug: string): Promise<Tool | undefined> {
  if (!usesPostgres() || isBuildPhase()) return getToolBySlug(slug);
  const { loadCatalogTool } = await postgresStore();
  const { tool, ready } = await loadCatalogTool(slug);
  if (!ready) return (await snapshotTool({ slug } as Tool)).tool;
  if (tool) return isPublished(tool) ? normalizeTool(tool) : undefined;
  const entry = CORE_CATALOG.find((item) => catalogSlug(item) === slug);
  return entry ? expandCatalogEntry(entry, { status: "published" }) : undefined;
}

function liveTool(card: PublicToolCard, raw: Tool | null): Tool | undefined {
  if (raw) {
    if (!isPublished(raw)) return undefined;
    const tool = normalizeTool(raw);
    return {
      ...tool,
      category: card.category,
      officialUrl: tool.officialUrl || card.officialUrl,
      website: tool.website || card.website,
    };
  }
  // Core catalog tools that were never persisted are injected at hydration time.
  const entry = CORE_CATALOG.find((item) => catalogSlug(item) === card.slug);
  return entry ? expandCatalogEntry(entry, { status: "published" }) : undefined;
}

/** Last-30-day traffic for the Advertise page, aggregated in Postgres. */
export async function loadTrafficSummary(): Promise<{
  pageviews30d: number;
  visitors30d: number;
  topCountries: string[];
  live: boolean;
}> {
  const since = Date.now() - 30 * 86_400_000;
  if (usesPostgres()) {
    if (isBuildPhase()) return { pageviews30d: 0, visitors30d: 0, topCountries: [], live: false };
    try {
      const { loadPageviewSummary } = await postgresStore();
      const summary = await loadPageviewSummary(new Date(since).toISOString());
      return {
        pageviews30d: summary.pageviews,
        visitors30d: summary.visitors,
        topCountries: summary.topCountries,
        live: true,
      };
    } catch (error) {
      console.error("[forge] Postgres pageview summary failed", error);
      return { pageviews30d: 0, visitors30d: 0, topCountries: [], live: false };
    }
  }
  return { ...trafficFromMemory(await ensureMemory(), since), live: true };
}

export async function listTools() {
  const db = await readDb();
  return db.tools.filter(isPublished);
}

export async function getToolBySlug(slug: string, options?: { includeDrafts?: boolean }) {
  const db = await readDb();
  const tool = db.tools.find((item) => item.slug === slug);
  if (!tool) return undefined;
  if (!options?.includeDrafts && !isPublished(tool)) return undefined;
  return tool;
}

export async function getFeaturedTools() {
  const db = await readDb();
  return db.tools.filter((tool) => isPublished(tool) && tool.featured);
}

export async function getDealTools() {
  const db = await readDb();
  return db.tools.filter(
    (tool) => isPublished(tool) && Boolean(tool.couponCode || tool.dealText),
  );
}

export async function listCategories() {
  const db = await readDb();
  return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addCategory(name: string, slug?: string) {
  return withDb((db) => {
    const record = normalizeCategory(
      { name, slug: slug || slugify(name), sortOrder: db.categories.length + 1 },
      db.categories.length,
    );
    if (db.categories.some((item) => item.slug === record.slug)) {
      throw new Error("A category with that slug already exists.");
    }
    db.categories.push(record);
    return record;
  });
}

export async function updateCategory(
  slug: string,
  patch: { name?: string; slug?: string },
) {
  return withDb((db) => {
    const item = db.categories.find((row) => row.slug === slug);
    if (!item) return null;
    const nextName = patch.name?.trim() || item.name;
    const nextSlug = slugify(patch.slug || nextName) || item.slug;
    if (nextSlug !== item.slug && db.categories.some((row) => row.slug === nextSlug)) {
      throw new Error("A category with that slug already exists.");
    }
    const previous = item.slug;
    item.name = nextName;
    item.slug = nextSlug;
    if (previous !== nextSlug) {
      for (const tool of db.tools) {
        if (tool.category === previous) tool.category = nextSlug;
      }
      for (const submission of db.submissions) {
        if (submission.category === previous) submission.category = nextSlug;
      }
    }
    return item;
  });
}

export async function deleteCategory(slug: string) {
  return withDb((db) => {
    if (db.categories.length <= 1) {
      throw new Error("Keep at least one category.");
    }
    const fallback = db.categories.find((item) => item.slug !== slug);
    if (!fallback) throw new Error("Keep at least one category.");
    const before = db.categories.length;
    db.categories = db.categories.filter((item) => item.slug !== slug);
    for (const tool of db.tools) {
      if (tool.category === slug) tool.category = fallback.slug;
    }
    for (const submission of db.submissions) {
      if (submission.category === slug) submission.category = fallback.slug;
    }
    return before !== db.categories.length;
  });
}

export async function createManualTool(input: {
  name: string;
  slug?: string;
  officialUrl: string;
  affiliateUrl?: string;
  category: string;
  shortPitch?: string;
  overview?: string;
  pricingModel?: Tool["pricingModel"];
  featured?: boolean;
  status?: PublishStatus;
  affiliateNetwork?: string;
  commissionNote?: string;
  couponCode?: string;
  dealText?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return withDb((db) => {
    const name = input.name.trim();
    let slug = slugify(input.slug || name);
    if (!slug) throw new Error("A slug is required.");
    if (db.tools.some((item) => item.slug === slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const officialUrl = input.officialUrl.trim();
    if (!officialUrl) throw new Error("Official URL is required.");
    const tool = normalizeTool({
      slug,
      name,
      website: officialUrl,
      officialUrl,
      affiliateUrl: input.affiliateUrl || "",
      category: input.category,
      shortPitch: input.shortPitch || `${name} listing`,
      overview: input.overview || input.shortPitch || `${name} listing`,
      pricingModel: input.pricingModel || "Freemium",
      featured: Boolean(input.featured),
      affiliateNetwork: input.affiliateNetwork,
      commissionNote: input.commissionNote,
      couponCode: input.couponCode,
      dealText: input.dealText,
      rating: input.rating,
      reviewCount: input.reviewCount,
      status: input.status === "draft" ? "draft" : "published",
      createdAt: new Date().toISOString(),
    });
    db.tools.unshift(tool);
    return tool;
  });
}

export async function getRelatedTools(tool: Tool, limit = 3) {
  const db = await readDb();
  return db.tools
    .filter(
      (item) =>
        isPublished(item) &&
        item.slug !== tool.slug &&
        item.category === tool.category,
    )
    .slice(0, limit);
}

export async function listAllComparisons() {
  const db = await readDb();
  return db.comparisons;
}

export async function listComparisons() {
  const db = await readDb();
  return db.comparisons.filter((item) => {
    if (!isPublished(item)) return false;
    const toolA = db.tools.find((tool) => tool.slug === item.toolASlug);
    const toolB = db.tools.find((tool) => tool.slug === item.toolBSlug);
    return Boolean(toolA && toolB && isPublished(toolA) && isPublished(toolB));
  });
}

export async function getComparisonBySlug(
  slug: string,
  options?: { includeDrafts?: boolean },
) {
  const db = await readDb();
  const item = db.comparisons.find((row) => row.slug === slug);
  if (!item) return undefined;
  if (!options?.includeDrafts && !isPublished(item)) return undefined;
  return item;
}

export async function getComparisonTools(
  comparison: Comparison,
  options?: { includeDrafts?: boolean },
) {
  const db = await readDb();
  const toolA = db.tools.find((tool) => tool.slug === comparison.toolASlug);
  const toolB = db.tools.find((tool) => tool.slug === comparison.toolBSlug);
  if (!toolA || !toolB) return null;
  if (!options?.includeDrafts && (!isPublished(toolA) || !isPublished(toolB))) {
    return null;
  }
  return { toolA, toolB };
}

export async function listDrafts() {
  const db = await readDb();
  const tools = uniqueLatest(
    db.tools
      .filter((tool) => tool.status === "draft")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    (tool) => toolNameKey(tool.name),
  );
  const comparisons = uniqueLatest(
    db.comparisons
      .filter((item) => item.status === "draft")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    comparisonPairKey,
  );
  return { tools, comparisons, count: tools.length + comparisons.length };
}

export async function listSubmissions() {
  const db = await readDb();
  return [...db.submissions].sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export async function addSubmission(
  input: Omit<Submission, "id" | "status" | "submittedAt">,
) {
  return withDb((db) => {
    const submission: Submission = {
      ...input,
      id: newId("sub"),
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    db.submissions.unshift(submission);
    return submission;
  }, { publicChange: false });
}

function toolFromSubmission(submission: Submission): Tool {
  return normalizeTool({
    slug: slugify(submission.name),
    name: submission.name,
    website: submission.website,
    officialUrl: submission.website,
    affiliateUrl: "",
    shortPitch: submission.pitch,
    overview: submission.pitch,
    category: submission.category,
    pricingModel: submission.pricingModel,
    featured: submission.tier === "featured",
    bestFor: submission.pitch,
    features: ["Submitted by founder — expand this review in Admin → AI Studio"],
    seoTitle: `${submission.name} Review`,
    metaDescription: submission.pitch.slice(0, 155),
    status: "published",
    createdAt: new Date().toISOString(),
  });
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
) {
  return withDb((db) => {
    const item = db.submissions.find((row) => row.id === id);
    if (!item) return null;
    item.status = status;
    if (status === "approved") {
      const tool = toolFromSubmission(item);
      if (!db.tools.some((existing) => existing.slug === tool.slug)) {
        db.tools.unshift(tool);
      }
    }
    return item;
  });
}

export async function upsertHeartbeat(input: {
  sessionId: string;
  country: string;
}) {
  const now = new Date().toISOString();
  if (usesPostgres()) {
    await touchSession(input.sessionId, input.country, now);
    return;
  }
  await withDb((db) => {
    const existing = db.sessions.find((session) => session.id === input.sessionId);
    if (existing) {
      existing.lastSeen = now;
      existing.country = input.country || existing.country;
    } else {
      db.sessions.push({
        id: input.sessionId,
        country: input.country,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }, { immediate: false });
}

async function touchSession(sessionId: string, country: string, now: string) {
  try {
    const { touchAnalyticsSession } = await postgresStore();
    await touchAnalyticsSession(
      { id: sessionId, country, firstSeen: now, lastSeen: now },
      country ? { lastSeen: now, country } : { lastSeen: now },
    );
  } catch (error) {
    console.error("[forge] heartbeat write failed", error);
  }
}

async function appendEvent(field: "pageviews" | "clicks", event: PageviewEvent | ClickEvent) {
  try {
    const { appendAnalyticsEvent } = await postgresStore();
    await appendAnalyticsEvent(field, event);
  } catch (error) {
    console.error(`[forge] ${field} write failed`, error);
  }
}

export async function recordPageview(input: {
  sessionId: string;
  path: string;
  country: string;
}) {
  const event: PageviewEvent = {
    id: newId("pv"),
    sessionId: input.sessionId,
    path: input.path,
    country: input.country,
    timestamp: new Date().toISOString(),
  };
  if (usesPostgres()) {
    await appendEvent("pageviews", event);
    await touchSession(input.sessionId, input.country, event.timestamp);
    return event;
  }
  await withDb((db) => {
    db.pageviews.push(event);
    const session = db.sessions.find((item) => item.id === input.sessionId);
    const now = event.timestamp;
    if (session) {
      session.lastSeen = now;
      session.country = input.country || session.country;
    } else {
      db.sessions.push({
        id: input.sessionId,
        country: input.country,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }, { immediate: false });
  return event;
}

export async function recordClick(slug: string, country: string) {
  const event: ClickEvent = {
    id: newId("clk"),
    slug,
    country,
    timestamp: new Date().toISOString(),
  };
  if (usesPostgres()) {
    await appendEvent("clicks", event);
    return event;
  }
  await withDb((db) => {
    db.clicks.push(event);
  }, { publicChange: false });
  return event;
}

export async function listAds() {
  const db = await readDb();
  return db.ads;
}

export async function expireEndedAds() {
  return withDb((db) => expireAds(db));
}

export async function listLiveAds(placement?: AdPlacement, category?: string) {
  const db = await readDb();
  return db.ads
    .filter((ad) => {
      if (!isAdLive(ad)) return false;
      if (placement && ad.placement !== placement) return false;
      if (placement === "category_sponsor" && category && ad.targetCategory !== category) {
        return false;
      }
      return true;
    })
    .map(publicAd);
}

const isPendingPaidBooking = isNewPaidBooking;

export async function countNewBookings() {
  const db = await readDb();
  return db.ads.filter(isNewPaidBooking).length;
}

export function featuredAvailability(db: Database): AdvertiseAvailability {
  const now = Date.now();
  const booked = db.ads.filter(
    (ad) => ad.placement === "hero_banner" && (isAdLive(ad, now) || isPendingPaidBooking(ad)),
  );
  if (!booked.length) return { available: true, nextOpening: null };
  if (booked.some((ad) => !ad.endDate)) return { available: false, nextOpening: null };
  const lastEnd = Math.max(...booked.map((ad) => new Date(ad.endDate).getTime()));
  return {
    available: false,
    nextOpening: Number.isFinite(lastEnd) ? new Date(lastEnd).toISOString() : null,
  };
}

export async function getFeaturedAvailability() {
  return featuredAvailability(await readDb());
}

/** Current availability and the price/duration new orders are charged. */
export async function getFeaturedCheckout() {
  const db = await readDb();
  return { availability: featuredAvailability(db), placement: sponsoredPlacement(db.settings) };
}

export async function updateSponsoredPlacement(placement: SponsoredPlacement) {
  return withDb((db) => {
    db.settings.sponsoredName = placement.name;
    db.settings.sponsoredPrice = placement.price;
    db.settings.sponsoredDays = placement.days;
    db.settings.sponsoredOfferPrice = placement.offer?.price ?? 0;
    db.settings.sponsoredOfferStart = placement.offer?.startsAt ?? "";
    db.settings.sponsoredOfferEnd = placement.offer?.endsAt ?? "";
    return sponsoredPlacement(db.settings);
  });
}

function trafficFromMemory(db: Database, since: number): Omit<AdvertiseStats, "publishedTools" | "categories"> {
  const recent = db.pageviews.filter((event) => new Date(event.timestamp).getTime() >= since);
  const countries = new Map<string, number>();
  for (const event of recent) {
    if (!event.country || event.country === "UN") continue;
    countries.set(event.country, (countries.get(event.country) ?? 0) + 1);
  }
  return {
    pageviews30d: recent.length,
    visitors30d: new Set(recent.map((event) => event.sessionId)).size,
    topCountries: [...countries.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code),
  };
}

export async function hasAdPayment(paymentRef: string) {
  const db = await readDb();
  return db.ads.some((ad) => ad.paymentRef === paymentRef);
}

/** Records a paid homepage booking as a paused campaign awaiting editorial review. */
export async function createPaidFeaturedAd(
  input: AdvertiseOrderInput,
  payment: { orderId: string; captureId: string; payerEmail: string; price: number; days: number },
) {
  return withDb((db) => {
    const existing = db.ads.find((ad) => ad.paymentRef === payment.orderId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const { name } = sponsoredPlacement(db.settings);
    const ad = normalizeAd({
      id: newId("ad"),
      title: `${input.toolName} · ${name}`,
      partnerName: input.toolName,
      partnershipType: "Paid Sponsorship ($)",
      placement: "hero_banner",
      headline: input.headline,
      subheadline: input.description,
      ctaText: `Visit ${input.toolName}`,
      targetUrl: input.website,
      badgeText: "Sponsored",
      commissionOrFeeNote: `PayPal capture ${payment.captureId} · $${payment.price} · ${payment.days} days from activation · contact ${input.email}${payment.payerEmail && payment.payerEmail !== input.email ? ` · payer ${payment.payerEmail}` : ""}`,
      fixedFeeEarned: payment.price,
      status: "paused",
      paidDays: payment.days,
      paymentRef: payment.orderId,
      contactEmail: input.email,
      createdAt: now,
      updatedAt: now,
    });
    db.ads.unshift(ad);
    return ad;
  });
}

export async function getAdById(id: string) {
  const db = await readDb();
  return db.ads.find((item) => item.id === id);
}

function maybePublishPartnerTool(
  db: Database,
  input: Partial<AdCampaign> & { alsoPublishTool?: boolean },
) {
  const currentSlug = input.toolSlug?.trim() || "";
  const existing = currentSlug
    ? db.tools.find((item) => item.slug === currentSlug)
    : undefined;
  if (existing) return existing;
  if (!input.alsoPublishTool) return existing;
  const name = (input.partnerName || input.title || "").trim();
  const url = (input.targetUrl || "").trim();
  if (!name) throw new Error("Partner name is required to publish a directory listing.");
  if (!url) throw new Error("Target URL is required to publish a directory listing.");
  let slug = slugify(currentSlug || name);
  if (!slug) slug = `partner-${Date.now().toString(36)}`;
  if (db.tools.some((item) => item.slug === slug)) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const category =
    input.targetCategory?.trim() || db.categories[0]?.slug || DEFAULT_CATEGORIES[0].slug;
  const tool = normalizeTool({
    slug,
    name,
    website: url,
    officialUrl: url,
    affiliateUrl: url,
    category,
    shortPitch: input.subheadline || input.headline || `${name} partner listing`,
    overview: input.subheadline || input.headline || `${name} partner listing`,
    featured: input.placement === "pinned_grid" || input.placement === "hero_banner",
    affiliateNetwork: input.partnershipType,
    commissionNote: input.commissionOrFeeNote,
    couponCode: input.couponCode,
    dealText: input.ctaText,
    status: "published",
    createdAt: new Date().toISOString(),
  });
  db.tools.unshift(tool);
  return tool;
}

export async function createAd(
  input: Partial<AdCampaign> & { title: string; alsoPublishTool?: boolean },
) {
  return withDb((db) => {
    const linked = maybePublishPartnerTool(db, input);
    const ad = normalizeAd({
      ...input,
      id: newId("ad"),
      title: input.title,
      partnerName: input.partnerName || linked?.name || input.title,
      toolSlug: linked?.slug || input.toolSlug || "",
      targetUrl: input.targetUrl || linked?.affiliateUrl || linked?.officialUrl || "",
      couponCode: input.couponCode || linked?.couponCode || "",
      impressions: 0,
      clicks: 0,
      feePosted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    maybePostAdFee(db, ad);
    db.ads.unshift(ad);
    return ad;
  });
}

export async function updateAd(
  id: string,
  patch: Partial<AdCampaign> & { alsoPublishTool?: boolean },
) {
  return withDb((db) => {
    const ad = db.ads.find((item) => item.id === id);
    if (!ad) return null;
    const merged = { ...ad, ...patch };
    if (ad.status !== "active" && merged.status === "active" && ad.paidDays && !merged.endDate) {
      const start = merged.startDate ? new Date(merged.startDate) : new Date();
      const begin = Number.isFinite(start.getTime()) ? start : new Date();
      merged.startDate = begin.toISOString();
      merged.endDate = new Date(begin.getTime() + ad.paidDays * 86_400_000).toISOString();
    }
    const linked = maybePublishPartnerTool(db, merged);
    Object.assign(
      ad,
      normalizeAd({
        ...merged,
        id: ad.id,
        impressions: ad.impressions,
        clicks: ad.clicks,
        feePosted: ad.feePosted,
        createdAt: ad.createdAt,
        toolSlug: linked?.slug || merged.toolSlug || "",
        partnerName: merged.partnerName || linked?.name || ad.partnerName,
        targetUrl: merged.targetUrl || linked?.affiliateUrl || linked?.officialUrl || ad.targetUrl,
        updatedAt: new Date().toISOString(),
      }),
    );
    maybePostAdFee(db, ad);
    return ad;
  });
}

export async function deleteAd(id: string) {
  return withDb((db) => {
    const before = db.ads.length;
    db.ads = db.ads.filter((item) => item.id !== id);
    return before !== db.ads.length;
  });
}

export async function recordAdImpression(id: string) {
  const recorded = await recordAdImpressions([id]);
  return recorded > 0;
}

export async function recordAdImpressions(ids: string[]) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return 0;
  return withDb((db) => {
    expireAds(db);
    const now = new Date().toISOString();
    let count = 0;
    for (const id of unique) {
      const ad = db.ads.find((item) => item.id === id);
      if (!ad || !isAdLive(ad)) continue;
      ad.impressions += 1;
      ad.updatedAt = now;
      count += 1;
    }
    return count;
  }, { immediate: false });
}

export async function recordAdClick(id: string, country: string) {
  const ad = await withDb((db) => {
    expireAds(db);
    const ad = db.ads.find((item) => item.id === id);
    if (!ad || !isAdLive(ad)) return null;
    ad.clicks += 1;
    ad.updatedAt = new Date().toISOString();
    if (!usesPostgres()) db.clicks.push(clickEvent(ad, country));
    return ad;
  }, { publicChange: false });
  if (ad && usesPostgres()) await appendEvent("clicks", clickEvent(ad, country));
  return ad;
}

function clickEvent(ad: AdCampaign, country: string): ClickEvent {
  return {
    id: newId("clk"),
    slug: ad.toolSlug || `ad:${ad.id}`,
    country,
    timestamp: new Date().toISOString(),
  };
}

export async function updateSettings(epc: number) {
  return withDb((db) => {
    db.settings.epc = Math.max(0, epc);
    return { epc: db.settings.epc };
  });
}

export async function updateSeoSettings(patch: {
  siteDomain?: string;
  serperApiKey?: string;
  googleCseKey?: string;
  googleCseCx?: string;
  homeSeoTitle?: string;
  homeSeoDescription?: string;
}) {
  return withDb((db) => {
    if (patch.siteDomain !== undefined) db.settings.siteDomain = patch.siteDomain.trim();
    if (patch.serperApiKey !== undefined) db.settings.serperApiKey = patch.serperApiKey.trim();
    if (patch.googleCseKey !== undefined) db.settings.googleCseKey = patch.googleCseKey.trim();
    if (patch.googleCseCx !== undefined) db.settings.googleCseCx = patch.googleCseCx.trim();
    if (patch.homeSeoTitle !== undefined) {
      db.settings.homeSeoTitle = patch.homeSeoTitle.trim() || DEFAULT_HOME_TITLE;
    }
    if (patch.homeSeoDescription !== undefined) {
      db.settings.homeSeoDescription =
        patch.homeSeoDescription.trim() || DEFAULT_HOME_DESCRIPTION;
    }
    return db.settings;
  });
}

export function publicSeoSettings(settings: AppSettings) {
  return {
    epc: settings.epc,
    siteDomain: settings.siteDomain,
    homeSeoTitle: settings.homeSeoTitle,
    homeSeoDescription: settings.homeSeoDescription,
    serperConfigured: Boolean(settings.serperApiKey),
    googleCseConfigured: Boolean(settings.googleCseKey && settings.googleCseCx),
  };
}

export async function addVisitorRating(slug: string, stars: number) {
  return withDb((db) => {
    const tool = db.tools.find((item) => item.slug === slug && isPublished(item));
    if (!tool) return null;
    const vote = Math.min(5, Math.max(1, Math.round(Number(stars))));
    const count = Math.max(0, Number(tool.reviewCount) || 0);
    const current = Number.isFinite(tool.rating) ? tool.rating : 0;
    const nextCount = count + 1;
    const nextRating = Math.round(((current * count + vote) / nextCount) * 10) / 10;
    tool.reviewCount = nextCount;
    tool.rating = Math.min(5, Math.max(1, nextRating));
    return { rating: tool.rating, reviewCount: tool.reviewCount };
  });
}

export async function upsertRankCheck(snapshot: RankSnapshot) {
  return withDb((db) => {
    const index = db.rankChecks.findIndex((item) => item.path === snapshot.path);
    if (index >= 0) db.rankChecks[index] = snapshot;
    else db.rankChecks.unshift(snapshot);
    return snapshot;
  }, { publicChange: false });
}

export async function getRankChecks() {
  const db = await readDb();
  return db.rankChecks;
}

export async function getAdminAuthSettings() {
  const db = await readDb();
  return {
    adminPasswordHash: db.settings.adminPasswordHash,
    sessionSecret: db.settings.sessionSecret,
  };
}

export async function changeAdminPasswordHash(hash: string) {
  return withDb((db) => {
    db.settings.adminPasswordHash = hash;
    return true;
  }, { publicChange: false });
}

export async function rotateSessionSecret() {
  return withDb((db) => {
    db.settings.sessionSecret = newSessionSecret();
    return db.settings.sessionSecret;
  }, { publicChange: false });
}

export async function listGeminiKeys() {
  const db = await readDb();
  return db.geminiKeys.map(toPublicGeminiKey);
}

export async function hasUsableGeminiKey() {
  const db = await readDb();
  return db.geminiKeys.some((item) => item.enabled && item.key && item.status !== "invalid");
}

export async function addGeminiKey(label: string, key: string) {
  return withDb((db) => {
    const trimmed = key.trim();
    if (!trimmed) return null;
    if (db.geminiKeys.some((item) => item.key === trimmed)) {
      throw new Error("That API key is already saved.");
    }
    const record = normalizeGeminiKey({
      label: label.trim() || `Key ${db.geminiKeys.length + 1}`,
      key: trimmed,
      enabled: true,
      status: "active",
      usageCount: 0,
      lastUsedAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
    });
    db.geminiKeys.push(record);
    return toPublicGeminiKey(record);
  }, { publicChange: false });
}

export async function setGeminiKeyEnabled(id: string, enabled: boolean) {
  return withDb((db) => {
    const item = db.geminiKeys.find((row) => row.id === id);
    if (!item) return null;
    item.enabled = enabled;
    return toPublicGeminiKey(item);
  }, { publicChange: false });
}

export async function deleteGeminiKey(id: string) {
  return withDb((db) => {
    const before = db.geminiKeys.length;
    db.geminiKeys = db.geminiKeys.filter((item) => item.id !== id);
    return before !== db.geminiKeys.length;
  }, { publicChange: false });
}

export async function getGeminiKeyRecord(id: string) {
  const db = await readDb();
  return db.geminiKeys.find((item) => item.id === id) ?? null;
}

export async function listRotationGeminiKeys() {
  const db = await readDb();
  return db.geminiKeys
    .filter((item) => item.enabled && item.key && item.status !== "invalid")
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return aTime - bTime;
    });
}

export async function recordGeminiKeyResult(
  id: string,
  result: { ok: boolean; status?: number; error?: string },
) {
  return withDb((db) => {
    const item = db.geminiKeys.find((row) => row.id === id);
    if (!item) return null;
    item.usageCount += 1;
    item.lastUsedAt = new Date().toISOString();
    if (result.ok) {
      item.status = "active";
      item.lastError = null;
    } else if (result.status === 429) {
      item.status = "quota_exceeded";
      item.lastError = result.error || "Quota exceeded (429)";
    } else if (result.status === 400 || result.status === 401 || result.status === 403) {
      item.status = "invalid";
      item.lastError = result.error || `Rejected (${result.status})`;
    } else {
      item.lastError = result.error || "Request failed";
    }
    return toPublicGeminiKey(item);
  }, { publicChange: false });
}

export async function addCommission(input: {
  amount: number;
  note: string;
  slug?: string;
}) {
  return withDb((db) => {
    const commission: Commission = {
      id: newId("com"),
      amount: input.amount,
      note: input.note,
      slug: input.slug,
      timestamp: new Date().toISOString(),
    };
    db.commissions.unshift(commission);
    return commission;
  });
}

export async function updateTool(slug: string, patch: Partial<Tool>) {
  return withDb((db) => {
    const tool = db.tools.find((item) => item.slug === slug);
    if (!tool) return null;
    const { slug: _ignore, ...rest } = patch;
    if (rest.officialUrl && !rest.website) rest.website = rest.officialUrl;
    if (rest.website && !rest.officialUrl) rest.officialUrl = rest.website;
    if (rest.dealText && !rest.couponDiscount) rest.couponDiscount = rest.dealText;
    const next = normalizeTool({ ...tool, ...rest, slug: tool.slug, name: rest.name || tool.name });
    Object.assign(tool, next);
    return tool;
  });
}

export async function deleteTool(slug: string) {
  return withDb((db) => {
    const before = db.tools.length;
    db.tools = db.tools.filter((tool) => tool.slug !== slug);
    db.comparisons = db.comparisons.filter(
      (item) => item.toolASlug !== slug && item.toolBSlug !== slug,
    );
    return before !== db.tools.length;
  });
}

export function toolFromGenerated(review: GeneratedReview, status: PublishStatus = "draft"): Tool {
  const name = review.name.trim();
  const slug = review.slug || slugify(name);
  const website = review.website?.trim() || review.officialUrl?.trim() || "";
  return normalizeTool({
    slug,
    name,
    website,
    officialUrl: review.officialUrl || website,
    affiliateUrl:
      review.affiliateUrl && review.affiliateUrl !== website ? review.affiliateUrl : "",
    shortPitch: review.shortPitch,
    overview: review.overview,
    category: review.category,
    pricingModel: review.pricingModel,
    rating: review.rating,
    reviewCount: review.reviewCount,
    featured: Boolean(review.featured),
    brandColor: review.brandColor || "#FFB020",
    founded: review.founded || String(new Date().getFullYear()),
    bestFor: review.bestFor || review.shortPitch,
    features: review.features ?? [],
    pros: review.pros ?? [],
    cons: review.cons ?? [],
    pricingTiers: review.pricingTiers ?? [],
    faqs: review.faqs ?? [],
    seoTitle: review.seoTitle,
    metaDescription: review.metaDescription,
    conversionNote: "",
    status,
    createdAt: new Date().toISOString(),
    jsonLd: review.schema,
  });
}

function comparisonFromGenerated(draft: GeneratedComparison): Comparison {
  return normalizeComparison({
    slug: draft.slug || `${draft.toolASlug}-vs-${draft.toolBSlug}`,
    toolASlug: draft.toolASlug,
    toolBSlug: draft.toolBSlug,
    tagline: draft.tagline,
    verdict: draft.verdict,
    overallWinner: draft.overallWinner,
    rows: draft.rows,
    seoTitle: draft.seoTitle,
    metaDescription: draft.metaDescription,
    affiliateUrl: draft.affiliateUrl || "",
    status: "draft",
    createdAt: new Date().toISOString(),
    jsonLd: draft.schema,
  });
}

export async function ingestCatalogTools(tools: Tool[]) {
  return withDb((db) => {
    const added: Tool[] = [];
    const taken = new Set(
      db.tools.flatMap((tool) => [tool.slug, tool.name.trim().toLowerCase()]),
    );
    for (const tool of tools) {
      if (taken.has(tool.slug) || taken.has(tool.name.trim().toLowerCase())) continue;
      const record = normalizeTool(tool);
      db.tools.unshift(record);
      taken.add(record.slug);
      taken.add(record.name.trim().toLowerCase());
      added.push(record);
    }
    return added;
  });
}

export type CatalogSyncResult = {
  sourceTools: number;
  addedTools: number;
  addedComparisons: number;
  addedCategories: number;
  storeTools: number;
  publishedTools: number;
  added: Array<{ slug: string; name: string; status: PublishStatus }>;
};

export async function syncCatalogFromSnapshot(
  snapshot: Partial<Database>,
): Promise<CatalogSyncResult> {
  if (!usesPostgres()) {
    throw new Error("DATABASE_URL is not set. Catalog sync writes to Supabase Postgres.");
  }
  const incomingTools = Array.isArray(snapshot.tools) ? snapshot.tools : [];
  const incomingComparisons = Array.isArray(snapshot.comparisons) ? snapshot.comparisons : [];
  const incomingCategories = Array.isArray(snapshot.categories) ? snapshot.categories : [];

  return withDb((db) => {
    const added: CatalogSyncResult["added"] = [];
    const takenTools = new Set(
      db.tools.flatMap((tool) => [tool.slug, toolNameKey(tool.name)]),
    );
    for (const raw of incomingTools) {
      if (!raw?.slug && !raw?.name) continue;
      const record = normalizeTool(raw);
      if (takenTools.has(record.slug) || takenTools.has(toolNameKey(record.name))) continue;
      db.tools.push(record);
      takenTools.add(record.slug);
      takenTools.add(toolNameKey(record.name));
      added.push({ slug: record.slug, name: record.name, status: record.status });
    }

    let addedComparisons = 0;
    const takenComparisons = new Set(
      db.comparisons.flatMap((item) => [item.slug, comparisonPairKey(item)]),
    );
    for (const raw of incomingComparisons) {
      if (!raw?.slug) continue;
      const record = normalizeComparison(raw);
      if (
        takenComparisons.has(record.slug) ||
        takenComparisons.has(comparisonPairKey(record))
      ) {
        continue;
      }
      db.comparisons.push(record);
      takenComparisons.add(record.slug);
      takenComparisons.add(comparisonPairKey(record));
      addedComparisons += 1;
    }

    let addedCategories = 0;
    const takenCategories = new Set(db.categories.map((item) => item.slug));
    for (const raw of incomingCategories) {
      if (!raw?.slug || takenCategories.has(raw.slug)) continue;
      db.categories.push(normalizeCategory(raw, db.categories.length));
      takenCategories.add(raw.slug);
      addedCategories += 1;
    }

    return {
      sourceTools: incomingTools.length,
      addedTools: added.length,
      addedComparisons,
      addedCategories,
      storeTools: db.tools.length,
      publishedTools: db.tools.filter((tool) => tool.status === "published").length,
      added,
    };
  });
}

export async function syncCatalogFromLocalFile(): Promise<CatalogSyncResult> {
  const text = await readFile(DB_PATH, "utf8");
  return syncCatalogFromSnapshot(JSON.parse(text) as Partial<Database>);
}

function findToolDraftIndex(db: Database, tool: Tool) {
  const nameKey = toolNameKey(tool.name);
  const draftByName = db.tools.findIndex(
    (item) => item.status === "draft" && toolNameKey(item.name) === nameKey,
  );
  if (draftByName >= 0) return draftByName;
  const draftSlug = tool.slug.endsWith("-draft") ? tool.slug : `${tool.slug}-draft`;
  const draftBySlug = db.tools.findIndex(
    (item) => item.status === "draft" && (item.slug === tool.slug || item.slug === draftSlug),
  );
  if (draftBySlug >= 0) return draftBySlug;
  return db.tools.findIndex(
    (item) => item.status === "draft" && slugify(item.name) === slugify(tool.name),
  );
}

export async function saveToolDraft(review: GeneratedReview) {
  return withDb((db) => {
    const tool = toolFromGenerated(review, "draft");
    const draftIndex = findToolDraftIndex(db, tool);
    if (draftIndex >= 0) {
      const previous = db.tools[draftIndex];
      db.tools[draftIndex] = {
        ...previous,
        ...tool,
        slug: previous.slug,
        createdAt: previous.createdAt,
        status: "draft",
      };
      return db.tools[draftIndex];
    }
    const published = db.tools.find(
      (item) =>
        item.status === "published" &&
        (item.slug === tool.slug || toolNameKey(item.name) === toolNameKey(tool.name)),
    );
    if (published) {
      tool.slug = `${published.slug}-draft`;
      const existingDraft = db.tools.findIndex((item) => item.slug === tool.slug);
      if (existingDraft >= 0) {
        db.tools[existingDraft] = {
          ...db.tools[existingDraft],
          ...tool,
          slug: tool.slug,
          status: "draft",
        };
        return db.tools[existingDraft];
      }
      db.tools.unshift(tool);
      return tool;
    }
    const slugIndex = db.tools.findIndex((item) => item.slug === tool.slug);
    if (slugIndex >= 0) {
      db.tools[slugIndex] = { ...db.tools[slugIndex], ...tool, status: "draft" };
      return db.tools[slugIndex];
    }
    db.tools.unshift(tool);
    return tool;
  });
}

/** @deprecated use saveToolDraft — AI output stays unpublished until human approval */
export async function publishTool(review: GeneratedReview) {
  return saveToolDraft(review);
}

export async function saveComparisonDraft(draft: GeneratedComparison) {
  return withDb((db) => {
    const comparison = comparisonFromGenerated(draft);
    const pair = comparisonPairKey(comparison);
    const draftIndex = db.comparisons.findIndex(
      (item) => item.status === "draft" && comparisonPairKey(item) === pair,
    );
    if (draftIndex >= 0) {
      const previous = db.comparisons[draftIndex];
      db.comparisons[draftIndex] = {
        ...previous,
        ...comparison,
        slug: previous.slug,
        createdAt: previous.createdAt,
        status: "draft",
      };
      return db.comparisons[draftIndex];
    }
    const index = db.comparisons.findIndex((item) => item.slug === comparison.slug);
    if (index >= 0 && db.comparisons[index].status === "published") {
      comparison.slug = `${comparison.slug}-draft`;
      const existingDraft = db.comparisons.findIndex((item) => item.slug === comparison.slug);
      if (existingDraft >= 0) {
        db.comparisons[existingDraft] = {
          ...db.comparisons[existingDraft],
          ...comparison,
          slug: comparison.slug,
          status: "draft",
        };
        return db.comparisons[existingDraft];
      }
      db.comparisons.unshift(comparison);
    } else if (index >= 0) {
      db.comparisons[index] = { ...db.comparisons[index], ...comparison, status: "draft" };
    } else {
      db.comparisons.unshift(comparison);
    }
    return comparison;
  });
}

export async function publishComparison(draft: GeneratedComparison) {
  return saveComparisonDraft(draft);
}

export async function updateComparison(slug: string, patch: Partial<Comparison>) {
  return withDb((db) => {
    const item = db.comparisons.find((row) => row.slug === slug);
    if (!item) return null;
    const { slug: _ignore, ...rest } = patch;
    const next = normalizeComparison({ ...item, ...rest, slug: item.slug });
    Object.assign(item, next);
    return item;
  });
}

function publishableSlug(db: Database, tool: Tool) {
  const stripped = tool.slug.replace(/-draft$/, "");
  if (stripped === tool.slug) return tool.slug;
  const taken = db.tools.some((item) => item !== tool && item.slug === stripped);
  return taken ? tool.slug : stripped;
}

function publishComparisonInPlace(db: Database, item: Comparison) {
  item.status = "published";
  if (item.affiliateUrl) {
    const winnerSlug = item.overallWinner === "b" ? item.toolBSlug : item.toolASlug;
    const tool = db.tools.find((row) => row.slug === winnerSlug);
    if (tool && (!tool.affiliateUrl || tool.affiliateUrl === tool.website)) {
      tool.affiliateUrl = item.affiliateUrl;
    }
  }
  if (item.couponCode) {
    for (const slugKey of [item.toolASlug, item.toolBSlug]) {
      const tool = db.tools.find((row) => row.slug === slugKey);
      if (tool && !tool.couponCode) {
        tool.couponCode = item.couponCode;
        tool.couponDiscount = item.couponDiscount;
      }
    }
  }
}

export async function approveTool(slug: string) {
  return withDb((db) => {
    const tool = db.tools.find((item) => item.slug === slug);
    if (!tool) return null;
    tool.status = "published";
    return tool;
  });
}

export async function approveComparison(slug: string) {
  return withDb((db) => {
    const item = db.comparisons.find((row) => row.slug === slug);
    if (!item) return null;
    publishComparisonInPlace(db, item);
    return item;
  });
}

export async function approveAllDrafts() {
  const result = await withDb((db) => {
    pruneDuplicateDrafts(db);
    const draftTools = db.tools.filter((tool) => tool.status === "draft");
    const drop = new Set<string>();
    const rewrite = new Map<string, string>();

    for (const tool of draftTools) {
      const existing = db.tools.find(
        (item) =>
          item.status !== "draft" &&
          !drop.has(item.slug) &&
          toolNameKey(item.name) === toolNameKey(tool.name),
      );
      if (existing) {
        Object.assign(existing, tool, {
          slug: existing.slug,
          createdAt: existing.createdAt,
          status: "published" as const,
        });
        drop.add(tool.slug);
        rewrite.set(tool.slug, existing.slug);
        continue;
      }
      const nextSlug = publishableSlug(db, tool);
      if (nextSlug !== tool.slug) rewrite.set(tool.slug, nextSlug);
      tool.slug = nextSlug;
      tool.status = "published";
    }

    if (drop.size) {
      db.tools = db.tools.filter((tool) => !drop.has(tool.slug));
    }
    if (rewrite.size) {
      for (const comparison of db.comparisons) {
        comparison.toolASlug = rewrite.get(comparison.toolASlug) || comparison.toolASlug;
        comparison.toolBSlug = rewrite.get(comparison.toolBSlug) || comparison.toolBSlug;
      }
    }

    const draftComparisons = db.comparisons.filter((item) => item.status === "draft");
    for (const item of draftComparisons) {
      publishComparisonInPlace(db, item);
    }

    return {
      tools: draftTools.length,
      comparisons: draftComparisons.length,
      count: draftTools.length + draftComparisons.length,
      published: db.tools.filter((tool) => tool.status !== "draft").length,
    };
  });
  return result;
}

export async function deleteComparison(slug: string) {
  return withDb((db) => {
    const before = db.comparisons.length;
    db.comparisons = db.comparisons.filter((item) => item.slug !== slug);
    return before !== db.comparisons.length;
  });
}

export { LIVE_WINDOW_MS };

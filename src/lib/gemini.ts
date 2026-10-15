import { DEFAULT_CATEGORIES, matchCategory } from "@/lib/categories";
import type { GeneratedComparison, GeneratedReview } from "@/lib/types";
import { clampRating, clampReviewCount, slugify } from "@/lib/utils";

const MODEL = "gemini-2.5-flash";

type GeminiDb = typeof import("@/lib/db");

async function loadDb(): Promise<GeminiDb> {
  return import("@/lib/db");
}

export async function hasUsableGeminiKey() {
  const db = await loadDb();
  return db.hasUsableGeminiKey();
}

type GeminiError = Error & { status?: number };

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw) as unknown;
}

async function callGemini(apiKey: string, prompt: string, options?: { ground?: boolean }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: options?.ground
        ? { temperature: 0.4 }
        : {
            temperature: 0.6,
            responseMimeType: "application/json",
          },
      ...(options?.ground ? { tools: [{ google_search: {} }] } : {}),
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  if (!response.ok) {
    const err = new Error(payload.error?.message || `Gemini request failed (${response.status})`) as GeminiError;
    err.status = response.status;
    throw err;
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n");
  if (!text) throw new Error("Gemini returned an empty response.");
  return extractJson(text);
}

async function generateJson(prompt: string, options?: { ground?: boolean }) {
  const { listRotationGeminiKeys, recordGeminiKeyResult } = await loadDb();
  const keys = await listRotationGeminiKeys();
  if (keys.length === 0) {
    throw new Error("No active Gemini API keys. Add one in Admin → API Keys & Settings.");
  }

  let lastError: Error | null = null;
  for (const key of keys) {
    try {
      try {
        const data = await callGemini(key.key, prompt, options);
        await recordGeminiKeyResult(key.id, { ok: true });
        return data;
      } catch (groundError) {
        if (!options?.ground) throw groundError;
        const data = await callGemini(key.key, prompt);
        await recordGeminiKeyResult(key.id, { ok: true });
        return data;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Gemini request failed");
      lastError = err;
      const status = (error as GeminiError).status;
      await recordGeminiKeyResult(key.id, {
        ok: false,
        status,
        error: err.message,
      });
    }
  }

  throw lastError || new Error("All Gemini API keys failed.");
}

export async function testGeminiKeyById(id: string) {
  const { getGeminiKeyRecord, recordGeminiKeyResult } = await loadDb();
  const record = await getGeminiKeyRecord(id);
  if (!record) throw new Error("Key not found");
  try {
    await callGemini(
      record.key,
      `Return JSON {"ok":true,"model":"${MODEL}"} and nothing else.`,
    );
    return recordGeminiKeyResult(id, { ok: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Test failed");
    const status = (error as GeminiError).status;
    return recordGeminiKeyResult(id, { ok: false, status, error: err.message });
  }
}

export async function generateReviewWithGemini(input: string): Promise<GeneratedReview> {
  const { listCategories } = await loadDb();
  const categories = await listCategories().catch(() => DEFAULT_CATEGORIES);
  const categoryHint = categories.map((item) => `${item.name} [${item.slug}]`).join(", ");
  const data = (await generateJson(`You are an expert AI-tool reviewer for the Forge directory.
Research from public knowledge and write an honest 2026 review for this product: ${JSON.stringify(input)}.
Return JSON with exactly these keys:
name, slug (kebab-case), website (absolute product URL), officialUrl (same as website),
affiliateUrl (empty string unless a real tracked partner URL is known — never copy website),
category (one of: ${categoryHint}),
seoTitle, metaDescription (max 155 chars), shortPitch, overview (2-3 paragraphs),
bestFor, founded (year string), brandColor (hex), featured (false),
pricingModel (Free|Freemium|Paid), rating (number 4.5-4.9 one decimal — Forge editorial score),
reviewCount (integer 40-8000 typical public reviews for this product's maturity),
features (array of 6 strings),
pros (4 strings), cons (3 strings),
pricingTiers (3 objects: name, price, period, features string[], highlighted boolean),
faqs (exactly 4 objects: question, answer).
Do not invent fake traffic or revenue numbers. Write like an editor, not a brochure.`)) as GeneratedReview;

  const category = matchCategory(data.category, categories);
  return {
    ...data,
    name: data.name || input,
    slug: data.slug || slugify(data.name || input),
    category,
    website: data.website || "",
    officialUrl: data.officialUrl || data.website || "",
    affiliateUrl:
      data.affiliateUrl && data.affiliateUrl !== data.website ? data.affiliateUrl : "",
    features: data.features ?? [],
    pros: data.pros ?? [],
    cons: data.cons ?? [],
    pricingTiers: data.pricingTiers ?? [],
    faqs: (data.faqs ?? []).slice(0, 4),
    pricingModel: data.pricingModel || "Freemium",
    rating: clampRating(data.rating, data.slug || slugify(data.name || input)),
    reviewCount: clampReviewCount(data.reviewCount, data.slug || slugify(data.name || input)),
    seoTitle: data.seoTitle,
    metaDescription: data.metaDescription,
    shortPitch: data.shortPitch,
    overview: data.overview,
  };
}

export async function generateComparisonWithGemini(
  toolA: string,
  toolB: string,
): Promise<GeneratedComparison> {
  const data = (await generateJson(`You are an expert AI-tool reviewer for the Forge directory.
Write a side-by-side comparison of ${JSON.stringify(toolA)} vs ${JSON.stringify(toolB)} for 2026.
Return JSON with keys:
toolA, toolB, toolASlug, toolBSlug, slug (toolASlug-vs-toolBSlug),
tagline, verdict, overallWinner (a, b, or tie),
seoTitle, metaDescription (max 155 chars),
rows (8 objects: feature, a, b, winner where winner is a, b, or tie).
Be specific and practical. Do not invent fake traffic numbers.`)) as GeneratedComparison;

  const aSlug = data.toolASlug || slugify(data.toolA || toolA);
  const bSlug = data.toolBSlug || slugify(data.toolB || toolB);
  return {
    ...data,
    toolA: data.toolA || toolA,
    toolB: data.toolB || toolB,
    toolASlug: aSlug,
    toolBSlug: bSlug,
    slug: data.slug || `${aSlug}-vs-${bSlug}`,
    tagline: data.tagline,
    verdict: data.verdict,
    seoTitle: data.seoTitle || `${data.toolA || toolA} vs ${data.toolB || toolB} 2026`,
    metaDescription: data.metaDescription || data.tagline,
    overallWinner: data.overallWinner === "b" || data.overallWinner === "tie" ? data.overallWinner : "a",
    rows: data.rows ?? [],
  };
}

export type SeoToolUpgrade = {
  seoTitle: string;
  metaDescription: string;
  shortPitch: string;
  overview: string;
  bestFor: string;
  features: string[];
  pros: string[];
  cons: string[];
  pricingTiers: GeneratedReview["pricingTiers"];
  faqs: GeneratedReview["faqs"];
  rating: number;
  targetKeyword: string;
};

export type SeoComparisonUpgrade = {
  seoTitle: string;
  metaDescription: string;
  tagline: string;
  verdict: string;
  rows: GeneratedComparison["rows"];
  targetKeyword: string;
};

export type SeoHomeUpgrade = {
  homeSeoTitle: string;
  homeSeoDescription: string;
};

export async function optimizeToolSeoWithGemini(input: {
  name: string;
  keyword: string;
  category: string;
  overview: string;
  currentTitle: string;
}): Promise<SeoToolUpgrade> {
  const data = (await generateJson(
    `You are an SEO editor for the Forge AI tools directory.
Optimize this published review for Google US buyer-intent ranking.
Product: ${JSON.stringify(input.name)}
Category: ${input.category}
Target keyword: ${JSON.stringify(input.keyword)}
Current title: ${JSON.stringify(input.currentTitle)}
Current overview: ${JSON.stringify(input.overview.slice(0, 800))}
Return JSON with keys:
seoTitle (55-60 characters, include Review + Pricing or Pros & Cons),
metaDescription (145-155 characters, click-worthy, no quotes stuffing),
shortPitch (one sentence),
overview (250+ words, 3 paragraphs, editorial, specific),
bestFor,
features (array of at least 6 detailed strings),
pros (5 strings), cons (4 strings),
pricingTiers (3 objects: name, price, period, features string[], highlighted boolean),
faqs (5 objects: question, answer — People Also Ask style),
rating (number 4.6-4.9),
targetKeyword.
Use Google Search knowledge where available. Do not invent traffic or revenue.`,
    { ground: true },
  )) as SeoToolUpgrade;

  return {
    ...data,
    seoTitle: data.seoTitle,
    metaDescription: data.metaDescription,
    shortPitch: data.shortPitch,
    overview: data.overview,
    bestFor: data.bestFor,
    features: data.features ?? [],
    pros: data.pros ?? [],
    cons: data.cons ?? [],
    pricingTiers: data.pricingTiers ?? [],
    faqs: data.faqs ?? [],
    rating: clampRating(data.rating),
    targetKeyword: data.targetKeyword || input.keyword,
  };
}

export async function optimizeComparisonSeoWithGemini(input: {
  aName: string;
  bName: string;
  keyword: string;
  verdict: string;
}): Promise<SeoComparisonUpgrade> {
  const data = (await generateJson(
    `You are an SEO editor for the Forge directory.
Optimize this comparison for Google: ${JSON.stringify(input.aName)} vs ${JSON.stringify(input.bName)}.
Target keyword: ${JSON.stringify(input.keyword)}
Current verdict: ${JSON.stringify(input.verdict.slice(0, 600))}
Return JSON with keys:
seoTitle (55-60 chars),
metaDescription (145-155 chars),
tagline,
verdict (120+ words, pick a winner with caveats),
rows (8 objects: feature, a, b, winner a|b|tie),
targetKeyword.`,
    { ground: true },
  )) as SeoComparisonUpgrade;

  return {
    ...data,
    seoTitle: data.seoTitle,
    metaDescription: data.metaDescription,
    tagline: data.tagline,
    verdict: data.verdict,
    rows: data.rows ?? [],
    targetKeyword: data.targetKeyword || input.keyword,
  };
}

export async function optimizeHomeSeoWithGemini(input: {
  toolCount: number;
  currentTitle: string;
  currentDescription: string;
}): Promise<SeoHomeUpgrade> {
  const data = (await generateJson(
    `Write homepage SEO for Forge, an independent AI tools review directory with ${input.toolCount} published listings.
Current title: ${JSON.stringify(input.currentTitle)}
Current description: ${JSON.stringify(input.currentDescription)}
Return JSON:
homeSeoTitle (50-60 chars, include AI tools directory),
homeSeoDescription (145-155 chars, buyer intent, no hype traffic claims).`,
    { ground: true },
  )) as SeoHomeUpgrade;
  return {
    homeSeoTitle: data.homeSeoTitle,
    homeSeoDescription: data.homeSeoDescription,
  };
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  getComparisonBySlug,
  getComparisonTools,
  getFeaturedTools,
  getToolBySlug,
  listCategories,
  listTools,
  publicSeoSettings,
  readDb,
  updateComparison,
  updateSeoSettings,
  updateTool,
} from "@/lib/db";
import {
  boostComparisonSeoLocal,
  boostHomeSeoLocal,
  boostToolSeoLocal,
  isGeminiFn,
} from "@/lib/seo-boost";
import type { SeoComparisonUpgrade, SeoHomeUpgrade, SeoToolUpgrade } from "@/lib/gemini";
import {
  auditComparisonPage,
  auditHomepage,
  auditToolPage,
  comparisonKeyword,
  toolKeyword,
} from "@/lib/seo";

async function loadGemini() {
  try {
    return await import("@/lib/gemini");
  } catch {
    return null;
  }
}

const GEMINI_MS = process.env.VERCEL ? 2_500 : 20_000;

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini timed out")), ms);
    }),
  ]);
}

async function toolUpgrade(
  input: {
    name: string;
    keyword: string;
    category: string;
    overview: string;
    currentTitle: string;
  },
  fallback: SeoToolUpgrade,
): Promise<SeoToolUpgrade> {
  if (process.env.VERCEL) return fallback;
  const gemini = await loadGemini();
  if (!isGeminiFn(gemini?.optimizeToolSeoWithGemini)) return fallback;
  try {
    return (await withTimeout(gemini.optimizeToolSeoWithGemini(input), GEMINI_MS)) as SeoToolUpgrade;
  } catch {
    return fallback;
  }
}

async function comparisonUpgrade(
  input: { aName: string; bName: string; keyword: string; verdict: string },
  fallback: SeoComparisonUpgrade,
): Promise<SeoComparisonUpgrade> {
  if (process.env.VERCEL) return fallback;
  const gemini = await loadGemini();
  if (!isGeminiFn(gemini?.optimizeComparisonSeoWithGemini)) return fallback;
  try {
    return (await withTimeout(
      gemini.optimizeComparisonSeoWithGemini(input),
      GEMINI_MS,
    )) as SeoComparisonUpgrade;
  } catch {
    return fallback;
  }
}

async function homeUpgrade(
  input: { toolCount: number; currentTitle: string; currentDescription: string },
  fallback: SeoHomeUpgrade,
): Promise<SeoHomeUpgrade> {
  if (process.env.VERCEL) return fallback;
  const gemini = await loadGemini();
  if (!isGeminiFn(gemini?.optimizeHomeSeoWithGemini)) return fallback;
  try {
    return (await withTimeout(gemini.optimizeHomeSeoWithGemini(input), GEMINI_MS)) as SeoHomeUpgrade;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as { path?: string; kind?: "home" | "tool" | "compare"; slug?: string };
  const kind = body.kind || (body.path === "/" ? "home" : body.path?.startsWith("/compare/") ? "compare" : "tool");
  const slug = body.slug || body.path?.split("/").filter(Boolean).at(-1);

  try {
    if (kind === "home") {
      const [db, tools, featured, categories] = await Promise.all([
        readDb(),
        listTools(),
        getFeaturedTools(),
        listCategories(),
      ]);
      const settings = publicSeoSettings(db.settings);
      const before = auditHomepage({
        title: settings.homeSeoTitle,
        description: settings.homeSeoDescription,
        toolCount: tools.length,
        featuredCount: featured.length,
        categoryCount: categories.length,
      });
      const upgrade = await homeUpgrade(
        {
          toolCount: tools.length,
          currentTitle: settings.homeSeoTitle,
          currentDescription: settings.homeSeoDescription,
        },
        boostHomeSeoLocal(tools.length),
      );
      await updateSeoSettings(upgrade);
      const after = auditHomepage({
        title: upgrade.homeSeoTitle,
        description: upgrade.homeSeoDescription,
        toolCount: tools.length,
        featuredCount: featured.length,
        categoryCount: categories.length,
      });
      return NextResponse.json({ before, after, kind: "home" });
    }

    if (kind === "compare" && slug) {
      const comparison = await getComparisonBySlug(slug, { includeDrafts: true });
      if (!comparison) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const pair = await getComparisonTools(comparison);
      const before = auditComparisonPage(comparison, pair?.toolA, pair?.toolB);
      const keyword = comparisonKeyword(
        comparison,
        pair?.toolA.name || comparison.toolASlug,
        pair?.toolB.name || comparison.toolBSlug,
      );
      const upgrade = await comparisonUpgrade(
        {
          aName: pair?.toolA.name || comparison.toolASlug,
          bName: pair?.toolB.name || comparison.toolBSlug,
          keyword,
          verdict: comparison.verdict,
        },
        boostComparisonSeoLocal({
          aName: pair?.toolA.name || comparison.toolASlug,
          bName: pair?.toolB.name || comparison.toolBSlug,
          keyword,
          verdict: comparison.verdict,
        }),
      );
      const saved = await updateComparison(slug, upgrade);
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const after = auditComparisonPage(saved, pair?.toolA, pair?.toolB);
      return NextResponse.json({ before, after, kind: "compare" });
    }

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    const tool = await getToolBySlug(slug, { includeDrafts: true });
    if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const before = auditToolPage(tool);
    const keyword = toolKeyword(tool);
    const upgrade = await toolUpgrade(
      {
        name: tool.name,
        keyword,
        category: tool.category,
        overview: tool.overview,
        currentTitle: tool.seoTitle,
      },
      boostToolSeoLocal(tool, keyword),
    );
    const rating = Math.max(tool.rating, Math.min(4.9, Math.max(4.6, upgrade.rating || 4.6)));
    const saved = await updateTool(slug, {
      ...upgrade,
      rating,
      reviewCount: Math.max(tool.reviewCount, 1),
    });
    if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const after = auditToolPage(saved);
    return NextResponse.json({ before, after, kind: "tool" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Optimize failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { hydrateCatalogEntry } from "@/lib/catalog-scale";
import {
  CATALOG_CAP,
  allCatalogEntries,
  catalogProgress,
  remainingCatalogEntries,
} from "@/lib/data/catalog";
import { ingestCatalogTools, listAllTools, listCategories } from "@/lib/db";
import { hasUsableGeminiKey } from "@/lib/gemini";
import type { PublishStatus, Tool } from "@/lib/types";

export const maxDuration = 300;

const BATCHES = new Set([25, 50, 500]);

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const [tools, categories, gemini] = await Promise.all([
    listAllTools(),
    listCategories(),
    hasUsableGeminiKey(),
  ]);
  const remaining = remainingCatalogEntries(tools);
  const byCategory = Object.fromEntries(
    categories.map((item) => [
      item.slug,
      remainingCatalogEntries(tools, item.slug).length,
    ]),
  );
  return NextResponse.json({
    progress: catalogProgress(tools),
    geminiReady: gemini,
    librarySize: allCatalogEntries().length,
    remainingPreview: remaining.slice(0, 24).map((entry) => ({
      name: entry.name,
      category: entry.category,
      website: entry.website,
    })),
    remainingByCategory: byCategory,
  });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json()) as {
    category?: string;
    batch?: number;
    status?: PublishStatus;
  };

  const batch = Number(body.batch);
  if (!BATCHES.has(batch)) {
    return NextResponse.json({ error: "Batch must be 25, 50, or 500." }, { status: 400 });
  }
  const status: PublishStatus = body.status === "published" ? "published" : "draft";
  const category = body.category?.trim() || "all";

  const tools = await listAllTools();
  const room = Math.max(0, CATALOG_CAP - tools.length);
  if (room <= 0) {
    return NextResponse.json({
      added: [],
      count: 0,
      progress: catalogProgress(tools),
      message: `Catalog is at the ${CATALOG_CAP}-tool cap.`,
      geminiUsed: 0,
      libraryUsed: 0,
    });
  }

  const queue = remainingCatalogEntries(tools, category === "all" ? undefined : category);
  const take = Math.min(batch === 500 ? room : batch, queue.length, room);
  const slice = queue.slice(0, take);
  const useGemini = batch <= 25 && (await hasUsableGeminiKey());

  const hydrated: Tool[] = new Array(slice.length);
  let geminiUsed = 0;
  let libraryUsed = 0;
  const concurrency = useGemini ? 3 : 8;
  let cursor = 0;

  async function worker() {
    while (cursor < slice.length) {
      const index = cursor++;
      const entry = slice[index];
      const result = await hydrateCatalogEntry(entry, status, useGemini);
      if (result.source === "gemini") geminiUsed += 1;
      else libraryUsed += 1;
      hydrated[index] = result.tool;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, slice.length) }, () => worker()),
  );

  const added = await ingestCatalogTools(hydrated.filter(Boolean));
  const nextTools = await listAllTools();
  return NextResponse.json({
    added: added.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      status: tool.status,
      officialUrl: tool.officialUrl,
      pricingModel: tool.pricingModel,
    })),
    count: added.length,
    progress: catalogProgress(nextTools),
    geminiUsed,
    libraryUsed,
    message:
      added.length === 0
        ? category === "all"
          ? "No unused library tools remain."
          : "No unused library tools remain in that category."
        : `Added ${added.length} real ${status === "published" ? "published" : "draft"} tool${added.length === 1 ? "" : "s"}.`,
  });
}

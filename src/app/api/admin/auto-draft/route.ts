import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { generateDailyDrafts } from "@/lib/auto-draft";
import { listAllComparisons, listAllTools, saveComparisonDraft, saveToolDraft } from "@/lib/db";

export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const [tools, comparisons] = await Promise.all([listAllTools(), listAllComparisons()]);
    const existing = [
      ...tools.map((tool) => tool.slug),
      ...tools.map((tool) => tool.name),
      ...comparisons.map((item) => item.slug),
    ];
    const generated = await generateDailyDrafts(existing);
    const savedTools = [];
    const savedComparisons = [];
    for (const review of generated.reviews) {
      savedTools.push(await saveToolDraft(review));
    }
    for (const comparison of generated.comparisons) {
      savedComparisons.push(await saveComparisonDraft(comparison));
    }
    return NextResponse.json({
      ok: true,
      source: generated.source,
      tools: savedTools,
      comparisons: savedComparisons,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto-draft failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

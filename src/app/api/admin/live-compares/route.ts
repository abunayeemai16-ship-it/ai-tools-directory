import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listAllTools, saveComparisonDraft } from "@/lib/db";
import {
  deleteLiveComparison,
  directoryMatches,
  getLiveComparison,
  listLiveComparisons,
  setLiveComparisonStatus,
  type LiveComparisonRecord,
} from "@/lib/live-compare";

async function withMatches(records: LiveComparisonRecord[]) {
  const tools = await listAllTools();
  return records.map((record) => {
    const match = directoryMatches(record, tools);
    return { ...record, directory: { a: match.a?.slug ?? null, b: match.b?.slug ?? null } };
  });
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  return NextResponse.json({ items: await withMatches(await listLiveComparisons()) });
}

export async function PATCH(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; action?: unknown };
  const key = typeof body.key === "string" ? body.key : "";
  const record = key ? await getLiveComparison(key) : null;
  if (!record) return NextResponse.json({ error: "Comparison not found." }, { status: 404 });

  if (body.action === "dismiss" || body.action === "restore") {
    const updated = await setLiveComparisonStatus(key, body.action === "dismiss" ? "dismissed" : "new");
    return NextResponse.json({ item: updated ? (await withMatches([updated]))[0] : null });
  }

  if (body.action === "draft") {
    if (!record.valid) {
      return NextResponse.json({ error: "Rejected lookups cannot become drafts." }, { status: 400 });
    }
    const match = directoryMatches(record, await listAllTools());
    const missing = [!match.a && record.toolA, !match.b && record.toolB].filter(Boolean);
    if (!match.a || !match.b) {
      return NextResponse.json(
        { error: `Add ${missing.join(" and ")} to the directory first (AI Studio), then try again.` },
        { status: 409 },
      );
    }
    const draft = await saveComparisonDraft({
      slug: `${match.a.slug}-vs-${match.b.slug}`,
      toolA: match.a.name,
      toolB: match.b.name,
      toolASlug: match.a.slug,
      toolBSlug: match.b.slug,
      tagline: record.tagline,
      verdict: record.verdict,
      overallWinner: record.overallWinner,
      rows: record.rows,
      seoTitle: `${match.a.name} vs ${match.b.name} (2026): Features, Pricing & Verdict`,
      metaDescription: record.tagline.slice(0, 155),
    });
    const updated = await setLiveComparisonStatus(key, "drafted");
    return NextResponse.json({
      draftSlug: draft.slug,
      item: updated ? (await withMatches([updated]))[0] : null,
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { key?: unknown };
  if (typeof body.key !== "string" || !body.key) {
    return NextResponse.json({ error: "Missing key." }, { status: 400 });
  }
  await deleteLiveComparison(body.key);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getComparisonBySlug, getComparisonTools, getToolBySlug, readDb, upsertRankCheck } from "@/lib/db";
import { comparisonKeyword, toolKeyword } from "@/lib/seo";
import { checkLiveRank } from "@/lib/serp";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as {
    path?: string;
    kind?: "home" | "tool" | "compare";
    slug?: string;
    keyword?: string;
  };
  const db = await readDb();
  const path =
    body.path ||
    (body.kind === "home" ? "/" : body.kind === "compare" ? `/compare/${body.slug}` : `/tool/${body.slug}`);
  let keyword = body.keyword?.trim() || "";

  if (!keyword && body.kind === "tool" && body.slug) {
    const tool = await getToolBySlug(body.slug, { includeDrafts: true });
    if (tool) keyword = toolKeyword(tool);
  }
  if (!keyword && body.kind === "compare" && body.slug) {
    const comparison = await getComparisonBySlug(body.slug, { includeDrafts: true });
    const pair = comparison ? await getComparisonTools(comparison) : null;
    if (comparison) {
      keyword = comparisonKeyword(
        comparison,
        pair?.toolA.name || comparison.toolASlug,
        pair?.toolB.name || comparison.toolBSlug,
      );
    }
  }
  if (!keyword && (body.kind === "home" || path === "/")) {
    keyword = "AI tools directory";
  }

  const snapshot = await checkLiveRank({
    path,
    keyword,
    domain: db.settings.siteDomain,
    serperApiKey: db.settings.serperApiKey,
    googleCseKey: db.settings.googleCseKey,
    googleCseCx: db.settings.googleCseCx,
  });

  if (snapshot.source !== "skipped") {
    await upsertRankCheck(snapshot);
  }
  return NextResponse.json(snapshot);
}

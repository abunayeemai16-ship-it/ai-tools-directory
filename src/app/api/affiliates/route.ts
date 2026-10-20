import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getToolsWithClickStats } from "@/lib/analytics";
import { clearToolDeal, loadPublicDb, readDb } from "@/lib/db";
import type { ToolStats } from "@/lib/types";

function hasDeal(tool: {
  couponCode?: string;
  dealText?: string;
  couponDiscount?: string;
}) {
  return Boolean(tool.couponCode || tool.dealText || tool.couponDiscount);
}

function stripDeal<T extends ToolStats>(tool: T): T {
  return {
    ...tool,
    couponCode: "",
    dealText: "",
    couponDiscount: "",
    couponExpires: "",
  };
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  // Ensure deal tombstones are applied on the shared memory catalog first.
  const db = await readDb();
  const [tools, publicSnap] = await Promise.all([getToolsWithClickStats(), loadPublicDb()]);

  const publicBySlug = new Map(publicSnap.db.tools.map((tool) => [tool.slug, tool]));
  const cleared = new Set(db.settings.clearedDealSlugs ?? []);
  const heal: string[] = [];

  const synced = tools.map((tool) => {
    if (cleared.has(tool.slug) && hasDeal(tool)) {
      heal.push(tool.slug);
      return stripDeal(tool);
    }
    const pub = publicBySlug.get(tool.slug);
    // /deals already dropped this coupon — keep admin in sync and heal the catalog.
    if (pub && hasDeal(tool) && !hasDeal(pub)) {
      heal.push(tool.slug);
      return stripDeal(tool);
    }
    return tool;
  });

  for (const slug of [...new Set(heal)]) {
    void clearToolDeal(slug);
  }

  return NextResponse.json({
    tools: synced,
    categories: db.categories,
    settings: { epc: db.settings.epc },
    commissions: db.commissions,
  });
}

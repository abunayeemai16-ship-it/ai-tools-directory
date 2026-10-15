import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { adCtr } from "@/lib/ads";
import { createAd, expireEndedAds, listAds, listAllTools, listCategories } from "@/lib/db";
import type { AdCampaign } from "@/lib/types";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  await expireEndedAds();
  const [ads, tools, categories] = await Promise.all([
    listAds(),
    listAllTools(),
    listCategories(),
  ]);
  return NextResponse.json({
    ads: ads.map((ad) => ({ ...ad, ctr: adCtr(ad) })),
    tools: tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      status: tool.status,
      affiliateUrl: tool.affiliateUrl,
      officialUrl: tool.officialUrl || tool.website,
      couponCode: tool.couponCode || "",
      dealText: tool.dealText || "",
      commissionNote: tool.commissionNote || "",
      shortPitch: tool.shortPitch,
    })),
    categories,
  });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as Partial<AdCampaign> & {
    title?: string;
    alsoPublishTool?: boolean;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Campaign title is required" }, { status: 400 });
  }
  if (!body.targetUrl?.trim() && !body.toolSlug?.trim() && !body.alsoPublishTool) {
    return NextResponse.json(
      { error: "Add a partner target URL or link an existing directory tool" },
      { status: 400 },
    );
  }
  try {
    const ad = await createAd({ ...body, title: body.title });
    return NextResponse.json({ ...ad, ctr: adCtr(ad) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

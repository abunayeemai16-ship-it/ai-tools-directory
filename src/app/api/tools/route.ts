import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createManualTool, listTools, saveToolDraft } from "@/lib/db";
import type { GeneratedReview, PricingModel, PublishStatus } from "@/lib/types";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const tools = await listTools();
  return NextResponse.json(tools);
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as GeneratedReview & {
    mode?: "manual";
    officialUrl?: string;
    pricingModel?: PricingModel;
    featured?: boolean;
    status?: PublishStatus;
    affiliateNetwork?: string;
    commissionNote?: string;
    couponCode?: string;
    dealText?: string;
  };

  if (body.mode === "manual") {
    if (!body.name?.trim() || !(body.officialUrl || body.website)) {
      return NextResponse.json({ error: "Name and official URL are required" }, { status: 400 });
    }
    try {
      const tool = await createManualTool({
        name: body.name,
        slug: body.slug,
        officialUrl: body.officialUrl || body.website,
        affiliateUrl: body.affiliateUrl,
        category: body.category,
        shortPitch: body.shortPitch,
        overview: body.overview,
        pricingModel: body.pricingModel,
        featured: body.featured,
        status: body.status,
        affiliateNetwork: body.affiliateNetwork,
        commissionNote: body.commissionNote,
        couponCode: body.couponCode,
        dealText: body.dealText,
        rating: body.rating,
        reviewCount: body.reviewCount,
      });
      return NextResponse.json(tool, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create tool";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!body.name || !body.shortPitch) {
    return NextResponse.json({ error: "Invalid tool draft" }, { status: 400 });
  }
  const tool = await saveToolDraft(body);
  return NextResponse.json(tool, { status: 201 });
}

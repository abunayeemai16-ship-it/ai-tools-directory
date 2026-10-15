import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { matchCategory } from "@/lib/categories";
import { addSubmission, listCategories, listSubmissions } from "@/lib/db";
import type { ListingTier, PricingModel } from "@/lib/types";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  return NextResponse.json(await listSubmissions());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    website?: string;
    category?: string;
    pitch?: string;
    pricingModel?: PricingModel;
    email?: string;
    tier?: ListingTier;
  };

  if (!body.name || !body.website || !body.pitch || !body.email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const categories = await listCategories();
  const category = matchCategory(body.category, categories);

  const submission = await addSubmission({
    name: String(body.name),
    website: String(body.website),
    category,
    pitch: String(body.pitch),
    pricingModel: body.pricingModel ?? "Freemium",
    email: String(body.email),
    tier: body.tier === "featured" ? "featured" : "free",
  });

  return NextResponse.json(submission, { status: 201 });
}

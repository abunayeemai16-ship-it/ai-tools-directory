import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listComparisons, saveComparisonDraft } from "@/lib/db";
import type { GeneratedComparison } from "@/lib/types";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  return NextResponse.json(await listComparisons());
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as GeneratedComparison;
  if (!body.toolASlug || !body.toolBSlug || !body.rows?.length) {
    return NextResponse.json({ error: "Invalid comparison draft" }, { status: 400 });
  }
  const comparison = await saveComparisonDraft(body);
  return NextResponse.json(comparison, { status: 201 });
}

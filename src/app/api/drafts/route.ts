import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listDrafts } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const drafts = await listDrafts();
    return NextResponse.json(drafts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load drafts";
    return NextResponse.json({ error: message, tools: [], comparisons: [], count: 0 }, { status: 500 });
  }
}

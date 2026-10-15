import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listDrafts } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const drafts = await listDrafts();
  return NextResponse.json(drafts);
}

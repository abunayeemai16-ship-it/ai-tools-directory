import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { approveAllDrafts } from "@/lib/db";

export const maxDuration = 30;

export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const result = await approveAllDrafts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approve all failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getAnalyticsOverview } from "@/lib/analytics";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const overview = await getAnalyticsOverview();
  return NextResponse.json(overview);
}

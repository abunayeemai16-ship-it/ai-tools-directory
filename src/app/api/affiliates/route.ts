import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getToolsWithClickStats } from "@/lib/analytics";
import { readDb } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const [tools, db] = await Promise.all([getToolsWithClickStats(), readDb()]);
  return NextResponse.json({
    tools,
    categories: db.categories,
    settings: { epc: db.settings.epc },
    commissions: db.commissions,
  });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { getToolsWithClickStats } from "@/lib/analytics";
import { alignToolsWithClearedDeals, readDb } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const db = await readDb();
  const tools = await alignToolsWithClearedDeals(await getToolsWithClickStats());

  return NextResponse.json({
    tools,
    categories: db.categories,
    settings: { epc: db.settings.epc },
    commissions: db.commissions,
  });
}

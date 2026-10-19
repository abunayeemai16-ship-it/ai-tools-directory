import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { countNewBookings } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return NextResponse.json({ count: await countNewBookings() });
  } catch {
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}

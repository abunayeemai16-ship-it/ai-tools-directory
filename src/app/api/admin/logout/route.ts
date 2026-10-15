import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/admin-auth";

export async function POST() {
  await logoutAdmin();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdminApi, updateAdminPassword } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as { current?: string; next?: string };
  if (!body.current || !body.next) {
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
  }
  const result = await updateAdminPassword(body.current, body.next);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

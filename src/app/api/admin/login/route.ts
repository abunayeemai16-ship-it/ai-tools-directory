import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if (!body.password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }
  const ok = await loginAdmin(body.password);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

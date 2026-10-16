import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/crypto-auth";
import { adminCookieOptions, loginAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    let password = "";
    try {
      const body = (await request.json()) as { password?: unknown };
      password = typeof body.password === "string" ? body.password : "";
    } catch {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const token = loginAdmin(password);
    if (!token) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return response;
  } catch (error) {
    console.error("[forge] admin login failed", error);
    return NextResponse.json({ error: "Login failed. Try again." }, { status: 500 });
  }
}

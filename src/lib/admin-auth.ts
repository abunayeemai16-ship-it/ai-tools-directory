import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from "@/lib/crypto-auth";
import {
  changeAdminPasswordHash,
  getAdminAuthSettings,
  rotateSessionSecret,
} from "@/lib/db";

export async function hasAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const settings = await getAdminAuthSettings();
  return verifySession(settings.sessionSecret, token);
}

export async function requireAdminApi() {
  if (await hasAdminSession()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function loginAdmin(password: string) {
  const settings = await getAdminAuthSettings();
  if (!(await verifyPassword(password, settings.adminPasswordHash))) {
    return false;
  }
  const token = signSession(settings.sessionSecret);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions());
  return true;
}

export async function logoutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function updateAdminPassword(current: string, next: string) {
  const settings = await getAdminAuthSettings();
  if (!(await verifyPassword(current, settings.adminPasswordHash))) {
    return { ok: false as const, error: "Current password is incorrect" };
  }
  if (next.trim().length < 8) {
    return { ok: false as const, error: "New password must be at least 8 characters" };
  }
  await changeAdminPasswordHash(await hashPassword(next.trim()));
  const secret = await rotateSessionSecret();
  const token = signSession(secret);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOptions());
  return { ok: true as const };
}

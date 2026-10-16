import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  DEFAULT_ADMIN_PASSWORD,
  SESSION_MAX_AGE,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from "@/lib/crypto-auth";

export function adminCookieOptions() {
  const secure =
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure,
  };
}

export function expectedAdminPassword() {
  return (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim();
}

export function adminSessionSecret() {
  const fromEnv = (process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "").trim();
  if (fromEnv) return fromEnv;
  return createHmac("sha256", "forge-admin-v1").update(expectedAdminPassword()).digest("hex");
}

function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  const size = Math.max(a.length, b.length, 1);
  const paddedA = Buffer.alloc(size);
  const paddedB = Buffer.alloc(size);
  a.copy(paddedA);
  b.copy(paddedB);
  return timingSafeEqual(paddedA, paddedB) && a.length === b.length;
}

export async function hasAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifySession(adminSessionSecret(), token);
}

export async function requireAdminApi() {
  if (await hasAdminSession()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function loginAdmin(password: string) {
  if (!secretsEqual(password, expectedAdminPassword())) return null;
  return signSession(adminSessionSecret());
}

export async function logoutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function updateAdminPassword(current: string, next: string) {
  if (!secretsEqual(current, expectedAdminPassword())) {
    const { getAdminAuthSettings } = await import("@/lib/db");
    const settings = await getAdminAuthSettings().catch(() => null);
    const dbOk = settings
      ? await verifyPassword(current, settings.adminPasswordHash)
      : false;
    if (!dbOk) {
      return { ok: false as const, error: "Current password is incorrect" };
    }
  }
  if (next.trim().length < 8) {
    return { ok: false as const, error: "New password must be at least 8 characters" };
  }
  const { changeAdminPasswordHash, rotateSessionSecret } = await import("@/lib/db");
  await changeAdminPasswordHash(await hashPassword(next.trim()));
  await rotateSessionSecret();
  const token = signSession(adminSessionSecret());
  (await cookies()).set(ADMIN_COOKIE, token, adminCookieOptions());
  return { ok: true as const };
}

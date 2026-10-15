import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const DEFAULT_ADMIN_PASSWORD = "abu@NM101288";
export const ADMIN_COOKIE = "forge_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function newSessionSecret() {
  return randomBytes(32).toString("hex");
}

export function signSession(secret: string) {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const sig = createHmac("sha256", secret).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

export function verifySession(secret: string, token: string) {
  if (!secret || !token) return false;
  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(String(exp)).digest("hex");
  const left = Buffer.from(sig, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function maskGeminiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length < 10) return "••••••••";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

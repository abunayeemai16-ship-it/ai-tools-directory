import { connection } from "next/server";

/**
 * Force request-time rendering for admin (and similar) routes only.
 * Cache Components replaces `revalidate = 0` and `dynamic = "force-dynamic"` —
 * those exports error in Next 16. Public directory pages must NOT call this;
 * they stay on the CDN via `"use cache"` + `cacheLife("days")` in public-data.ts.
 */
export async function live() {
  await connection();
}

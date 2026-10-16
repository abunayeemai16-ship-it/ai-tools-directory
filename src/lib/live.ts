import { connection } from "next/server";

/**
 * Force request-time rendering. Cache Components replaces `revalidate = 0`
 * and `dynamic = "force-dynamic"` — those exports error in Next 16.
 * `connection()` is the supported equivalent so directory counts come from
 * the live store (Supabase when DATABASE_URL is set) instead of a prerendered shell.
 */
export async function live() {
  await connection();
}

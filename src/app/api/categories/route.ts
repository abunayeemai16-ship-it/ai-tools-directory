import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import { PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { listCategories } from "@/lib/db";

async function cachedCategories() {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  cacheLife("days");
  return listCategories();
}

export async function GET() {
  return NextResponse.json(
    { categories: await cachedCategories() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

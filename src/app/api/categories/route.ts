import { NextResponse } from "next/server";
import { getPublicCategories } from "@/lib/public-data";

export async function GET() {
  return NextResponse.json(
    { categories: await getPublicCategories() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

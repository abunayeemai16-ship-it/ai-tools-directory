import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { syncCatalogFromLocalFile, syncCatalogFromSnapshot } from "@/lib/db";
import type { Database } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const contentType = request.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Partial<Database> | { tools?: unknown };
      if (Array.isArray(body.tools) && body.tools.length) {
        result = await syncCatalogFromSnapshot(body as Partial<Database>);
      } else {
        result = await syncCatalogFromLocalFile();
      }
    } else {
      result = await syncCatalogFromLocalFile();
    }
    revalidatePath("/");
    revalidatePath("/tool/[slug]", "page");
    revalidatePath("/compare");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog sync failed";
    const status = message.includes("DATABASE_URL") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

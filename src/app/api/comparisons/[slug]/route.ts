import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { approveComparison, deleteComparison, updateComparison } from "@/lib/db";
import type { Comparison } from "@/lib/types";

function fail(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const { slug } = await params;
    const patch = (await request.json()) as Partial<Comparison> & { action?: string };
    const { action, ...rest } = patch;
    if (Object.keys(rest).length) {
      const saved = await updateComparison(slug, rest);
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (action === "publish") {
        const published = await approveComparison(slug);
        if (!published) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(published);
      }
      return NextResponse.json(saved);
    }
    if (action === "publish") {
      const published = await approveComparison(slug);
      if (!published) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(published);
    }
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  } catch (error) {
    return fail(error, "Save failed");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const { slug } = await params;
    const removed = await deleteComparison(slug);
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Delete failed");
  }
}

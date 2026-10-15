import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { approveComparison, deleteComparison, updateComparison } from "@/lib/db";
import type { Comparison } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const patch = (await request.json()) as Partial<Comparison> & { action?: string };
  const { action, ...rest } = patch;
  if (Object.keys(rest).length) {
    const saved = await updateComparison(slug, rest);
    if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (action === "publish") {
    const published = await approveComparison(slug);
    if (!published) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(published);
  }
  const item = await updateComparison(slug, rest);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const removed = await deleteComparison(slug);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

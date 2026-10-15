import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteCategory, updateCategory } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const body = (await request.json()) as { name?: string; slug?: string };
  try {
    const updated = await updateCategory(slug, body);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update category";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  try {
    const removed = await deleteCategory(slug);
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete category";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

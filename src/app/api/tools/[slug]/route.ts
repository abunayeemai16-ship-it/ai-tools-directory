import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  approveTool,
  clearToolDeal,
  deleteTool,
  updateTool,
  type ToolUpdatePatch,
} from "@/lib/db";

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
    const patch = (await request.json()) as ToolUpdatePatch & { action?: string };
    const { action, ...rest } = patch;
    if (rest.clearDeal) {
      const saved = await clearToolDeal(slug);
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(saved);
    }
    if (Object.keys(rest).length) {
      const saved = await updateTool(slug, rest);
      if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (action === "publish") {
        const published = await approveTool(slug);
        if (!published) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(published);
      }
      return NextResponse.json(saved);
    }
    if (action === "publish") {
      const published = await approveTool(slug);
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
    const removed = await deleteTool(slug);
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Delete failed");
  }
}

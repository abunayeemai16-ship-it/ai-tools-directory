import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { approveTool, deleteTool, updateTool } from "@/lib/db";
import type { Tool } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const patch = (await request.json()) as Partial<Tool> & { action?: string };
  const { action, ...rest } = patch;
  if (Object.keys(rest).length) {
    const saved = await updateTool(slug, rest);
    if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (action === "publish") {
    const published = await approveTool(slug);
    if (!published) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(published);
  }
  const tool = await updateTool(slug, rest);
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tool);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const removed = await deleteTool(slug);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { updateSubmissionStatus } from "@/lib/db";
import type { SubmissionStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const body = (await request.json()) as { status?: SubmissionStatus };
  if (!body.status || !["pending", "approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = await updateSubmissionStatus(id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
